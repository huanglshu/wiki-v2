/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const zh = require('../../../../data/sideload/zh.json')
const en = require('../../../../data/sideload/en.json')

Vue.use(Vuetify)
Vue.prototype.$t = key => key
Vue.component('RouterLink', { render: h => h('a') })

function loadComponent() {
  const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-pages.vue'), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  const localRequire = name => {
    if (name.startsWith('gql/')) return {}
    if (name === '../../../data/sideload/zh.json') return zh
    if (name === '../../../data/sideload/en.json') return en
    return require(name)
  }
  runInThisContext(`(function (require, module, exports, siteLangs) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports, [])
  return Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
}

describe('admin pages asset manager', () => {
  it('opens and closes the management panel for authorized users', async () => {
    const component = loadComponent()
    const previousStore = Vue.prototype.$store
    const store = {
      state: { editor: {}, user: { permissions: ['read:assets'] } },
      set: jest.fn()
    }
    Vue.prototype.$store = store
    const panel = {
      props: ['management'],
      render(h) { return h('button', { on: { click: () => this.$emit('close') } }, 'panel') }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      render: h => h({ ...component, components: { editorModalMedia: panel } })
    }).$mount()

    try {
      await Vue.nextTick()
      const button = app.$el.querySelector('[aria-label="admin:ui.pages.assets"]')
      expect(button).not.toBeNull()
      button.click()
      await Vue.nextTick()
      expect(store.set).toHaveBeenCalledWith('editor/editorKey', 'common')
      expect(app.$children[0].assetManagerShown).toBe(true)
      expect(app.$children[0].$children.some(child => child.management)).toBe(true)
      const close = [...app.$el.querySelectorAll('button')].find(item => item.textContent === 'panel')
      close.click()
      await Vue.nextTick()
      expect(app.$children[0].assetManagerShown).toBe(false)
    } finally {
      app.$destroy()
      Vue.prototype.$store = previousStore
    }
  })

  it('restricts the entry to users who can read assets', () => {
    const component = loadComponent()
    const canBrowse = permissions => component.computed.canBrowseAssets.call({
      $store: { state: { user: { permissions } } }
    })
    expect(canBrowse(['manage:pages'])).toBe(false)
    expect(canBrowse(['read:assets'])).toBe(true)
    expect(canBrowse(['manage:system'])).toBe(true)
    expect(zh['admin:ui.pages.assets']).toBe('资源管理')
    expect(en['admin:ui.pages.assets']).toBe('Asset Management')
  })
})
