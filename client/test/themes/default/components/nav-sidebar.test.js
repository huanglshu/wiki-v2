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
    if (name === '../../../../data/sideload/zh.json') {
      return require('../../../../../data/sideload/zh.json')
    }
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

  it('loads the directory copy messages from the Chinese sideload', () => {
    const addResource = jest.fn()

    component.created.call({ $i18n: { i18next: { addResource } } })

    expect(addResource).toHaveBeenCalledWith('zh', 'common', 'sidebar.copyDirectoryPath', '复制目录路径')
    expect(addResource).toHaveBeenCalledWith('zh', 'common', 'sidebar.directoryPathCopied', '目录路径已复制。')
    expect(addResource).toHaveBeenCalledWith('zh', 'common', 'sidebar.directoryPathCopyFailed', '复制目录路径失败。')
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

  it('refreshes the child list when an already loaded directory is selected again', async () => {
    const directory = { id: 5, path: 'DB/MYSQL', title: 'MYSQL', isFolder: true, pageId: null, parent: 4, locale: 'zh' }
    const staleChild = { id: 6, path: 'DB/MYSQL/old', title: 'Old', isFolder: false, pageId: 9, parent: 5, locale: 'zh' }
    const refreshedChild = { id: 7, path: 'DB/MYSQL/new', title: 'New', isFolder: false, pageId: 10, parent: 5, locale: 'zh' }
    const query = jest.fn().mockResolvedValue({ data: { pages: { tree: [refreshedChild] } } })
    const nav = Object.assign(component.data(), {
      $apollo: { query },
      $store: { commit: jest.fn() },
      locale: 'zh',
      currentParent: directory,
      parents: [{ id: 0, title: '/ (root)' }, directory],
      loadedCache: [directory.id],
      currentItems: [staleChild]
    })
    Object.keys(component.methods).forEach(name => {
      nav[name] = component.methods[name].bind(nav)
    })

    await component.methods.fetchBrowseItems.call(nav, directory)

    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      fetchPolicy: 'network-only',
      variables: { parent: directory.id, locale: 'zh' }
    }))
    expect(nav.currentItems).toEqual([refreshedChild])
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

  it('fetches a fresh tree when explicitly refreshing the current path', async () => {
    const page = { id: 6, path: 'DB/MYSQL/users', title: 'Users', isFolder: false, pageId: 9, parent: 0, locale: 'zh' }
    const query = jest.fn().mockResolvedValue({ data: { pages: { tree: [page] } } })
    const nav = Object.assign(component.data(), {
      $apollo: { query },
      $store: { commit: jest.fn(), get: jest.fn().mockReturnValue(9) },
      path: page.path,
      locale: 'zh'
    })

    await component.methods.loadFromCurrentPath.call(nav, true)

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ fetchPolicy: 'network-only' }))
    expect(nav.currentItems).toEqual([page])
  })
})

describe('navigation sidebar theme', () => {
  const { component } = loadComponent()
  const items = [{ k: 'link', l: 'Documents', t: '/zh/docs', c: 'mdi-folder-outline' }]

  Vue.directive('clipboard', {
    bind(el, binding) {
      el.dataset.clipboard = binding.value
    }
  })

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

  it('copies the active directory path without selecting the directory row', async () => {
    const browseComponent = loadComponent().component
    const fetchBrowseItems = jest.fn()
    const directory = { id: 4, path: '中控台（CenterConsole）', title: '中控台（CenterConsole）', isFolder: true, pageId: null, parent: 0, locale: 'zh' }
    const testComponent = {
      ...browseComponent,
      methods: { ...browseComponent.methods, fetchBrowseItems },
      mounted() {
        this.currentMode = 'browse'
        this.currentParent = directory
        this.parents = [{ id: 0, title: '/ (root)' }, directory]
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      render: h => h(testComponent, { props: { navMode: 'TREE' } })
    }).$mount()

    try {
      await Vue.nextTick()
      const copyButton = app.$el.querySelector('.nav-sidebar-directory-copy')
      expect(copyButton.dataset.clipboard).toBe('/中控台（CenterConsole）/')
      expect(copyButton.getAttribute('aria-label')).toBe('common:sidebar.copyDirectoryPath')
      expect(copyButton.previousElementSibling.classList.contains('spacer')).toBe(true)

      copyButton.click()
      expect(fetchBrowseItems).not.toHaveBeenCalled()
      expect(component.methods.directoryPathForCopy('/中控台（CenterConsole）/')).toBe('/中控台（CenterConsole）/')
    } finally {
      app.$destroy()
    }
  })

  it('sets the full item title as tooltip on sidebar links and folders', async () => {
    const browseComponent = loadComponent().component
    const parentDir = { id: 10, path: '业务中台（ACDP）/微服务启动参数', title: '微服务启动参数', isFolder: true, pageId: null, parent: 1, locale: 'zh' }
    const childPage = { id: 98, path: '业务中台（ACDP）/微服务启动参数/yunxi-dg-base-center-logistics', title: 'yunxi-dg-base-center-logistics', isFolder: false, pageId: 98, parent: 10, locale: 'zh' }
    const testComponent = {
      ...browseComponent,
      methods: { ...browseComponent.methods, fetchBrowseItems: jest.fn() },
      mounted() {
        this.currentMode = 'browse'
        this.currentParent = parentDir
        this.parents = [{ id: 0, title: '/ (root)' }, parentDir]
        this.currentItems = [childPage]
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      render: h => h(testComponent, { props: { navMode: 'TREE', dark: false } })
    }).$mount()

    try {
      await Vue.nextTick()
      const pageLink = app.$el.querySelector('a.v-list-item[href="/zh/业务中台（ACDP）/微服务启动参数/yunxi-dg-base-center-logistics"]')
      expect(pageLink).not.toBeNull()
      expect(pageLink.getAttribute('title')).toBe('yunxi-dg-base-center-logistics')
    } finally {
      app.$destroy()
    }
  })
})
