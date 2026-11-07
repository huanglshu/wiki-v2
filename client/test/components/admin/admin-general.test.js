/* eslint-env jest */

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
const _ = require('lodash')

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.use(Vuetify)
Vue.use(VueI18Next)

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-general.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const store = { state: {}, commit: jest.fn(), set: jest.fn(), registerModule: jest.fn() }
const localRequire = name => {
  if (name === 'vuex-pathify') return { sync: () => ({ get: () => '', set: () => {} }) }
  if (name === '../../store/editor') return { __esModule: true, default: {} }
  return require(name)
}
runInThisContext(`(function (require, module, exports, WIKI) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports, { $store: store })
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
const resources = {}
for (const language of ['zh', 'en']) {
  const strings = require(`../../../../data/sideload/${language}.json`)
  const admin = {}
  Object.entries(strings).forEach(([key, value]) => {
    if (key.startsWith('admin:ui.general.')) {
      _.set(admin, key.slice('admin:'.length), value)
    }
  })
  resources[language] = { admin }
}

describe('admin general robots options', () => {
  let app
  let general
  let locale

  beforeEach(() => {
    locale = i18next.createInstance()
    locale.init({ lng: 'zh', fallbackLng: false, ns: ['admin'], resources, initImmediate: false })
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
    general = app.$children[0]
    general.$store = store
    general.config.robots = ['index', 'follow']
  })

  afterEach(() => {
    const root = app.$el.parentNode
    app.$destroy()
    if (root && root.parentNode) root.parentNode.removeChild(root)
    jest.clearAllMocks()
  })

  it('uses the management layout to select the site logo', () => {
    expect(source).toContain("component(:is='activeModal', management, selection)")
    const context = { config: {}, $store: store, $root: { $on: jest.fn(), $off: jest.fn() } }
    component.methods.browseLogo.call(context)
    expect(store.set).toHaveBeenCalledWith('editor/editorKey', 'common')
    expect(context.activeModal).toBe('editorModalMedia')
    component.mounted.call(context)
    context.$root.$on.mock.calls[0][1]({ path: '/images/logo.png' })
    expect(context.config.logoUrl).toBe('/images/logo.png')
  })

  it('renders translated option labels and preserves selected values', async () => {
    await Vue.nextTick()
    const expected = ['允许索引', '跟踪链接', '禁止索引', '不跟踪链接']
    expect(general.metaRobots.map(item => item.text)).toEqual(expected)
    expect(general.metaRobots.map(item => item.value)).toEqual(['index', 'follow', 'noindex', 'nofollow'])

    const descendants = vm => [vm, ...vm.$children.flatMap(descendants)]
    const select = descendants(general).find(vm => vm.$options.name === 'v-select' && vm.label === '搜索引擎索引规则')
    expect(select).toBeDefined()
    expect(select.$el.textContent).toContain('允许索引')
    expect(select.$el.textContent).toContain('跟踪链接')
    expect(select.$el.textContent).not.toContain('[object Object]')

    select.activateMenu()
    await new Promise(resolve => setTimeout(resolve, 40))
    await Vue.nextTick()
    expected.forEach(label => expect(document.body.textContent).toContain(label))

    select.selectItem(general.metaRobots[3])
    await Vue.nextTick()
    expect(general.config.robots).toEqual(['index', 'follow', 'nofollow'])

    await locale.changeLanguage('en')
    await Vue.nextTick()
    expect(general.metaRobots.map(item => item.text)).toEqual(['Index', 'Follow', 'Noindex', 'Nofollow'])
    expect(general.config.robots).toEqual(['index', 'follow', 'nofollow'])
  })

  it('saves raw rule values in the GraphQL mutation', async () => {
    const mutate = jest.fn().mockResolvedValue({})
    general.$apollo = { mutate }
    general.config.robots = ['index', 'nofollow']

    await general.save()

    expect(mutate.mock.calls[0][0].variables.robots).toEqual(['index', 'nofollow'])
  })
})
