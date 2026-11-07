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
const zh = require('../../../../data/sideload/zh.json')
const en = require('../../../../data/sideload/en.json')

Vue.use(Vuetify)
Vue.use(VueI18Next)
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

describe('admin pages pagination', () => {
  it('renders the loading message in the active language', async () => {
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['admin', 'editor', 'common'],
      resources: { zh: { admin: {}, editor: {}, common: {} }, en: { admin: {}, editor: {}, common: {} } },
      initImmediate: false
    })
    const previousStore = Vue.prototype.$store
    Vue.prototype.$store = { state: { user: { permissions: [] } } }
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(loadComponent())
    }).$mount()

    try {
      app.$children[0].loading = true
      await Vue.nextTick()
      expect(app.$el.querySelector('.v-data-table__empty-wrapper').textContent).toContain(zh['common:dataIterator.loadingText'])
      await locale.changeLanguage('en')
      await Vue.nextTick()
      expect(app.$el.querySelector('.v-data-table__empty-wrapper').textContent).toContain(en['common:dataIterator.loadingText'])
    } finally {
      app.$destroy()
      Vue.prototype.$store = previousStore
    }
  })

  it('preserves an existing loading translation', async () => {
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      ns: ['admin', 'common'],
      resources: { zh: { admin: {}, common: { dataIterator: { loadingText: 'custom loading' } } } },
      initImmediate: false
    })
    loadComponent().created.call({ $i18n: { i18next: locale } })
    expect(locale.t('common:dataIterator.loadingText')).toBe('custom loading')
  })

  it('paginates filtered pages and displays continuous row numbers', async () => {
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['admin', 'editor', 'common'],
      resources: { zh: { admin: {}, editor: {}, common: {} }, en: { admin: {}, editor: {}, common: {} } },
      initImmediate: false
    })
    const component = loadComponent()
    const previousStore = Vue.prototype.$store
    Vue.prototype.$store = { state: { user: { permissions: [] } } }
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(component)
    }).$mount()

    try {
      const panel = app.$children[0]
      panel.pages = Array.from({ length: 101 }, (_, index) => ({
        id: index + 1000,
        title: `Page ${index}`,
        description: '',
        locale: index < 30 ? 'zh' : 'en',
        path: `page-${index}`,
        isPublished: index < 40,
        createdAt: null,
        updatedAt: null
      }))
      await Vue.nextTick()
      await Vue.nextTick()
      const rows = () => [...app.$el.querySelectorAll('tbody tr')].filter(row => row.querySelector('td:nth-child(2)'))
      const numbers = () => rows().map(row => row.querySelector('td').textContent.trim())
      const controls = app.$el.querySelector('.admin-pages-pagination')
      const descendants = vm => [vm, ...vm.$children.flatMap(descendants)]
      const select = descendants(panel).find(vm => vm.$options.name === 'v-select' && vm.items.length === 3 && vm.items[0].value === 20)

      expect([...controls.children].map(child => child.tagName)).toEqual(['SPAN', 'NAV', 'DIV'])
      expect(controls.querySelector('span').textContent.trim()).toBe('共 101 个页面')
      expect(select.items.map(item => item.text)).toEqual(['20条/页', '50条/页', '100条/页'])
      expect(app.$el.querySelector('thead th').textContent.trim()).toBe('序号')
      expect(rows()).toHaveLength(20)
      expect(numbers()[0]).toBe('1')
      panel.pagination = 3
      await Vue.nextTick()
      await Vue.nextTick()
      expect(numbers()[0]).toBe('41')
      select.$emit('input', 50)
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.pagination).toBe(1)
      expect(panel.pageTotal).toBe(3)
      expect(rows()).toHaveLength(50)

      panel.selectedLang = 'zh'
      panel.selectedState = true
      await Vue.nextTick()
      await Vue.nextTick()
      expect(controls.querySelector('span').textContent.trim()).toBe('共 30 个页面')
      panel.search = 'page-1'
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.filteredPageCount).toBe(11)
      expect(rows()).toHaveLength(11)
      panel.search = 'not-found'
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.filteredPageCount).toBe(0)
      expect(controls.querySelector('.v-pagination--disabled')).not.toBeNull()
      await locale.changeLanguage('en')
      await Vue.nextTick()
      expect(controls.querySelector('span').textContent.trim()).toBe('Total: 0 pages')
      expect(app.$el.querySelector('thead th').textContent.trim()).toBe('No.')
    } finally {
      app.$destroy()
      Vue.prototype.$store = previousStore
    }
  })
})
