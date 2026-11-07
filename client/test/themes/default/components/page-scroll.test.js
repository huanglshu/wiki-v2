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
