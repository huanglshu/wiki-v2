/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

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
      return { get: () => ({}) }
    }
    if (name === 'vuetify/lib/components/VMenu') {
      return { VMenu: {} }
    }
    return require(name)
  }
  const setItem = jest.fn()
  runInThisContext(`(function (require, module, exports, siteLangs, window) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports, [], { localStorage: { setItem } })
  return {
    component: componentModule.exports.default,
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
