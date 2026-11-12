/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const Vue = require('vue')
const Vuex = require('vuex')
const pathify = require('vuex-pathify')

Vue.use(Vuex)

function loadComponent(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '../../../', relativePath), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  const localRequire = name => {
    if (name === 'vuex-pathify') return pathify
    if (name === 'vuetify/lib/components/VMenu') return { VMenu: {} }
    if (name === 'epic-spinners') return { OrbitSpinner: {} }
    if (name.startsWith('gql/')) return {}
    if (name.endsWith('/data/sideload/zh.json')) return require('../../../../data/sideload/zh.json')
    if (name.endsWith('/data/sideload/en.json')) return require('../../../../data/sideload/en.json')
    return require(name)
  }
  runInThisContext(`(function (require, module, exports, siteLangs, window) {\n${code}\n})`)(
    localRequire,
    componentModule,
    componentModule.exports,
    [],
    { localStorage: { setItem: jest.fn(), getItem: () => 'browse' } }
  )
  return componentModule.exports.default
}

describe('folder search and sidebar integration', () => {
  it('tracks the selected directory independently of the open page', async () => {
    const sidebar = loadComponent('themes/default/components/nav-sidebar.vue')
    const search = loadComponent('components/common/search-results.vue')
    const siteState = {
      search: 'CAS',
      searchScope: 'folder',
      searchFolderPath: null,
      searchIsFocused: false,
      searchIsLoading: false,
      searchRestrictLocale: false,
      searchRestrictPath: false
    }
    const pageState = { path: 'different/folder/page', locale: 'zh' }
    const store = new Vuex.Store({
      plugins: [pathify.default.plugin],
      mutations: { loadingStart() {}, loadingStop() {} },
      modules: {
        site: { namespaced: true, state: siteState, mutations: pathify.make.mutations(siteState) },
        page: { namespaced: true, state: pageState, mutations: pathify.make.mutations(pageState) }
      }
    })
    const app = new Vue({
      store,
      render: h => h('div', [
        h({ ...sidebar, render: h => h('div'), mounted() {} }, { ref: 'sidebar' }),
        h({ ...search, render: h => h('div'), mounted() {} }, { ref: 'search' })
      ])
    }).$mount()

    try {
      const nav = app.$refs.sidebar
      const results = app.$refs.search
      nav.$apollo = { query: jest.fn().mockResolvedValue({ data: { pages: { tree: [] } } }) }
      nav.currentMode = 'browse'
      await nav.fetchBrowseItems({ id: 3, path: 'selected/folder', locale: 'zh' })
      await Vue.nextTick()
      expect(store.state.site.searchFolderPath).toBe('selected/folder')
      expect(results.$options.apollo.response.variables.call(results)).toEqual({
        query: 'CAS', scope: 'folder', locale: 'zh', path: 'selected/folder'
      })
      expect(results.$options.apollo.response.skip.call(results)).toBe(false)

      results.response = { results: [{ id: 'old' }], suggestions: [], totalHits: 1 }
      await nav.fetchBrowseItems({ id: 4, path: 'another/selected', locale: 'zh' })
      await Vue.nextTick()
      expect(results.$options.apollo.response.variables.call(results).path).toBe('another/selected')
      expect(results.response.results).toEqual([])

      await nav.fetchBrowseItems({ id: 0 })
      await Vue.nextTick()
      expect(store.state.site.searchFolderPath).toBe('')
      expect(results.$options.apollo.response.variables.call(results).path).toBe('')

      nav.switchMode('custom')
      await Vue.nextTick()
      expect(store.state.site.searchFolderPath).toBeNull()
      expect(results.$options.apollo.response.skip.call(results)).toBe(true)
      expect(results.response.results).toEqual([])

      nav.switchMode('browse')
      await Vue.nextTick()
      expect(store.state.site.searchFolderPath).toBe('')
      expect(results.$options.apollo.response.skip.call(results)).toBe(false)
    } finally {
      app.$destroy()
    }
  })
})
