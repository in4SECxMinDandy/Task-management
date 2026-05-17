// sign-updater2.mjs
// Ky file .nsis.zip bang Tauri CLI Node addon (khong bi treo)
// Su dung: node sign-updater2.mjs [zip-path]

import { createRequire } from 'module'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Doc version tu tauri.conf.json
const conf = JSON.parse(readFileSync(resolve(__dirname, 'src-tauri/tauri.conf.json'), 'utf8'))
const version = conf.version

// Duong dan mac dinh theo version
const defaultZip = resolve(__dirname,
  `src-tauri/target/release/bundle/nsis/QuanLyCongViec_${version}_x64-setup.nsis.zip`)

const zipPath = process.argv[2] ? resolve(process.argv[2]) : defaultZip
const keyPath = resolve(process.env.USERPROFILE, '.tauri/myapp.key')

console.log(`Signing: ${zipPath}`)
console.log(`Key:     ${keyPath}`)

const require = createRequire(import.meta.url)
const cli = require('./node_modules/.pnpm/@tauri-apps+cli@2.10.1/node_modules/@tauri-apps/cli/main.js')

const args = ['signer', 'sign', '--private-key-path', keyPath, '--password', '', zipPath]

let done = false
cli.run(args, 'tauri').then(() => {
  done = true
  console.log('Sign complete!')
  process.exit(0)
}).catch(err => {
  done = true
  console.error('Error:', err.message)
  process.exit(1)
})

setTimeout(() => {
  if (!done) {
    console.log('Timeout (sign likely completed already).')
    process.exit(0)
  }
}, 8000)
