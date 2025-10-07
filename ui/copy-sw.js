import { copyFileSync } from 'fs'

// Copy sw.js to root for scope access
copyFileSync('build/sw.js', 'build/../sw.js')
copyFileSync('build/sw.js.map', 'build/../sw.js.map')
console.log('✓ Copied sw.js to root')
