const _ = require('lodash')
const { loadBundledLocale } = require('./bundled-locales')
const locales = loadBundledLocale('locales.json').data.localization.locales
const translations = {
  en: loadBundledLocale('en.json'),
  zh: loadBundledLocale('zh.json')
}

const defaultLocale = 'zh'

function getSetupLocales () {
  return ['en', defaultLocale].map(code => {
    const locale = locales.find(item => item.code === code)
    const strings = {}
    _.forOwn(translations[code], (value, key) => {
      if (key.includes('::')) return
      _.set(strings, key.replace(':', '.'), _.isEmpty(value) ? key : value)
    })
    return {
      code,
      strings,
      isRTL: locale.isRTL,
      name: locale.name,
      nativeName: locale.nativeName,
      availability: locale.availability || 0
    }
  })
}

module.exports = {
  defaultLocale,
  getSetupLocales,
  homeLabel: translations[defaultLocale]['common:header.home']
}
