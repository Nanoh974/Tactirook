const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..', 'assets')
const knight = fs.readFileSync(path.join(root, 'pieces', 'wN.svg'), 'utf8')
  .replace('<svg ', '<svg x="190" y="170" width="644" height="644" ')
  .replace(' style="color-scheme:light only"', '')

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#355a45"/>${knight}</svg>`
fs.writeFileSync(path.join(root, 'icon.svg'), icon)
