/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const sass = require('sass')

const source = fs.readFileSync(path.join(__dirname, '../../../../themes/default/components/page.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === 'vue-status-indicator') return { StatusIndicator: {} }
  if (name === './tabset.vue' || name === './nav-sidebar.vue' || name === 'mermaid') return {}
  if (name === 'prismjs') {
    return { plugins: { autoloader: {}, NormalizeWhitespace: { setDefaults: () => {} } } }
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
runInThisContext(`(function (require, module, exports, siteLangs, document, window) {\n${code}\n})`)(
  localRequire, componentModule, componentModule.exports, [], document, window
)
const component = componentModule.exports.default

describe('document scrolling', () => {
  afterEach(() => {
    document.documentElement.classList.remove('page-view-scroll')
    window.history.replaceState(null, '', '/')
  })

  it('keeps the breadcrumb outside the scroll area and the footer inside it', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const scrollArea = root.querySelector('.page-scroll-area')
    expect(scrollArea).not.toBeNull()
    expect(scrollArea.querySelector('nav-footer')).not.toBeNull()
    expect(scrollArea.querySelector('.breadcrumbs-nav')).toBeNull()
    expect(root.querySelector('template').content.querySelector('.breadcrumbs-nav')).not.toBeNull()
  })

  it('hides the sidebar tag card while preserving its tag data', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const card = root.querySelector('.page-tags-card')
    expect(card.getAttribute('v-show')).toBe('false')
    expect(card.getAttribute('v-if')).toBe('viewPage.tags.length > 0')
    expect(card.querySelector('[v-for]')).not.toBeNull()
  })

  it('uses the full content width when there is no table of contents or comments', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const sidebar = root.querySelector('.page-col-sd')
    const content = root.querySelector('.page-col-content')
    expect(sidebar.getAttribute('v-if')).toBe('showPageSidebar')
    expect(content.getAttribute(':lg9')).toBe('showPageSidebar && tocPosition !== `right`')
    expect(content.getAttribute(':xl10')).toBe('showPageSidebar && tocPosition !== `right`')

    const context = {
      tocDecoded: [],
      commentsEnabled: false,
      commentsPerms: { read: false },
      $vuetify: { breakpoint: { lgAndUp: true } }
    }
    expect(component.computed.showPageSidebar.call(context)).toBe(false)
  })

  it('keeps author, history, share and print controls above the page content', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const content = root.querySelector('.page-col-content')
    const metaBar = content.querySelector('.page-meta-bar')
    expect(metaBar.querySelector('.page-meta-bar__author')).not.toBeNull()
    expect(metaBar.querySelector('.page-meta-bar__actions')).not.toBeNull()
    expect(sfc.template.content).toContain("@click='print'")
    expect(metaBar.querySelector('social-sharing')).not.toBeNull()
    expect(content.querySelector('.page-author-card')).toBeNull()
    expect(content.querySelector('.page-shortcuts-card')).toBeNull()

    const scssPath = path.resolve(__dirname, '../../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    expect(css).toMatch(/\.page-meta-bar__actions\s*\{[^}]*gap:\s*8px;/)
  })

  it('uses the updated Chinese label for the page table of contents', () => {
    const translations = require('../../../../../data/sideload/zh.json')
    expect(translations['common:page.toc']).toBe('页面目录')
    expect(sfc.template.content).toContain("$t('common:page.toc')")
    expect(sfc.script.content).toContain("'page.toc'")
  })

  it('keeps the page directory compact and allows long headings to wrap', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const card = root.querySelector('.page-toc-card')
    const parentTemplate = card.querySelector('template')
    const parentItem = parentTemplate.content.querySelector('.page-toc-card__item')
    const childItem = parentTemplate.content.querySelector('template').content.querySelector('.page-toc-card__item')
    expect(card.querySelector('.page-toc-card__heading')).not.toBeNull()
    expect(parentItem.getAttribute('@click')).toBe('$vuetify.goTo(tocItem.anchor, scrollOpts)')
    expect(childItem.getAttribute('@click')).toBe('$vuetify.goTo(tocSubItem.anchor, scrollOpts)')
    expect(childItem.classList.contains('page-toc-card__item--child')).toBe(true)

    const scssPath = path.resolve(__dirname, '../../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    expect(css).toMatch(/\.page-toc-card__item--child\s*\{[^}]*padding-inline-start:\s*24px/)
    expect(css).toMatch(/\.v-list-item \.page-toc-card__text\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere/)
    expect(compiler.compile(pug.render(sfc.template.content)).errors).toEqual([])
  })

  it('omits the page title section while keeping configured edit shortcuts in the content area', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    expect(root.querySelector('.page-header-section')).toBeNull()
    expect(root.querySelector('.page-header-headings')).toBeNull()
    const shortcuts = root.querySelector('.page-col-content .page-edit-shortcuts')
    expect(shortcuts).not.toBeNull()
    expect(shortcuts.querySelector('[\\@click="pageEdit"]')).not.toBeNull()
    expect(shortcuts.querySelector('[\\:href="editMenuExternalUrl"]')).not.toBeNull()
  })

  it('prevents the breadcrumb toolbar from growing in the page layout', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    expect(root.querySelector('template').content.querySelector('.page-breadcrumb-toolbar')).not.toBeNull()

    const scssPath = path.resolve(__dirname, '../../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    expect(css).toMatch(/\.v-main__wrap\s*>\s*\.page-breadcrumb-toolbar\s*\{\s*flex:\s*0 0 auto;/)
  })

  it('places the page path copy button directly after the current breadcrumb', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const toolbar = root.querySelector('template').content.querySelector('.page-breadcrumb-toolbar')
    const findCopyButton = templateElement => {
      const copyButton = templateElement.content.querySelector('.page-breadcrumb-copy')
      if (copyButton) {
        return copyButton
      }
      return [...templateElement.content.querySelectorAll('template')]
        .map(findCopyButton)
        .find(Boolean)
    }
    const copyButton = findCopyButton(toolbar.querySelector('template'))

    expect(copyButton).not.toBeNull()
    expect(copyButton.getAttribute('v-if')).toBe('props.item.pagePath === viewPage.path')
    expect(copyButton.previousElementSibling.getAttribute(':href')).toBe('props.item.path')
    expect(copyButton.getAttribute(':aria-label')).toBe('$t("common:page.copyCurrentPath")')
    expect(copyButton.getAttribute('v-clipboard')).toBe('currentPagePathCopyText')
  })

  it('places document search after the breadcrumbs with navigation controls', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const toolbar = root.querySelector('template').content.querySelector('.page-breadcrumb-toolbar')
    const search = toolbar.querySelector('.page-find')
    expect(search.previousElementSibling.classList.contains('breadcrumbs-nav')).toBe(true)
    expect(search.querySelector('input').getAttribute('v-model')).toBe('pageFindQuery')
    expect(search.querySelectorAll('.page-find__button')).toHaveLength(3)
    expect(compiler.compile(pug.render(sfc.template.content)).errors).toEqual([])

    const scssPath = path.resolve(__dirname, '../../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    expect(css).toMatch(/\.page-find\s*\{[^}]*margin-left:\s*auto/)
  })

  it('copies the decoded page path with a leading slash', () => {
    const vm = { viewPage: { path: '业务中台（ACDP）/微服务启动参数/yunxi-dg-base-center-openapi' } }
    expect(component.computed.currentPagePathCopyText.call(vm)).toBe('/业务中台（ACDP）/微服务启动参数/yunxi-dg-base-center-openapi')
  })

  it('decodes the current browser path by segment', () => {
    const path = component.methods.decodePathSegments('/zh/%E4%B8%9A%E5%8A%A1%E4%B8%AD%E5%8F%B0%EF%BC%88ACDP%EF%BC%89/%E5%BE%AE%E6%9C%8D%E5%8A%A1%E5%90%AF%E5%8A%A8%E5%8F%82%E6%95%B0/yunxi-dg-base-center-openapi')
    expect(path).toBe('/zh/业务中台（ACDP）/微服务启动参数/yunxi-dg-base-center-openapi')
  })

  it('reports page path copy success and failure', () => {
    const vm = {
      $store: { commit: jest.fn() },
      $t: jest.fn(key => key)
    }
    const clearSelection = jest.fn()
    component.methods.onPagePathCopied.call(vm, { clearSelection })
    component.methods.onPagePathCopyError.call(vm)

    expect(clearSelection).toHaveBeenCalled()
    expect(vm.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: 'common:page.currentPathCopied'
    }))
    expect(vm.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: 'common:page.currentPathCopyFailed'
    }))
  })

  it('uses the content scroll position for the return-to-top button', () => {
    const vm = { $refs: { scrollArea: { scrollTop: 300, clientHeight: 600 } } }
    component.methods.upBtnScroll.call(vm)
    expect(vm.upBtnShown).toBe(true)
    vm.$refs.scrollArea.scrollTop = 0
    component.methods.upBtnScroll.call(vm)
    expect(vm.upBtnShown).toBe(false)
    expect(component.data().scrollOpts.appOffset).toBe(false)
  })

  it('highlights the selected search result and scrolls to it', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>first target</p><p>second target</p>'
    const scrollArea = { scrollTop: 100, getBoundingClientRect: () => ({ top: 50 }) }
    const vm = { $refs: { container, scrollArea } }
    const rect = jest.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top: 200 })
    const params = new URLSearchParams({ text: 'target', query: 'target', occurrence: '1' })
    window.history.replaceState(null, '', `/#search-${params.toString()}`)

    component.methods.scrollToSearchResult.call(vm)

    const mark = container.querySelector('mark')
    expect(mark.textContent).toBe('target')
    expect(mark.parentElement.textContent).toBe('second target')
    expect(scrollArea.scrollTop).toBe(226)
    rect.mockRestore()

    window.history.replaceState(null, '', '/#other')
    component.methods.scrollToSearchResult.call(vm)
    expect(container.querySelector('mark')).toBeNull()
  })

  it('highlights all document matches, cycles and clears them', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>Login and <strong>LOGIN</strong></p>'
    const scrollArea = { scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }) }
    const vm = {
      $refs: { container, scrollArea },
      pageFindQuery: 'login',
      pageFindCount: 0,
      pageFindIndex: -1
    }
    vm.movePageFind = component.methods.movePageFind.bind(vm)
    component.methods.updatePageFind.call(vm)

    expect(vm.pageFindCount).toBe(2)
    expect(vm.pageFindIndex).toBe(0)
    expect(container.querySelectorAll('.page-find-highlight--current')).toHaveLength(1)
    vm.movePageFind(1)
    expect(vm.pageFindIndex).toBe(1)
    expect(container.querySelector('.page-find-highlight--current').textContent).toBe('LOGIN')
    vm.movePageFind(1)
    expect(vm.pageFindIndex).toBe(0)
    vm.movePageFind(-1)
    expect(vm.pageFindIndex).toBe(1)

    component.methods.clearPageFind.call(vm)
    expect(vm.pageFindQuery).toBe('')
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(container.textContent).toBe('Login and LOGIN')
  })

  it('clears document highlights before applying a search-result location', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>first target</p><p>second target</p>'
    const scrollArea = { scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }) }
    const vm = { $refs: { container, scrollArea }, pageFindQuery: 'target', pageFindCount: 0, pageFindIndex: -1 }
    vm.movePageFind = component.methods.movePageFind.bind(vm)
    vm.clearPageFind = component.methods.clearPageFind.bind(vm)
    component.methods.updatePageFind.call(vm)
    const params = new URLSearchParams({ text: 'target', query: 'target', occurrence: '1' })
    window.history.replaceState(null, '', `/#search-${params.toString()}`)

    component.methods.scrollToSearchResult.call(vm)

    expect(vm.pageFindQuery).toBe('')
    expect(container.querySelectorAll('[data-page-find]')).toHaveLength(0)
    expect(container.querySelector('mark[data-search-result-highlight]').parentElement.textContent).toBe('second target')
  })

  it('restores document scrolling for print view and on destruction', () => {
    component.watch.printView(false)
    expect(document.documentElement.classList.contains('page-view-scroll')).toBe(true)
    component.watch.printView(true)
    expect(document.documentElement.classList.contains('page-view-scroll')).toBe(false)
    component.watch.printView(false)
    component.beforeDestroy.call({ $root: { $off: jest.fn() }, $refs: { container: document.createElement('div') } })
    expect(document.documentElement.classList.contains('page-view-scroll')).toBe(false)
  })
})
