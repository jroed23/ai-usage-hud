#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Claude Code runs this same executable as its status line command.
    if std::env::args().any(|a| a == "--relay") {
        std::process::exit(ai_usage_hud_lib::relay::run());
    }
    ai_usage_hud_lib::run();
}
