/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const sass = require('sass')
const Vue = require('vue')
const Vuetify = require('vuetify')

Vue.use(Vuetify)
Vue.prototype.$t = key => key
Vue.component('PageSelector', { render: h => h('div') })

const source = fs.readFileSync(path.join(__dirname, '../../../components/common/nav-header.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const values = {
  'site/title': 'Wiki',
  'site/logoUrl': '',
  'page/path': 'home',
  'page/locale': 'zh',
  'page/mode': 'view',
  'user/name': 'Admin',
  'user/email': '',
  'user/pictureUrl': '',
  'user/authenticated': true,
  'user/permissions': ['manage:system']
}
const localRequire = name => {
  if (name === 'vuex-pathify') {
    return {
      get: key => () => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : false,
      sync: () => ({ get: () => '', set: () => {} })
    }
  }
  if (name === '../../helpers/client-cache' || name.startsWith('gql/')) return {}
  if (name === '../../../data/sideload/zh.json' || name === '../../../data/sideload/en.json') {
    return require(path.join(__dirname, '../../../../', name.slice('../../../'.length)))
  }
  return require(name)
}
runInThisContext(`(function (require, module, exports, siteConfig, siteLangs) {\n${code}\n})`)(
  localRequire,
  componentModule,
  componentModule.exports,
  { devMode: false },
  []
)
const emptyComponent = { render: h => h('div') }
const component = {
  ...componentModule.exports.default,
  ...compiler.compileToFunctions(pug.render(sfc.template.content)),
  components: { PageDelete: emptyComponent, PageConvert: emptyComponent }
}

describe('navigation header theme', () => {
  let styleElement

  beforeAll(() => {
    const scssPath = path.join(__dirname, '../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    styleElement = document.createElement('style')
    styleElement.textContent = css
    document.head.appendChild(styleElement)
  })

  afterAll(() => {
    styleElement.remove()
  })

  it.each([
    ['front page', 'view', { siteHeader: true }, true],
    ['administration', 'admin', { siteHeader: true, hideSearch: true }, true],
    ['editor', 'edit', { siteHeader: true, dense: true }, true],
    ['profile', 'profile', { siteHeader: true }, true],
    ['default', 'view', {}, false]
  ])('renders the %s header color', async (name, mode, props, siteClass) => {
    values['page/mode'] = mode
    const app = new Vue({
      vuetify: new Vuetify(),
      render: h => h(component, { props })
    }).$mount()
    document.body.appendChild(app.$el)

    try {
      await Vue.nextTick()
      if (siteClass) {
        expect(app.$el.style.backgroundColor).toBe('rgb(51, 96, 160)')
      } else {
        expect(app.$el.classList.contains('black')).toBe(true)
      }
      expect(app.$el.classList.contains('nav-header--site')).toBe(siteClass)
      const toolbars = [...app.$el.querySelectorAll('.nav-header-inner')]
      expect(toolbars.length).toBeGreaterThan(0)
      toolbars.forEach(toolbar => {
        if (siteClass) {
          expect(toolbar.style.backgroundColor).toBe('rgb(51, 96, 160)')
        } else {
          expect(toolbar.classList.contains('black')).toBe(true)
        }
      })
      expect(app.$el.querySelector('[aria-label="common:header.account"]')).not.toBeNull()
      if (mode === 'admin') {
        const backButton = app.$el.querySelector('.nav-header-back-to-site')
        expect(backButton.getAttribute('href')).toBe('/')
        expect(backButton.querySelector('.v-icon')).not.toBeNull()
        const label = backButton.querySelector('.nav-header-back-to-site__label')
        expect(label.textContent).toBe('common:header.backToSite')
        expect(window.getComputedStyle(backButton.querySelector('.v-btn__content')).alignItems).toBe('center')
        expect(window.getComputedStyle(label).lineHeight).toBe('1')
      }
    } finally {
      app.$destroy()
      app.$el.remove()
    }
  })

  it('uses the same color for the front page mobile search bar', () => {
    expect(component.computed.mobileSearchColor.call({ siteHeader: true, headerColor: '#3360a0' })).toBe('#3360a0')
    expect(component.computed.mobileSearchColor.call({ siteHeader: false })).toBe('deep-purple')
  })

  it('centers the development badge and registers its Chinese translation', () => {
    const badge = document.createElement('div')
    badge.className = 'nav-header-dev'
    document.body.appendChild(badge)
    const style = window.getComputedStyle(badge)
    expect(style.top).toBe('50%')
    expect(style.transform).toBe('translateY(-50%)')
    expect(style.padding).toBe('5px 10px')
    expect(style.borderRadius).toBe('999px')
    badge.remove()

    const addResource = jest.fn()
    component.created.call({
      $i18n: { i18next: { addResource } },
      $vuetify: { breakpoint: { smAndDown: false } }
    })
    expect(addResource).toHaveBeenCalledWith('zh', 'common', 'header.developmentVersion', '开发模式')
  })

  it('offers only global and folder search, and resets the removed page scope', () => {
    const context = { path: 'docs/page', $t: key => key }
    const scopes = component.computed.searchScopes.call(context)
    expect(scopes.map(scope => scope.value)).toEqual(['global', 'folder'])
    expect(scopes[1].disabled).toBe(false)
    expect(component.computed.searchScopes.call({ ...context, path: '' })[1].disabled).toBe(true)

    const vm = { searchScope: 'page', $vuetify: { breakpoint: { smAndDown: false } } }
    component.created.call(vm)
    expect(vm.searchScope).toBe('global')
  })

  it('places both search scope menus above the search results overlay', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const selects = root.querySelectorAll('v-select.nav-header-search-scope')

    expect(selects).toHaveLength(2)
    selects.forEach(select => {
      expect(select.getAttribute(':menu-props')).toContain('zIndex: 101')
      expect(select.getAttribute(':menu-props')).toContain('minWidth: `92`')
    })
    const results = fs.readFileSync(path.join(__dirname, '../../../components/common/search-results.vue'), 'utf8')
    expect(results).toMatch(/\.search-results\s*\{[^}]*z-index:\s*100;/)
  })

  it('uses compact search fields and scope options', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const fields = root.querySelectorAll('.nav-header-search-scope, .nav-header-search-input')
    expect(fields).toHaveLength(4)
    fields.forEach(field => expect(field.hasAttribute('dense')).toBe(true))

    const menu = document.createElement('div')
    menu.className = 'nav-header-search-scope-menu'
    menu.innerHTML = '<div class="v-list-item"><div class="v-list-item__content"><div class="v-list-item__title">Example</div></div></div>'
    document.body.appendChild(menu)
    expect(styleElement.textContent).toMatch(/\.nav-header-search-scope-menu\s*\{\s*width:\s*max-content;/)
    expect(window.getComputedStyle(menu.firstElementChild).minHeight).toBe('32px')
    expect(window.getComputedStyle(menu.firstElementChild).paddingInline).toBe('10px')
    expect(window.getComputedStyle(menu.querySelector('.v-list-item__content')).padding).toBe('6px 0px')
    expect(window.getComputedStyle(menu.querySelector('.v-list-item__title')).fontSize).toBe('14px')
    expect(window.getComputedStyle(menu.querySelector('.v-list-item__title')).textAlign).toBe('center')
    menu.remove()
  })

  it('widens the search input while keeping the toolbar width constrained', () => {
    const search = document.createElement('div')
    search.className = 'nav-header-search'
    document.body.appendChild(search)
    const style = window.getComputedStyle(search)
    expect(style.width).toBe('calc(62.5% + 130px)')
    expect(style.maxWidth).toBe('100%')
    expect(style.marginInline).toBe('auto')
    search.remove()
  })

  it('keeps the scope compact and the search field flexible', () => {
    const scope = document.createElement('div')
    scope.className = 'nav-header-search-scope v-input'
    document.body.appendChild(scope)
    expect(window.getComputedStyle(scope).flex).toBe('0 0 120px')
    expect(styleElement.textContent).toMatch(/\.nav-header-search-scope\.v-input::after\s*\{[^}]*border-inline-end:\s*1px solid/)
    expect(styleElement.textContent).toMatch(/\.nav-header-search-scope\.v-text-field\.v-text-field--enclosed[^}]*padding:\s*0 6px/)
    expect(styleElement.textContent).toMatch(/\.nav-header-search-input\.v-text-field\.v-text-field--enclosed[^}]*padding-inline-start:\s*8px/)
    scope.remove()
  })

  it('enables the blue header for the front page, administration, editor and profile', () => {
    const frontPage = fs.readFileSync(path.join(__dirname, '../../../themes/default/components/page.vue'), 'utf8')
    const adminPage = fs.readFileSync(path.join(__dirname, '../../../components/admin.vue'), 'utf8')
    const editorPage = fs.readFileSync(path.join(__dirname, '../../../components/editor.vue'), 'utf8')
    const profilePage = fs.readFileSync(path.join(__dirname, '../../../components/profile.vue'), 'utf8')
    expect(frontPage).toContain("nav-header(v-if='!printView', site-header)")
    expect(adminPage).toContain('nav-header(hide-search, site-header)')
    expect(editorPage).toContain('nav-header(dense, site-header)')
    expect(profilePage).toContain('nav-header(site-header)')
    expect(editorPage).not.toContain("background-color='black'")
  })
})
