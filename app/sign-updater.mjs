// sign-updater.mjs
// Chay: node sign-updater.mjs
// Ky file .nsis.zip bang Tauri CLI native addon

import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const zipPath = resolve(__dirname,
  'src-tauri/target/release/bundle/nsis/QuanLyCongViec_0.1.1_x64-setup.nsis.zip')
const sigPath = zipPath + '.sig'
const keyPath = resolve(process.env.USERPROFILE, '.tauri/myapp.key')

console.log('zip:', zipPath)
console.log('sig:', sigPath)
console.log('key:', keyPath)

// Load Tauri CLI via its main.js entry (which exposes run())
const require = createRequire(import.meta.url)
const cli = require('./node_modules/.pnpm/@tauri-apps+cli@2.10.1/node_modules/@tauri-apps/cli/main.js')

// Goi signer sign voi key path va file
const args = ['signer', 'sign', '--private-key-path', keyPath, zipPath]
console.log('Running: tauri', args.join(' '))

cli.run(args, 'tauri').then(() => {
  console.log('Done!')
}).catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
