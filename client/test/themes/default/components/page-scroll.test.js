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
  if (name === '../../../../data/sideload/zh.json' || name === '../../../../data/sideload/en.json') {
    return require(path.join(__dirname, '../../../../../', name.slice('../../../../'.length)))
  }
  return require(name)
}
runInThisContext(`(function (require, module, exports, siteLangs, document) {\n${code}\n})`)(
  localRequire, componentModule, componentModule.exports, [], document
)
const component = componentModule.exports.default

describe('document scrolling', () => {
  afterEach(() => {
    document.documentElement.classList.remove('page-view-scroll')
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

  it('restores document scrolling for print view and on destruction', () => {
    component.watch.printView(false)
    expect(document.documentElement.classList.contains('page-view-scroll')).toBe(true)
    component.watch.printView(true)
    expect(document.documentElement.classList.contains('page-view-scroll')).toBe(false)
    component.watch.printView(false)
    component.beforeDestroy.call({ $root: { $off: jest.fn() } })
    expect(document.documentElement.classList.contains('page-view-scroll')).toBe(false)
  })
})
