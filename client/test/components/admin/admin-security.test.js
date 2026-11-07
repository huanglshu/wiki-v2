/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const i18next = require('i18next')
const zhTranslations = require('../../../../data/sideload/zh.json')
const enTranslations = require('../../../../data/sideload/en.json')

function loadComponent() {
  const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-security.vue'), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  const localRequire = name => {
    if (name === 'vuex-pathify') return { sync: () => ({ get: () => '', set: () => {} }) }
    if (name === '../../store/editor') return { __esModule: true, default: {} }
    if (name === '../../../data/sideload/zh.json') return zhTranslations
    if (name === '../../../data/sideload/en.json') return enTranslations
    return require(name)
  }
  runInThisContext(`(function (require, module, exports, WIKI) {\n${code}\n})`)(
    localRequire,
    componentModule,
    componentModule.exports,
    { $store: { state: {}, registerModule: jest.fn() } }
  )
  return Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
}

describe('admin security upload size', () => {
  const component = loadComponent()

  it('registers upload validation messages for the active language even with stale resources', async () => {
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['admin'],
      resources: { zh: { admin: {} }, en: { admin: { ui: { security: { uploads: { maxSizePositive: 'stale' } } } } } },
      initImmediate: false
    })
    const context = { $i18n: { i18next: locale }, $t: locale.t.bind(locale) }
    component.created.call(context)

    for (const [language, translations] of [['zh', zhTranslations], ['en', enTranslations]]) {
      await locale.changeLanguage(language)
      expect(component.methods.positiveUploadSizeRule.call(context, '0')).toBe(translations['admin:ui.security.uploads.maxSizePositive'])
      expect(component.methods.positiveUploadCountRule.call(context, '0')).toBe(translations['admin:ui.security.uploads.maxBatchPositive'])
      expect(context.$t('admin:ui.security.uploads.limitsPositive')).toBe(translations['admin:ui.security.uploads.limitsPositive'])
    }
  })

  it('opens the management-style picker and receives the selected background path', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-security.vue'), 'utf8')
    expect(source).toContain("component(:is='activeModal', management, selection)")
    const context = { config: {}, $store: { set: jest.fn() }, $root: { $on: jest.fn(), $off: jest.fn() } }
    component.methods.browseLoginBg.call(context)
    expect(context.$store.set).toHaveBeenCalledWith('editor/editorKey', 'common')
    expect(context.activeModal).toBe('editorModalMedia')
    component.mounted.call(context)
    context.$root.$on.mock.calls[0][1]({ path: '/backgrounds/login.png' })
    expect(context.config.authLoginBgUrl).toBe('/backgrounds/login.png')
    component.beforeDestroy.call(context)
    expect(context.$root.$off).toHaveBeenCalledWith('editorInsert')
  })

  it('displays the byte configuration in MB and saves MB as bytes', () => {
    const context = {
      config: { uploadMaxFileSize: 31457280 },
      bytesToMB: component.methods.bytesToMB.bind(component.methods),
      mbToBytes: component.methods.mbToBytes.bind(component.methods)
    }

    expect(component.computed.uploadMaxFileSizeMB.get.call(context)).toBe('30')

    component.computed.uploadMaxFileSizeMB.set.call(context, '12.5')
    expect(context.config.uploadMaxFileSize).toBe(13107200)
  })

  it('keeps empty upload size values valid', () => {
    expect(component.methods.mbToBytes('')).toBe(0)
    expect(component.methods.mbToBytes(null)).toBe(0)
    expect(component.methods.mbToBytes('not-a-number')).toBe(0)
  })

  it('saves the byte value only once when the input is in MB', async () => {
    const mutate = jest.fn().mockResolvedValue({})
    const context = {
      config: {
        uploadMaxFileSize: 41943040,
        uploadMaxFiles: 10
      },
      $apollo: { mutate },
      $store: { commit: jest.fn() },
      $t: key => key,
      $refs: {}
    }

    await component.methods.save.call(context)

    expect(mutate.mock.calls[0][0].variables.uploadMaxFileSize).toBe(41943040)
  })

  it('rejects non-positive upload limits before saving', async () => {
    const mutate = jest.fn()
    const commit = jest.fn()
    const context = {
      config: {
        uploadMaxFileSize: 0,
        uploadMaxFiles: 10
      },
      $apollo: { mutate },
      $store: { commit },
      $t: key => key,
      $refs: {
        securityForm: {
          validate: () => true
        }
      },
      positiveUploadSizeRule: component.methods.positiveUploadSizeRule.bind({ $t: key => key }),
      positiveUploadCountRule: component.methods.positiveUploadCountRule.bind({ $t: key => key })
    }

    await component.methods.save.call(context)

    expect(mutate).not.toHaveBeenCalled()
    expect(commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      style: 'error',
      message: 'admin:ui.security.uploads.limitsPositive'
    }))
  })

  it('requires upload limits to be positive and the count to be an integer', () => {
    const context = { $t: key => key }

    expect(component.methods.positiveUploadSizeRule.call(context, '0.1')).toBe(true)
    expect(component.methods.positiveUploadSizeRule.call(context, '0')).toBe('admin:ui.security.uploads.maxSizePositive')
    expect(component.methods.positiveUploadSizeRule.call(context, '')).toBe('admin:ui.security.uploads.maxSizePositive')
    expect(component.methods.positiveUploadCountRule.call(context, '1')).toBe(true)
    expect(component.methods.positiveUploadCountRule.call(context, '0')).toBe('admin:ui.security.uploads.maxBatchPositive')
    expect(component.methods.positiveUploadCountRule.call(context, '1.5')).toBe('admin:ui.security.uploads.maxBatchPositive')
  })
})
