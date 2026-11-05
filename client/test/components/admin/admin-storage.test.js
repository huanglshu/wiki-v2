/* eslint-env jest */
/* eslint-disable vue/one-component-per-file */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const VueI18Next = require('@panter/vue-i18next')
const i18next = require('i18next')
const moment = require('moment-timezone')
const _ = require('lodash')

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.use(Vuetify)
Vue.use(VueI18Next)
Vue.prototype.$moment = moment
Vue.component('VCardInfo', { render: h => h('div') })

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-storage.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === '../common/duration-picker.vue') {
    return { __esModule: true, default: { render: h => h('div') } }
  }
  if (name === 'epic-spinners') {
    return { LoopingRhombusesSpinner: { render: h => h('span') } }
  }
  if (name.startsWith('gql/')) return { __esModule: true, default: {} }
  if (name === '../../helpers/admin-module') return { translateAdminModules: (type, targets) => targets }
  return require(name)
}
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
const resources = {}
for (const language of ['zh', 'en']) {
  const strings = require(`../../../../data/sideload/${language}.json`)
  resources[language] = { admin: {}, common: {} }
  Object.entries(strings).forEach(([key, value]) => {
    const separator = key.indexOf(':')
    const namespace = key.slice(0, separator)
    if (resources[language][namespace]) {
      _.set(resources[language][namespace], key.slice(separator + 1), value)
    }
  })
}

describe('admin storage status localization', () => {
  let app
  let storage
  let locale

  beforeEach(() => {
    locale = i18next.createInstance()
    locale.init({ lng: 'zh', fallbackLng: 'en', ns: ['admin', 'common'], resources, initImmediate: false })
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    const mount = document.createElement('div')
    root.appendChild(mount)
    document.body.appendChild(root)
    app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(component)
    }).$mount(mount)
    storage = app.$children[0]
  })

  afterEach(() => {
    const root = app.$el.parentNode
    app.$destroy()
    if (root && root.parentNode) root.parentNode.removeChild(root)
  })

  it('renders status and relative time in the active language', async () => {
    const lastAttempt = moment().subtract(17, 'minutes').toISOString()
    storage.status = [
      { key: 'pending', titleKey: 'admin:storage.title', status: 'pending', lastAttempt: null },
      { key: 'operational', titleKey: 'admin:storage.title', status: 'operational', lastAttempt },
      { key: 'error', titleKey: 'admin:storage.title', status: 'error', lastAttempt, message: 'Storage initialization failed.' }
    ]

    await Vue.nextTick()
    expect(app.$el.textContent).toContain('等待中')
    expect(app.$el.textContent).toContain(moment(lastAttempt).locale('zh-cn').fromNow())
    expect(storage.formatStorageMessage(storage.status[2].message)).toBe('存储初始化失败。')
    expect(storage.status[2].message).toBe('Storage initialization failed.')

    await locale.changeLanguage('en')
    await Vue.nextTick()
    expect(app.$el.textContent).toContain('Pending')
    expect(app.$el.textContent).toContain(moment(lastAttempt).locale('en').fromNow())
    expect(storage.formatStorageMessage(storage.status[2].message)).toBe('Storage initialization failed.')
  })

  it('translates known messages without changing diagnostic details', () => {
    expect(storage.formatStorageMessage('Initializing...')).toBe('正在初始化...')
    expect(storage.formatStorageMessage('Storage initialization failed. Connection refused')).toBe('存储初始化失败。 Connection refused')
    expect(storage.formatStorageMessage('Invalid storage target. Unable to perform sync.')).toBe('存储目标无效，无法执行同步。')
    expect(storage.formatStorageMessage('Connection refused: example.invalid')).toBe('Connection refused: example.invalid')
    expect(storage.formatStorageTime(null)).toBe('不适用')
    expect(storage.formatStorageTime('2026-02-30T00:00:00Z')).toBe('不适用')
  })
})
