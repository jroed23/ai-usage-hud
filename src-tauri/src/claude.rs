//! Claude Code integration (official status line mechanism only).
//!
//! Docs: https://code.claude.com/docs/en/statusline

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const APP_DIR: &str = "ai-usage-hud";

pub fn data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(APP_DIR)
}

fn snapshot_path() -> PathBuf {
    data_dir().join("claude-usage.json")
}

fn chain_path() -> PathBuf {
    data_dir().join("relay-chain.json")
}

fn claude_settings_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("settings.json"))
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Keep only whitelisted usage fields.
pub fn sanitize(payload: &Value) -> Option<Value> {
    let window = |name: &str| -> Value {
        let w = &payload["rate_limits"][name];
        match w["used_percentage"].as_f64() {
            Some(p) => json!({ "usedPercentage": p, "resetsAt": w["resets_at"].as_u64() }),
            None => Value::Null,
        }
    };
    let ctx = &payload["context_window"];
    Some(json!({
        "updatedAt": now_secs(),
        "model": payload["model"]["display_name"].as_str(),
        "fiveHour": window("five_hour"),
        "sevenDay": window("seven_day"),
        "contextUsedPercentage": ctx["used_percentage"].as_f64(),
        "contextWindowSize": ctx["context_window_size"].as_u64(),
    }))
}

pub fn summary_line(payload: &Value) -> String {
    let p = |name: &str| payload["rate_limits"][name]["used_percentage"].as_f64();
    match (p("five_hour"), p("seven_day")) {
        (Some(a), Some(b)) => format!("5h {:.0}% · 7d {:.0}%", a, b),
        (Some(a), None) => format!("5h {:.0}%", a),
        _ => String::new(),
    }
}

pub fn write_snapshot(snapshot: &Value) -> std::io::Result<()> {
    let dir = data_dir();
    fs::create_dir_all(&dir)?;
    let tmp = dir.join("claude-usage.json.tmp");
    fs::write(&tmp, serde_json::to_vec(snapshot)?)?;
    fs::rename(tmp, snapshot_path())
}

pub fn read_chain() -> Option<String> {
    let v: Value = serde_json::from_slice(&fs::read(chain_path()).ok()?).ok()?;
    v["command"].as_str().map(str::to_owned)
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Detection {
    /// `~/.claude` exists, i.e. Claude Code has been used on this machine.
    pub installed: bool,
    /// Our relay is registered as the Claude Code status line.
    pub connected: bool,
}

pub fn detect() -> Detection {
    let installed = dirs::home_dir()
        .map(|h| h.join(".claude").exists())
        .unwrap_or(false);
    let connected = read_settings().map(|s| is_relay(&s)).unwrap_or(false);
    Detection { installed, connected }
}

fn is_relay(settings: &Value) -> bool {
    settings["statusLine"]["command"]
        .as_str()
        .map(|c| c.contains("--relay"))
        .unwrap_or(false)
}

/// A missing file means empty settings. Any other problem (unreadable, not
/// JSON, not an object) is an error so we never overwrite a file we did not
/// understand.
fn read_settings() -> Result<Value, String> {
    let path = claude_settings_path().ok_or("home directory not found")?;
    parse_settings(fs::read(&path))
}

fn parse_settings(read: std::io::Result<Vec<u8>>) -> Result<Value, String> {
    match read {
        Ok(bytes) => {
            let v: Value = serde_json::from_slice(&bytes)
                .map_err(|_| "~/.claude/settings.json is not valid JSON; refusing to modify it")?;
            if v.is_object() {
                Ok(v)
            } else {
                Err("~/.claude/settings.json is not a JSON object; refusing to modify it".into())
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(json!({})),
        Err(e) => Err(format!("cannot read ~/.claude/settings.json: {e}")),
    }
}

/// Raw snapshot (None if the relay never ran).
pub fn read_snapshot() -> Option<Value> {
    serde_json::from_slice(&fs::read(snapshot_path()).ok()?).ok()
}

/// Register the relay as the Claude Code status line, preserving any existing one.
pub fn connect(exe: &str) -> Result<(), String> {
    let path = claude_settings_path().ok_or("home directory not found")?;
    let mut settings = read_settings()?;

    if let Some(cmd) = settings["statusLine"]["command"].as_str() {
        if !cmd.contains("--relay") {
            fs::create_dir_all(data_dir()).map_err(|e| e.to_string())?;
            fs::write(chain_path(), json!({ "command": cmd }).to_string())
                .map_err(|e| e.to_string())?;
        }
    }
    if path.exists() {
        let backup = path.with_file_name("settings.json.ai-usage-hud.bak");
        if !backup.exists() {
            fs::copy(&path, backup).map_err(|e| e.to_string())?;
        }
    } else if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    settings["statusLine"] =
        json!({ "type": "command", "command": format!("\"{}\" --relay", exe) });
    write_settings(&path, &settings)
}

/// Remove the relay; restore the user's previous status line if there was one.
pub fn disconnect() -> Result<(), String> {
    let path = claude_settings_path().ok_or("home directory not found")?;
    let mut settings = read_settings()?;
    if !is_relay(&settings) {
        return Ok(());
    }
    match read_chain() {
        Some(cmd) => settings["statusLine"] = json!({ "type": "command", "command": cmd }),
        None => {
            if let Some(obj) = settings.as_object_mut() {
                obj.remove("statusLine");
            }
        }
    }
    write_settings(&path, &settings)?;
    let _ = fs::remove_file(chain_path());
    Ok(())
}

/// Write to a temp file and rename so a crash can never leave a half-written
/// settings.json behind.
fn write_settings(path: &PathBuf, settings: &Value) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;
    let tmp = path.with_file_name("settings.json.ai-usage-hud.tmp");
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_keeps_only_usage_fields() {
        let payload = json!({
            "cwd": "C:/secret", "transcript_path": "x", "session_id": "abc",
            "model": { "display_name": "Opus" },
            "context_window": { "used_percentage": 8.0, "context_window_size": 200000 },
            "rate_limits": { "five_hour": { "used_percentage": 23.5, "resets_at": 100 } }
        });
        let s = sanitize(&payload).unwrap();
        let text = s.to_string();
        assert!(!text.contains("secret") && !text.contains("abc") && !text.contains("transcript"));
        assert_eq!(s["fiveHour"]["usedPercentage"], 23.5);
        assert!(s["sevenDay"].is_null());
        assert_eq!(s["model"], "Opus");
    }

    #[test]
    fn missing_windows_are_null_not_zero() {
        let s = sanitize(&json!({})).unwrap();
        assert!(s["fiveHour"].is_null() && s["contextUsedPercentage"].is_null());
    }

    #[test]
    fn settings_parsing_never_hides_problems() {
        use std::io::{Error, ErrorKind};
        assert_eq!(parse_settings(Err(Error::from(ErrorKind::NotFound))).unwrap(), json!({}));
        assert!(parse_settings(Err(Error::from(ErrorKind::PermissionDenied))).is_err());
        assert!(parse_settings(Ok(b"{ not json".to_vec())).is_err());
        assert!(parse_settings(Ok(b"[1,2]".to_vec())).is_err());
        assert_eq!(parse_settings(Ok(br#"{"a":1}"#.to_vec())).unwrap()["a"], 1);
    }

    #[test]
    fn summary_line_formats() {
        let p = json!({ "rate_limits": {
            "five_hour": { "used_percentage": 23.5 },
            "seven_day": { "used_percentage": 41.2 } } });
        assert_eq!(summary_line(&p), "5h 24% · 7d 41%");
        assert_eq!(summary_line(&json!({})), "");
    }
}
