use std::{env, fs, path::PathBuf};

fn main() {
    // Tauri embeds an .ico in the Windows executable. Generate a small, deterministic
    // project icon when the repository has not been populated by `tauri icon` yet.
    let icon = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap()).join("icons/icon.ico");
    if !icon.exists() {
        fs::create_dir_all(icon.parent().unwrap()).expect("create icon directory");
        fs::write(&icon, pal_icon()).expect("write application icon");
    }
    tauri_build::build()
}

fn pal_icon() -> Vec<u8> {
    const SIZE: usize = 32;
    let mut bytes = Vec::with_capacity(6 + 16 + 40 + SIZE * SIZE * 4 + 128);
    bytes.extend_from_slice(&[0, 0, 1, 0, 1, 0]); // ICONDIR
    bytes.extend_from_slice(&[32, 32, 0, 0, 1, 0, 32, 0]); // one 32px, 32-bit image
    let image_size = 40 + SIZE * SIZE * 4 + 128;
    bytes.extend_from_slice(&(image_size as u32).to_le_bytes());
    bytes.extend_from_slice(&22u32.to_le_bytes()); // icon data begins after headers
    bytes.extend_from_slice(&40u32.to_le_bytes()); // BITMAPINFOHEADER
    bytes.extend_from_slice(&(SIZE as i32).to_le_bytes());
    bytes.extend_from_slice(&((SIZE * 2) as i32).to_le_bytes());
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&32u16.to_le_bytes());
    bytes.extend_from_slice(&0u32.to_le_bytes());
    bytes.extend_from_slice(&0u32.to_le_bytes());
    bytes.extend_from_slice(&[0; 16]);

    for y in (0..SIZE).rev() {
        for x in 0..SIZE {
            let dx = x as i32 - 15;
            let dy = y as i32 - 15;
            let ring = (dx * dx + dy * dy) <= 210;
            let p_mark = (x == 10 && (9..=22).contains(&y))
                || ((10..=18).contains(&x) && (y == 9 || y == 15))
                || (x == 18 && (10..=14).contains(&y));
            let (b, g, r, a) = if p_mark {
                (241, 217, 126, 255)
            } else if ring {
                (237, 139, 54, 255)
            } else {
                (31, 23, 16, 255)
            };
            bytes.extend_from_slice(&[b, g, r, a]);
        }
    }
    bytes.extend_from_slice(&[0; 128]); // AND mask: alpha channel defines transparency
    bytes
}
