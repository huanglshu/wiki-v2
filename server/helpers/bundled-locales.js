const fs = require('fs-extra')
const path = require('path')

function getBundledLocaleDirectory () {
  const bundled = path.resolve(__dirname, '../sideload')
  return fs.existsSync(path.join(bundled, 'locales.json')) ?
    bundled :
    path.resolve(__dirname, '../../data/sideload')
}

function loadBundledLocale (filename) {
  return fs.readJsonSync(path.join(getBundledLocaleDirectory(), filename))
}

module.exports = { getBundledLocaleDirectory, loadBundledLocale }
