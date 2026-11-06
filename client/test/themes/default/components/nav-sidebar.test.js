/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')

Vue.use(Vuetify)
Vue.prototype.$t = key => key

function loadComponent() {
  const source = fs.readFileSync(path.join(__dirname, '../../../../themes/default/components/nav-sidebar.vue'), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  const localRequire = name => {
    if (name === 'vuex-pathify') {
      return { get: () => () => '' }
    }
    if (name === 'vuetify/lib/components/VMenu') {
      return { VMenu: {} }
    }
    return require(name)
  }
  const setItem = jest.fn()
  runInThisContext(`(function (require, module, exports, siteLangs, window) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports, [], { localStorage: { getItem: () => 'custom', setItem } })
  return {
    component: Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content))),
    setItem
  }
}

describe('navigation sidebar breadcrumb selection', () => {
  const { component, setItem } = loadComponent()

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('opens and selects a virtual directory', async () => {
    const parent = { id: 4, path: 'DB', title: 'DB', isFolder: true, pageId: null, parent: 0, locale: 'zh' }
    const directory = { id: 5, path: 'DB/MYSQL', title: 'MYSQL', isFolder: true, pageId: null, parent: 4, locale: 'zh' }
    const child = { id: 6, path: 'DB/MYSQL/users', title: 'Users', isFolder: false, pageId: 9, parent: 5, locale: 'zh' }
    const query = jest.fn()
      .mockResolvedValueOnce({ data: { pages: { tree: [parent, directory] } } })
      .mockResolvedValueOnce({ data: { pages: { tree: [child] } } })
    const nav = Object.assign(component.data(), {
      $apollo: { query },
      $store: { commit: jest.fn() },
      locale: 'zh'
    })
    Object.keys(component.methods).forEach(name => {
      nav[name] = component.methods[name].bind(nav)
    })

    const result = await component.methods.navigateToDirectory.call(nav, 'DB/MYSQL')

    expect(result).toBe(true)
    expect(nav.currentMode).toBe('browse')
    expect(nav.parents.map(item => item.id)).toEqual([0, 4, 5])
    expect(nav.currentParent).toEqual(directory)
    expect(nav.currentItems).toEqual([child])
    expect(setItem).toHaveBeenCalledWith('navPref', 'browse')
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('does not intercept a breadcrumb that points to a real page', async () => {
    const page = { id: 9, path: 'DB/MYSQL', title: 'MYSQL', isFolder: false, pageId: 42, parent: 4, locale: 'zh' }
    const query = jest.fn().mockResolvedValue({ data: { pages: { tree: [page] } } })
    const nav = Object.assign(component.data(), {
      $apollo: { query },
      $store: { commit: jest.fn() },
      locale: 'zh',
      fetchBrowseItems: jest.fn()
    })

    const result = await component.methods.navigateToDirectory.call(nav, 'DB/MYSQL')

    expect(result).toBe(false)
    expect(nav.currentMode).toBe('custom')
    expect(nav.fetchBrowseItems).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledTimes(1)
  })
})

describe('navigation sidebar theme', () => {
  const { component } = loadComponent()
  const items = [{ k: 'link', l: 'Documents', t: '/zh/docs', c: 'mdi-folder-outline' }]

  it.each([
    ['light', false, '', 'theme--light'],
    ['dark', true, 'grey darken-4-d4', 'theme--dark']
  ])('renders the custom navigation in %s mode', async (name, dark, color, themeClass) => {
    const vuetify = new Vuetify({ theme: { dark } })
    const app = new Vue({
      vuetify,
      render: h => h(component, { props: { navMode: 'STATIC', dark, color, items } })
    }).$mount()

    try {
      await Vue.nextTick()
      const list = app.$el.querySelector('.v-list')
      expect(list.classList.contains(themeClass)).toBe(true)
      expect(list.classList.contains('primary')).toBe(false)
      expect(app.$el.textContent).toContain('Documents')
      expect(app.$el.querySelector('a').getAttribute('href')).toBe('/zh/docs')
    } finally {
      app.$destroy()
    }
  })

  it.each([['light', false], ['dark', true]])('retains the active page in %s browse mode', async (name, dark) => {
    const browseComponent = loadComponent().component
    const testComponent = {
      ...browseComponent,
      computed: { ...browseComponent.computed, path: () => 'docs' },
      mounted() {
        this.currentMode = 'browse'
        this.currentItems = [{ id: 1, title: 'Documents', path: 'docs', locale: 'zh', isFolder: false }]
      }
    }
    const app = new Vue({
      vuetify: new Vuetify({ theme: { dark } }),
      render: h => h(testComponent, { props: { navMode: 'TREE', dark, color: '' } })
    }).$mount()

    try {
      await Vue.nextTick()
      const selected = app.$el.querySelector('.v-list-item--active')
      expect(selected).not.toBeNull()
      expect(selected.getAttribute('href')).toBe('/zh/docs')
      expect(selected.classList.contains('primary--text')).toBe(!dark)
    } finally {
      app.$destroy()
    }
  })
})
