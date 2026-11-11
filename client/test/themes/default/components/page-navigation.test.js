/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

const source = fs.readFileSync(path.join(__dirname, '../../../../themes/default/components/page.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const highlight = jest.fn()
const fetchPage = jest.fn()
const browser = {
  location: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/zh/folder/old',
    pathname: '/zh/folder/old',
    search: '',
    hash: '',
    assign: jest.fn(),
    reload: jest.fn()
  },
  history: {
    pushState: jest.fn((state, title, href) => {
      const url = new URL(href)
      Object.assign(browser.location, {
        href: url.href,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      })
    }),
    replaceState: jest.fn((state, title, href) => {
      const url = new URL(href)
      Object.assign(browser.location, {
        href: url.href,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      })
    })
  }
}
const localRequire = name => {
  if (name === 'vue-status-indicator') return { StatusIndicator: {} }
  if (name === './tabset.vue' || name === './nav-sidebar.vue') return {}
  if (name === 'mermaid') return { init: jest.fn() }
  if (name === 'prismjs') {
    return { highlightAllUnder: highlight, plugins: { autoloader: {}, NormalizeWhitespace: { setDefaults: () => {} } } }
  }
  if (name === 'vuex-pathify') return { get: () => () => {}, sync: () => ({}) }
  if (name === 'vue') return { component: () => {} }
  if (name === '../../../helpers/prism-copy') return { registerPrismCopyButton: () => {} }
  if (name === '../../../helpers/search-location') return require('../../../../helpers/search-location')
  if (name === '../../../helpers/page-find') return require('../../../../helpers/page-find')
  if (name === '../../../../data/sideload/zh.json' || name === '../../../../data/sideload/en.json') {
    return require(path.join(__dirname, '../../../../../', name.slice('../../../../'.length)))
  }
  return require(name)
}
runInThisContext(`(function (require, module, exports, siteLangs, siteConfig, window, document, fetch) {\n${code}\n})`)(
  localRequire, componentModule, componentModule.exports, [], { title: 'Wiki' }, browser, document, fetchPage
)
const component = componentModule.exports.default

describe('document navigation', () => {
  let vm
  let response

  beforeEach(() => {
    jest.clearAllMocks()
    Object.assign(browser.location, {
      href: 'http://localhost:3000/zh/folder/old',
      pathname: '/zh/folder/old',
      search: '',
      hash: ''
    })
    response = {
      ok: true,
      url: 'http://localhost:3000/zh/folder/new',
      headers: { get: () => 'application/json' },
      json: jest.fn().mockResolvedValue({
        softNavigation: true,
        page: {
          id: 2,
          locale: 'zh',
          path: 'folder/new',
          title: 'New page',
          description: 'New description',
          tags: [],
          toc: '[]',
          render: '<p>New content</p>'
        },
        effectivePermissions: { pages: { read: true, write: false } }
      })
    }
    fetchPage.mockResolvedValue(response)
    vm = {
      softNavigation: true,
      navigationSequence: 0,
      navigationController: null,
      navigationLoading: false,
      viewPage: { id: 1, locale: 'zh' },
      scrollPositions: {},
      scrollOpts: {},
      $store: { set: jest.fn(), commit: jest.fn() },
      $t: key => key,
      $vuetify: { breakpoint: { smAndDown: false }, goTo: jest.fn() },
      $refs: {
        container: { querySelectorAll: () => [] },
        scrollArea: { scrollTop: 100 },
        navSidebar: { currentMode: 'browse', currentItems: [{ pageId: 1 }, { pageId: 2 }], currentParent: {}, loadFromCurrentPath: jest.fn().mockResolvedValue() }
      },
      $nextTick: jest.fn().mockResolvedValue()
    }
    vm.applyPage = component.methods.applyPage.bind(vm)
    vm.loadPage = component.methods.loadPage.bind(vm)
    vm.onPageRefreshError = component.methods.onPageRefreshError.bind(vm)
  })

  it('offers a localized refresh button beside the current page copy button', () => {
    expect(sfc.template.content).toMatch(/v-icon\(small\) mdi-content-copy\s+v-btn\.page-breadcrumb-refresh\(/)
    expect(sfc.template.content).toMatch(/v-btn\.page-breadcrumb-refresh\([\s\S]*?v-if='props\.item\.pagePath === viewPage\.path'[\s\S]*?:aria-label='\$t\("common:page\.refresh"\)'[\s\S]*?:title='\$t\("common:page\.refresh"\)'[\s\S]*?@click='refreshPage'[\s\S]*?mdi-refresh/)
    expect(require('../../../../../data/sideload/zh.json')['common:page.refresh']).toBe('刷新当前页面')
    expect(require('../../../../../data/sideload/en.json')['common:page.refresh']).toBe('Refresh current page')
  })

  it('refreshes current content without changing history, scroll or reloading the browser', async () => {
    response.url = browser.location.href
    const data = await response.json()
    data.page.id = 1
    data.page.path = 'folder/old'
    response.json.mockResolvedValue(data)
    vm.pageFindQuery = 'needle'
    vm.updatePageFind = jest.fn()
    vm.clearPageFind = jest.fn()
    await component.methods.refreshPage.call(vm)

    expect(fetchPage).toHaveBeenCalledWith(browser.location.href, expect.objectContaining({
      cache: 'no-store',
      headers: { 'X-Wiki-Page-Navigation': '1' }
    }))
    expect(vm.viewPage.render).toBe('<p>New content</p>')
    expect(vm.$refs.scrollArea.scrollTop).toBe(100)
    expect(vm.updatePageFind).toHaveBeenCalledTimes(1)
    expect(vm.clearPageFind).not.toHaveBeenCalled()
    expect(browser.history.pushState).not.toHaveBeenCalled()
    expect(browser.history.replaceState).not.toHaveBeenCalled()
    expect(browser.location.reload).not.toHaveBeenCalled()
    expect(browser.location.assign).not.toHaveBeenCalled()
  })

  it.each(['unsupported page', 'unsupported response', 'network error', 'redirect'])(
    'does not reload the browser when refresh fails: %s', async failure => {
      if (failure === 'unsupported page') vm.softNavigation = false
      if (failure === 'unsupported response') response.json.mockResolvedValue({ softNavigation: false })
      if (failure === 'network error') fetchPage.mockRejectedValue(new Error('offline'))
      if (failure === 'redirect') response.url = 'http://localhost:3000/zh/folder/other'

      await component.methods.refreshPage.call(vm)
      expect(browser.location.assign).not.toHaveBeenCalled()
      expect(browser.location.reload).not.toHaveBeenCalled()
      expect(vm.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
        message: 'common:page.refreshFailed'
      }))
    }
  )

  it('shows more actions only when the shortcut is enabled and an action is permitted', () => {
    const permissions = {
      editShortcutsObj: { editFab: true },
      hasReadHistoryPermission: false,
      hasReadSourcePermission: false,
      hasWritePagesPermission: false,
      hasManagePagesPermission: false,
      hasDeletePagesPermission: true
    }
    expect(component.computed.showPageActionsMenu.call(permissions)).toBe(false)
    for (const permission of [
      'hasReadHistoryPermission',
      'hasReadSourcePermission',
      'hasWritePagesPermission',
      'hasManagePagesPermission'
    ]) {
      expect(component.computed.showPageActionsMenu.call({ ...permissions, [permission]: true })).toBe(true)
    }
    permissions.editShortcutsObj.editFab = false
    permissions.hasWritePagesPermission = true
    expect(component.computed.showPageActionsMenu.call(permissions)).toBe(false)
  })

  it('updates the page, permissions and address without a full reload', async () => {
    await vm.loadPage(new URL('http://localhost:3000/zh/folder/new'), false)

    expect(fetchPage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: { 'X-Wiki-Page-Navigation': '1' },
      credentials: 'same-origin'
    }))
    expect(browser.history.pushState).toHaveBeenCalledWith(null, '', 'http://localhost:3000/zh/folder/new')
    expect(vm.viewPage.render).toBe('<p>New content</p>')
    expect(vm.$store.set).toHaveBeenCalledWith('page/id', 2)
    expect(vm.$store.set).toHaveBeenCalledWith('page/effectivePermissions', { pages: { read: true, write: false } })
    expect(document.title).toBe('New page | Wiki')
    expect(highlight).toHaveBeenCalledWith(vm.$refs.container)
    expect(vm.$refs.scrollArea.scrollTop).toBe(0)
    expect(browser.location.assign).not.toHaveBeenCalled()
    expect(vm.navigationLoading).toBe(false)
  })

  it('clears document search before replacing the current page', async () => {
    vm.pageFindQuery = 'needle'
    vm.clearPageFind = jest.fn()
    await vm.loadPage(new URL('http://localhost:3000/zh/folder/new'), false)

    expect(vm.clearPageFind).toHaveBeenCalledTimes(1)
    expect(vm.viewPage.id).toBe(2)
  })

  it('restores the scroll position on history navigation', async () => {
    browser.location.href = response.url
    vm.scrollPositions[response.url] = 275
    await vm.loadPage(new URL(response.url), true)

    expect(vm.$refs.scrollArea.scrollTop).toBe(275)
    expect(browser.history.pushState).not.toHaveBeenCalled()
  })

  it('refreshes the sidebar and replaces the deleted page in history', async () => {
    const navigation = { pageId: 1, destination: '/zh/folder/new', handled: false }
    const load = jest.spyOn(vm, 'loadPage')

    component.methods.handlePageDeleted.call(vm, navigation)
    await load.mock.results[0].value

    expect(navigation.handled).toBe(true)
    expect(vm.$refs.navSidebar.currentItems).toEqual([{ pageId: 2 }])
    expect(vm.$refs.navSidebar.loadFromCurrentPath).toHaveBeenCalledWith(true)
    expect(browser.history.replaceState).toHaveBeenCalledWith(null, '', response.url)
    expect(browser.history.pushState).not.toHaveBeenCalled()
    expect(vm.viewPage.id).toBe(2)
    expect(browser.location.assign).not.toHaveBeenCalled()
  })

  it('does not interrupt a user who already navigated away while deletion was pending', () => {
    const navigation = { pageId: 7, destination: '/zh/folder/new', handled: false }
    vm.loadPage = jest.fn()

    component.methods.handlePageDeleted.call(vm, navigation)

    expect(navigation.handled).toBe(true)
    expect(vm.loadPage).not.toHaveBeenCalled()
  })

  it('leaves home or unsupported views to normal navigation after deletion', () => {
    vm.loadPage = jest.fn()
    const noSibling = { pageId: 1, destination: '/', handled: false }
    component.methods.handlePageDeleted.call(vm, noSibling)
    const unsupported = { pageId: 1, destination: '/zh/folder/new', handled: false }
    vm.softNavigation = false
    component.methods.handlePageDeleted.call(vm, unsupported)

    expect(noSibling.handled).toBe(false)
    expect(unsupported.handled).toBe(false)
    expect(vm.loadPage).not.toHaveBeenCalled()
  })

  it('uses a normal navigation for unsupported pages', async () => {
    response.json.mockResolvedValue({ softNavigation: false })
    await vm.loadPage(new URL(response.url), false)

    expect(browser.location.assign).toHaveBeenCalledWith(response.url)
    expect(browser.history.pushState).not.toHaveBeenCalled()
  })

  it('leaves modified clicks, downloads and other site areas to the browser', () => {
    const event = {
      target: { closest: () => null },
      button: 0,
      ctrlKey: true,
      preventDefault: jest.fn()
    }
    component.methods.navigatePage.call(vm, event, '/zh/folder/new')
    event.ctrlKey = false
    component.methods.navigatePage.call(vm, event, '/a/pages')
    component.methods.navigatePage.call(vm, event, '/file.pdf')
    event.target.closest = () => ({
      target: '',
      hasAttribute: attribute => attribute === 'download'
    })
    component.methods.navigatePage.call(vm, event, '/zh/folder/download')

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('ignores an older response after a newer navigation starts', async () => {
    let resolveFirst
    fetchPage.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
    const first = vm.loadPage(new URL('http://localhost:3000/zh/folder/first'), false)
    const second = vm.loadPage(new URL(response.url), false)
    resolveFirst(response)
    await Promise.all([first, second])

    expect(browser.history.pushState).toHaveBeenCalledTimes(1)
    expect(vm.viewPage.path).toBe('folder/new')
  })
})
