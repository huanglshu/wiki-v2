/* eslint-env jest */
/* eslint-disable vue/one-component-per-file */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const yaml = require('js-yaml')
const _ = require('lodash')
const Vue = require('vue')
const Vuetify = require('vuetify')
const VueI18Next = require('@panter/vue-i18next')
const i18next = require('i18next')

Vue.config.productionTip = false
Vue.use(Vuetify)
Vue.use(VueI18Next)
Vue.component('VCardInfo', { render (h) { return h('div', this.$slots.default) } })
Vue.component('VCardChin', { render (h) { return h('div', this.$slots.default) } })

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-auth.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name.startsWith('gql/')) return {}
  if (name === '../../helpers/admin-module') return require('../../../helpers/admin-module')
  return require(name)
}
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
const definition = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '../../../../server/modules/authentication/cas/definition.yml'), 'utf8'))
const resources = {}
for (const language of ['zh', 'en']) {
  resources[language] = { admin: {}, common: {} }
  const strings = require(`../../../../data/sideload/${language}.json`)
  Object.entries(strings).forEach(([key, value]) => {
    const separator = key.indexOf(':')
    const namespace = key.slice(0, separator)
    if (resources[language][namespace]) {
      _.set(resources[language][namespace], key.slice(separator + 1), value)
    }
  })
}
const cas = {
  ...definition,
  props: Object.entries(definition.props).map(([key, value]) => ({
    ...value,
    key,
    type: value.type.toLowerCase()
  }))
}

describe('CAS authentication localization', () => {
  let app
  let auth
  let locale
  let mutate

  beforeEach(() => {
    locale = i18next.createInstance()
    locale.init({ lng: 'zh', fallbackLng: 'en', ns: ['admin', 'common'], resources, initImmediate: false })
    mutate = jest.fn().mockResolvedValue({
      data: { authentication: { updateStrategies: { responseResult: { succeeded: true } } } }
    })
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(component)
    }).$mount(root)
    auth = app.$children[0]
    auth.$store = { commit: jest.fn() }
    auth.$apollo = { mutate }
  })

  afterEach(() => {
    app.$destroy()
    if (app.$el.parentNode) app.$el.parentNode.removeChild(app.$el)
  })

  it('renders every CAS field in the active language without changing configured values', async () => {
    auth.activeStrategies = [{
      key: 'local',
      strategy: { key: 'local', title: 'Local' },
      config: [],
      displayName: 'Local'
    }]
    auth.addStrategy(cas)
    await Vue.nextTick()
    await Vue.nextTick()
    auth.strategy.displayName = 'Company SSO'
    auth.strategy.config[0].value.value = 'https://wiki.example.com'
    auth.strategy.config[2].value.value = 'CAS1.0'
    await Vue.nextTick()

    expect(app.$el.textContent).toContain('中央身份认证服务')
    for (const text of ['站点基础地址', 'CAS 服务器地址', 'CAS 版本', '包含用户电子邮箱的属性键', '包含用户显示名称的属性键', '包含用户唯一标识符的属性键']) {
      expect(app.$el.textContent).toContain(text)
    }
    for (const cfg of auth.strategy.config.slice(0, 3)) {
      expect(auth.displayConfig(cfg).hint).toBeTruthy()
    }
    expect(auth.displayConfig(auth.strategy.config[2]).enum).toEqual([
      { text: 'CAS3.0', value: 'CAS3.0' },
      { text: 'CAS1.0', value: 'CAS1.0' }
    ])

    await locale.changeLanguage('en')
    await Vue.nextTick()
    expect(app.$el.textContent).toContain(definition.description)
    for (const prop of Object.values(definition.props)) {
      expect(app.$el.textContent).toContain(prop.title)
    }
    await auth.save()
    const saved = mutate.mock.calls[0][0].variables.strategies.find(str => str.strategyKey === 'cas')
    expect(saved.displayName).toBe('Company SSO')
    expect(JSON.parse(saved.config[0].value).v).toBe('https://wiki.example.com')
    expect(JSON.parse(saved.config[2].value).v).toBe('CAS1.0')
  })

  it('translates a previously saved CAS configuration', async () => {
    const config = cas.props.map(prop => ({
      key: prop.key,
      value: JSON.stringify({ ...prop, value: prop.default })
    }))
    auth.activeStrategies = component.apollo.activeStrategies.update({
      authentication: {
        activeStrategies: [{
          key: 'local',
          strategy: { key: 'local', title: 'Local' },
          config: [],
          order: 0,
          displayName: 'Local'
        }, {
          key: 'existing-cas',
          strategy: cas,
          config,
          order: 1,
          displayName: 'Existing SSO'
        }]
      }
    })
    await Vue.nextTick()
    auth.selectedStrategy = 'existing-cas'
    await Vue.nextTick()
    expect(app.$el.textContent).toContain('Existing SSO')
    expect(app.$el.textContent).toContain('CAS 服务器地址')
  })

  it('preserves other providers and falls back when a CAS translation is missing', () => {
    const other = { key: 'other', title: 'Other', description: 'Original' }
    const cfg = { key: 'unknown', value: { title: 'Original field', hint: 'Original hint' } }
    expect(auth.displayStrategy(other)).toMatchObject(other)
    auth.strategy = { strategy: other }
    expect(auth.displayConfig(cfg)).toBe(cfg.value)
    auth.strategy = { strategy: { key: 'cas' } }
    expect(auth.displayConfig(cfg)).toEqual(cfg.value)
  })

  it('localizes all provider names and descriptions and falls back in English', async () => {
    const directory = path.join(__dirname, '../../../../server/modules/authentication')
    const translations = require('../../../../data/sideload/zh.json')
    const definitions = fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && fs.existsSync(path.join(directory, entry.name, 'definition.yml')))
      .map(entry => yaml.safeLoad(fs.readFileSync(path.join(directory, entry.name, 'definition.yml'), 'utf8')))

    for (const provider of definitions) {
      const prefix = `admin:modules.authentication.${provider.key}`
      expect(translations[`${prefix}.title`]).toBeTruthy()
      expect(translations[`${prefix}.description`]).toBeTruthy()
      expect(auth.displayStrategy(provider)).toMatchObject({
        key: provider.key,
        title: translations[`${prefix}.title`],
        description: translations[`${prefix}.description`]
      })
    }

    await locale.changeLanguage('en')
    for (const provider of definitions) {
      expect(auth.displayStrategy(provider)).toMatchObject({
        key: provider.key,
        title: provider.title,
        description: provider.description
      })
    }
  })
})
