/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const i18next = require('i18next')
const _ = require('lodash')

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-theme.vue'), 'utf8')
const script = compiler.parseComponent(source).script.content
const code = babel.transformSync(script, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === 'vuex-pathify') return { sync: () => ({}) }
  if (name.startsWith('gql/')) return { __esModule: true, default: {} }
  return require(name)
}
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = componentModule.exports.default
const chinese = require('../../../../data/sideload/zh.json')
const themeTranslations = {}
Object.entries(chinese).forEach(([key, value]) => {
  if (key.startsWith('admin:ui.theme.')) {
    _.set(themeTranslations, key.slice('admin:'.length), value)
  }
})

describe('admin theme translations', () => {
  let locale
  let context

  beforeEach(() => {
    locale = i18next.createInstance()
    locale.init({
      lng: 'zh',
      fallbackLng: false,
      ns: ['admin'],
      resources: { zh: { admin: themeTranslations }, en: { admin: {} } },
      initImmediate: false
    })
    context = { $t: locale.t.bind(locale) }
  })

  it('translates theme settings while preserving option values', async () => {
    expect(component.computed.tocPositions.call(context)).toEqual([
      { text: '左侧（默认）', value: 'left' },
      { text: '右侧', value: 'right' },
      { text: '隐藏', value: 'off' }
    ])
    expect(component.computed.themes.call(context)[0]).toMatchObject({ text: '默认主题', value: 'default' })
    expect(component.computed.iconsets.call(context)[0]).toEqual({ text: 'Material Design Icons（默认）', value: 'mdi' })

    await locale.changeLanguage('en')
    expect(component.computed.tocPositions.call(context)).toEqual([
      { text: 'Left (default)', value: 'left' },
      { text: 'Right', value: 'right' },
      { text: 'Hidden', value: 'off' }
    ])
  })

  it.each(['left', 'right', 'off'])('saves the unchanged %s option value', async position => {
    context.config = {
      theme: 'default',
      iconset: 'mdi',
      tocPosition: position,
      injectCSS: '',
      injectHead: '',
      injectBody: ''
    }
    context.darkMode = false
    context.$store = { commit: jest.fn() }
    context.$apollo = {
      mutate: jest.fn().mockResolvedValue({ data: { theming: { setConfig: { responseResult: { succeeded: true } } } } })
    }

    await component.methods.save.call(context)

    expect(context.$apollo.mutate.mock.calls[0][0].variables.tocPosition).toBe(position)
    expect(context.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: '主题设置已更新。'
    }))
  })
})
