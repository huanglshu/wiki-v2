const _ = require('lodash')
const dotize = require('dotize')
const i18nMW = require('i18next-express-middleware')
const i18next = require('i18next')
const Promise = require('bluebird')
const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const { loadBundledLocale } = require('../helpers/bundled-locales')
const chineseUi = loadBundledLocale('zh.json')

/* global WIKI */

module.exports = {
  engine: null,
  namespaces: [],
  async init() {
    this.namespaces = WIKI.data.localeNamespaces
    this.engine = i18next
    await this.engine.init({
      load: 'languageOnly',
      ns: this.namespaces,
      defaultNS: 'common',
      saveMissing: false,
      lng: WIKI.config.lang.code,
      fallbackLng: 'en'
    })

    // Load current language + namespaces
    await this.refreshNamespaces(true)

    return this
  },
  /**
   * Attach i18n middleware for Express
   *
   * @param {Object} app Express Instance
   */
  attachMiddleware (app) {
    app.use(i18nMW.handle(this.engine))
  },
  /**
   * Get all entries for a specific locale and namespace
   *
   * @param {String} locale Locale code
   * @param {String} namespace Namespace
   */
  async getByNamespace(locale, namespace) {
    if (this.engine.hasResourceBundle(locale, namespace)) {
      let data = this.engine.getResourceBundle(locale, namespace)
      return _.chain(dotize.convert(data))
        .pickBy(value => typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))
        .map((value, key) => ({ key, value }))
        .value()
    } else {
      throw new Error('Invalid locale or namespace')
    }
  },
  /**
   * Load entries from the DB for a single locale
   *
   * @param {String} locale Locale code
   * @param {*} opts Additional options
   */
  async loadLocale(locale, opts = { silent: false }) {
    const res = await WIKI.models.locales.query().findOne('code', locale)
    if (res) {
      if (_.isPlainObject(res.strings)) {
        _.forOwn(res.strings, (data, ns) => {
          this.namespaces.push(ns)
          this.engine.addResourceBundle(locale, ns, data, true, true)
        })
      }
    } else if (!opts.silent) {
      throw new Error('No such locale in local store.')
    }

    // -> Load dev locale files if present
    if (WIKI.IS_DEBUG) {
      try {
        const devEntriesRaw = await fs.readFile(path.join(WIKI.SERVERPATH, `locales/${locale}.yml`), 'utf8')
        if (devEntriesRaw) {
          const devEntries = yaml.safeLoad(devEntriesRaw)
          _.forOwn(devEntries, (data, ns) => {
            this.namespaces.push(ns)
            this.engine.addResourceBundle(locale, ns, data, true, true)
          })
          WIKI.logger.info(`Loaded dev locales from ${locale}.yml`)
        }
      } catch (err) {
        // ignore
      }
    }

    if (locale === 'zh') {
      const overrides = {}
      for (const [key, value] of Object.entries(chineseUi)) {
        if (key.startsWith('common:serverError.') || key.startsWith('common:notification.') ||
          key.startsWith('admin:modules.authentication.cas.') ||
          ['auth:errors.invalidLoginMsg', 'auth:errors.mailNotConfigured', 'auth:errors.securityCodeRequired'].includes(key)) {
          _.set(overrides, key.replace(':', '.'), value)
        }
      }
      _.forOwn(overrides, (data, ns) => {
        this.engine.addResourceBundle(locale, ns, data, true, true)
      })
    }
  },
  /**
   * Reload all namespaces for all active locales from the DB
   *
   * @param {Boolean} silent No error on fail
   */
  async refreshNamespaces (silent = false) {
    await this.loadLocale(WIKI.config.lang.code, { silent })
    if (WIKI.config.lang.code !== 'en') {
      await this.loadLocale('en', { silent: true })
    }
    if (WIKI.config.lang.namespacing) {
      for (let ns of WIKI.config.lang.namespaces) {
        if (ns !== WIKI.config.lang.code && ns !== 'en') {
          await this.loadLocale(ns, { silent })
        }
      }
    }
  },
  /**
   * Set the active locale
   *
   * @param {String} locale Locale code
   */
  async setCurrentLocale(locale) {
    await Promise.fromCallback(cb => {
      return this.engine.changeLanguage(locale, cb)
    })
  }
}
