pub mod claude;
pub mod relay;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

const GITHUB_URL: &str = "https://github.com/jroed23/ai-usage-hud";

#[tauri::command]
fn claude_snapshot() -> Option<serde_json::Value> {
    claude::read_snapshot()
}

#[tauri::command]
fn claude_detect() -> claude::Detection {
    claude::detect()
}

#[tauri::command]
fn claude_connect() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    claude::connect(&exe.to_string_lossy())
}

#[tauri::command]
fn claude_disconnect() -> Result<(), String> {
    claude::disconnect()
}

// Async on purpose: creating a window from a sync command runs on the main
// thread and deadlocks on Windows.
#[tauri::command]
async fn open_settings(app: AppHandle) -> Result<(), String> {
    show_settings(&app)
}

fn show_settings(app: &AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html#settings".into()))
        .title("AI Usage HUD")
        .inner_size(520.0, 640.0)
        .min_inner_size(420.0, 480.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn set_hud_visible(app: &AppHandle, visible: bool) {
    if let Some(w) = app.get_webview_window("hud") {
        let _ = if visible { w.show() } else { w.hide() };
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let title = MenuItem::with_id(app, "title", "AI Usage HUD", false, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show HUD", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide HUD", true, None::<&str>)?;
    let claude_item = MenuItem::with_id(app, "provider-claude", "Claude", true, None::<&str>)?;
    let providers = Submenu::with_items(app, "Providers", true, &[&claude_item])?;
    let refresh = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let github = MenuItem::with_id(app, "github", "GitHub", true, None::<&str>)?;
    let about = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let sep3 = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &title, &sep1, &show, &hide, &sep2, &providers, &refresh, &settings, &sep3, &github,
            &about, &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("AI Usage HUD")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => set_hud_visible(app, true),
            "hide" => set_hud_visible(app, false),
            "refresh" => {
                let _ = app.emit("refresh", ());
            }
            "settings" | "provider-claude" | "about" => {
                let _ = show_settings(app);
            }
            "github" => {
                use tauri_plugin_opener::OpenerExt;
                let _ = app.opener().open_url(GITHUB_URL, None::<&str>);
            }
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            claude_snapshot,
            claude_detect,
            claude_connect,
            claude_disconnect,
            open_settings
        ])
        .setup(|app| {
            build_tray(app.handle())?;
            if let Ok(exe) = std::env::current_exe() {
                claude::refresh_relay_if_connected(&exe.to_string_lossy());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AI Usage HUD");
}
