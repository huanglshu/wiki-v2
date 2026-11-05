/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const i18next = require('i18next')

function loadRuleComponent() {
  const source = fs.readFileSync(path.join(__dirname, 'admin-groups-edit-rules.vue'), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const module = { exports: {} }
  const localRequire = name => require(name)

  runInThisContext(`(function (require, module, exports, siteLangs) {\n${code}\n})`)(localRequire, module, module.exports, [])
  const component = module.exports.default
  component.translateRuleLabel = module.exports.translateRuleLabel
  return Object.assign(component, compiler.compileToFunctions(pug.render(sfc.template.content)))
}

describe('admin group rule translations', () => {
  let locale
  let component
  let translateRuleLabel

  beforeEach(() => {
    locale = i18next.createInstance()
    locale.init({
      lng: 'zh',
      fallbackLng: false,
      ns: ['admin'],
      resources: {
        zh: {
          admin: {
            ui: {
              groupRules: {
                roles: { readPages: '\u67e5\u770b\u9875\u9762' },
                matches: { start: '\u8def\u5f84\u5f00\u5934\u5339\u914d...' }
              }
            }
          }
        },
        en: {
          admin: {
            ui: {
              groupRules: {
                roles: { readPages: 'Read Pages' },
                matches: { start: 'Path Starts With...' }
              }
            }
          }
        }
      },
      initImmediate: false
    })
    i18next.init = locale.init
    component = loadRuleComponent()
    translateRuleLabel = component.translateRuleLabel
  })

  it('translates existing keys without changing the underlying value', async () => {
    const role = { labelKey: 'admin:ui.groupRules.roles.readPages', value: 'read:pages' }
    const match = { textKey: 'admin:ui.groupRules.matches.start', value: 'START' }
    const i18n = {
      i18next: locale
    }

    expect(translateRuleLabel(i18n, role.labelKey, role.value)).toBe('\u67e5\u770b\u9875\u9762')
    expect(translateRuleLabel(i18n, match.textKey, match.value)).toBe('\u8def\u5f84\u5f00\u5934\u5339\u914d...')
    expect(role.value).toBe('read:pages')
    expect(match.value).toBe('START')

    await locale.changeLanguage('en')
    expect(translateRuleLabel(i18n, role.labelKey, role.value)).toBe('Read Pages')
  })

  it('falls back to API values when translations are unavailable', () => {
    const i18n = {
      i18next: locale
    }

    expect(translateRuleLabel(i18n, 'admin:ui.groupRules.roles.missing', 'write:pages')).toBe('write:pages')
    expect(translateRuleLabel(i18n, null, 'START')).toBe('START')
    expect(translateRuleLabel(null, 'admin:ui.groupRules.roles.readPages', 'read:pages')).toBe('read:pages')
  })

  it('renders a readable empty locale state when no locales are enabled', async () => {
    Vue.use(Vuetify)

    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const testComponent = {
      ...component,
      props: {
        ...component.props,
        value: {
          type: Object,
          default: () => ({
            id: 3,
            pageRules: [{ id: 'rule-1', path: 'docs', roles: ['read:pages'], match: 'START', deny: false, locales: [] }]
          })
        }
      },
      data() {
        return component.data.call(this)
      },
      methods: {
        ...component.methods,
        $t(key, options) {
          return options?.defaultValue || key
        }
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      render: h => h(testComponent)
    }).$mount(root)

    try {
      const ruleSelect = app.$el.querySelector('.rule')
      const localeSelect = ruleSelect && ruleSelect.querySelectorAll('.v-select')[2]
      expect(localeSelect).toBeDefined()
      localeSelect.querySelector('[role=button]').click()
      await new Promise(resolve => setTimeout(resolve, 40))
      await Vue.nextTick()

      const listText = [...document.querySelectorAll('[role=listbox]')].map(el => el.textContent).join('\n')
      expect(listText).toContain('No locales available')
      expect(listText).not.toContain('$vuetify.noDataText')
    } finally {
      app.$destroy()
      root.remove()
    }
  })

  it('lists installed locales while preserving their API codes', () => {
    const installedLocales = component.apollo.installedLocales.update({
      localization: {
        locales: [
          { code: 'zh', name: 'Chinese Simplified', nativeName: '\u4e2d\u6587', isInstalled: true },
          { code: 'en', name: 'English', nativeName: 'English', isInstalled: true },
          { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', isInstalled: false }
        ]
      }
    })

    expect(installedLocales.map(locale => locale.code)).toEqual(['zh', 'en'])
    expect(installedLocales.map(locale => locale.nativeName)).toEqual(['\u4e2d\u6587', 'English'])
    expect(component.apollo.installedLocales.update({})).toEqual([])
  })
})
