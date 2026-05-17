/**
 * Tạo file .zip với thuật toán Deflate chuẩn (method 8)
 * Tauri's zip crate chỉ hỗ trợ method 0 (Stored) và method 8 (Deflated).
 * Compress-Archive, tar -a, và .NET ZipFile đều có thể tạo ra method 9 (Deflate64)
 * hoặc các phương thức không hỗ trợ trên Windows.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const NSIS_DIR = path.resolve('src-tauri/target/release/bundle/nsis');
const EXE_NAME = 'QuanLyCongViec_0.1.3_x64-setup.exe';
const ZIP_NAME = 'QuanLyCongViec_0.1.3_x64-setup.nsis.zip';

const exePath = path.join(NSIS_DIR, EXE_NAME);
const zipPath = path.join(NSIS_DIR, ZIP_NAME);

const fileData = fs.readFileSync(exePath);
console.log(`Input: ${EXE_NAME} (${fileData.length} bytes)`);

// Compress using raw DEFLATE (method 8)
const compressed = zlib.deflateRawSync(fileData, { level: 6 });
console.log(`Compressed: ${compressed.length} bytes`);

// Build ZIP file manually with Deflate (method 8)
function makeU16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function makeU32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }

// CRC-32 lookup table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const crc = crc32(fileData);
const nameBuffer = Buffer.from(EXE_NAME, 'utf8');
const now = new Date();
const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

// Local file header (method=8 Deflated)
const localHeader = Buffer.concat([
  Buffer.from([0x50, 0x4B, 0x03, 0x04]), // signature
  makeU16(20),           // version needed: 2.0
  makeU16(0),            // flags
  makeU16(8),            // compression method: DEFLATED
  makeU16(dosTime),
  makeU16(dosDate),
  makeU32(crc),
  makeU32(compressed.length),
  makeU32(fileData.length),
  makeU16(nameBuffer.length),
  makeU16(0),            // extra field length
  nameBuffer,
]);

const localOffset = 0;

// Central directory entry
const centralEntry = Buffer.concat([
  Buffer.from([0x50, 0x4B, 0x01, 0x02]), // signature
  makeU16(20),           // version made by
  makeU16(20),           // version needed
  makeU16(0),            // flags
  makeU16(8),            // compression method: DEFLATED
  makeU16(dosTime),
  makeU16(dosDate),
  makeU32(crc),
  makeU32(compressed.length),
  makeU32(fileData.length),
  makeU16(nameBuffer.length),
  makeU16(0),            // extra field length
  makeU16(0),            // file comment length
  makeU16(0),            // disk number start
  makeU16(0),            // internal attributes
  makeU32(0),            // external attributes
  makeU32(localOffset),  // local header offset
  nameBuffer,
]);

const centralDirOffset = localHeader.length + compressed.length;
const centralDirSize = centralEntry.length;

// End of central directory
const eocd = Buffer.concat([
  Buffer.from([0x50, 0x4B, 0x05, 0x06]), // signature
  makeU16(0),            // disk number
  makeU16(0),            // disk with central dir
  makeU16(1),            // entries on disk
  makeU16(1),            // total entries
  makeU32(centralDirSize),
  makeU32(centralDirOffset),
  makeU16(0),            // comment length
]);

const zipBuffer = Buffer.concat([localHeader, compressed, centralEntry, eocd]);
fs.writeFileSync(zipPath, zipBuffer);
console.log(`Created: ${ZIP_NAME} (${zipBuffer.length} bytes)`);
console.log('Done! Compression method = 8 (Deflated) - Tauri compatible.');
