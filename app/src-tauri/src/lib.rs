use std::fs;
use std::io::Write;
use std::path::PathBuf;

/// Write raw bytes to an absolute path chosen by the user (typically via the
/// dialog plugin's `save()` flow). We use a custom command rather than
/// `tauri-plugin-fs` because the latter requires per-path scope entries in
/// the capability file, which makes "Save as anywhere" prompts brittle.
#[tauri::command]
fn save_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    let mut f = fs::File::create(&target).map_err(|e| e.to_string())?;
    f.write_all(&bytes).map_err(|e| e.to_string())?;
    f.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![save_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
