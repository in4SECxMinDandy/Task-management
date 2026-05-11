use std::io::Write;
use std::path::PathBuf;

const MAX_SAVE_BYTES: usize = 250 * 1024 * 1024;

/// Write raw bytes to an absolute path chosen by the user (typically via the
/// dialog plugin's `save()` flow). We use a custom command rather than
/// `tauri-plugin-fs` because the latter requires per-path scope entries in
/// the capability file, which makes "Save as anywhere" prompts brittle.
#[tauri::command]
fn save_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.is_absolute() {
        return Err("Save path must be absolute".to_string());
    }
    if bytes.len() > MAX_SAVE_BYTES {
        return Err("File is too large to save".to_string());
    }
    let parent = target
        .parent()
        .ok_or_else(|| "Save path has no parent directory".to_string())?;
    if !parent.is_dir() {
        return Err("Parent directory does not exist".to_string());
    }
    let mut f = std::fs::File::create(&target).map_err(|e| e.to_string())?;
    f.write_all(&bytes).map_err(|e| e.to_string())?;
    f.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
