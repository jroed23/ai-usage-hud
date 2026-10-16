//! Status line relay.
//!
//! Claude Code pipes a JSON document to the configured `statusLine` command on
//! stdin. We keep ONLY the usage fields (rate limits, context %, model name) and
//! write them to a local snapshot file. Nothing else from the payload (cwd,
//! transcript path, session id, cost...) is stored. If the user already had a
//! status line, it is executed with the original payload so it keeps working.

use serde_json::Value;
use std::io::{Read, Write};
use std::process::{Command, Stdio};

pub fn run() -> i32 {
    let mut raw = String::new();
    if std::io::stdin().read_to_string(&mut raw).is_err() {
        return 0;
    }
    let payload: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);

    if let Some(snapshot) = crate::claude::sanitize(&payload) {
        let _ = crate::claude::write_snapshot(&snapshot);
    }

    if let Some(chain) = crate::claude::read_chain() {
        return run_chain(&chain, &raw);
    }
    println!("{}", crate::claude::summary_line(&payload));
    0
}

fn run_chain(command: &str, stdin_data: &str) -> i32 {
    #[cfg(windows)]
    let mut cmd = {
        let mut c = Command::new("cmd");
        c.args(["/C", command]);
        c
    };
    #[cfg(not(windows))]
    let mut cmd = {
        let mut c = Command::new("sh");
        c.args(["-c", command]);
        c
    };
    let child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::null())
        .spawn();
    match child {
        Ok(mut child) => {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(stdin_data.as_bytes());
            }
            child.wait().ok().and_then(|s| s.code()).unwrap_or(0)
        }
        Err(_) => 0,
    }
}
