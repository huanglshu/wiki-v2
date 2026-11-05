/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const sass = require('sass')
const Vue = require('vue')
const Vuetify = require('vuetify')

Vue.use(Vuetify)
Vue.prototype.$t = key => key
Vue.component('PageSelector', { render: h => h('div') })

function loadTemplate(filename) {
  const source = fs.readFileSync(path.join(__dirname, '../../../components/editor', filename), 'utf8')
  return compiler.parseComponent(source)
}

function createToolbarComponent(filename, toggleMarkup) {
  const sfc = loadTemplate(filename)
  return {
    ...compiler.compileToFunctions(pug.render(sfc.template.content)),
    data: () => ({
      isModalShown: false,
      previewShown: true,
      spellModeActive: false,
      activeModal: '',
      helpShown: false,
      previewHTML: '',
      insertLinkDialog: false,
      locale: 'zh',
      path: 'home',
      cursorPos: { line: 0, ch: 0 }
    }),
    methods: {
      toggleMarkup,
      insertBeforeEachLine: jest.fn(),
      insertAfter: jest.fn(),
      setHeaderLine: jest.fn(),
      closeAllModal: jest.fn(),
      toggleModal: jest.fn(),
      insertLink: jest.fn(),
      insertLinkHandler: jest.fn(),
      toggleFullscreen: jest.fn(),
      toggleHelp: jest.fn()
    }
  }
}

describe('editor toolbar theme', () => {
  it.each([
    ['editor-markdown.vue', '.editor-markdown-toolbar'],
    ['editor-asciidoc.vue', '.editor-asciidoc-toolbar']
  ])('%s uses neutral light and dark themes and keeps formatting actions', async (filename, selector) => {
    const scssPath = path.join(__dirname, '../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const style = document.createElement('style')
    style.textContent = sass.renderSync({
      data: `${globals}\n${loadTemplate(filename).styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    document.head.appendChild(style)

    try {
      const rules = Array.from(style.sheet.cssRules)
      const divider = rules.find(rule => rule.selectorText === `${selector}::after`)
      const darkDivider = rules.find(rule => rule.selectorText === `${selector}.theme--dark::after`)
      expect(divider.style.position).toBe('absolute')
      expect(divider.style.bottom).toBe('0')
      expect(divider.style.height).toBe('1px')
      expect(divider.style.getPropertyValue('background-color')).toBe('#b8b8b8')
      expect(divider.style.getPropertyValue('pointer-events')).toBe('none')
      expect(darkDivider.style.getPropertyValue('background-color')).toBe('#626262')

      for (const dark of [false, true]) {
        const toggleMarkup = jest.fn()
        const component = createToolbarComponent(filename, toggleMarkup)
        const root = document.createElement('div')
        root.setAttribute('data-app', 'true')
        document.body.appendChild(root)
        const app = new Vue({
          vuetify: new Vuetify({ theme: { dark } }),
          render: h => h(component)
        }).$mount()
        root.appendChild(app.$el)

        try {
          await Vue.nextTick()
          const toolbar = app.$el.querySelector(selector)
          expect(toolbar.classList.contains(dark ? 'theme--dark' : 'theme--light')).toBe(true)
          expect(toolbar.classList.contains(dark ? 'darken-4' : 'lighten-4')).toBe(true)
          expect(toolbar.classList.contains('primary')).toBe(false)
          const sidebar = app.$el.querySelector(filename === 'editor-markdown.vue' ?
            '.editor-markdown-sidebar' :
            '.editor-asciidoc-sidebar')
          const sidebarIcon = sidebar.querySelector('.mdi-link-plus')
          expect(sidebarIcon.closest('button').classList.contains(dark ? 'theme--dark' : 'theme--light')).toBe(true)
          expect(sidebarIcon.classList.contains(dark ? 'theme--dark' : 'theme--light')).toBe(true)
          app.$children[0].activeModal = 'editorModalMedia'
          await Vue.nextTick()
          expect(sidebar.querySelector('.mdi-folder-multiple-image').classList.contains('teal--text')).toBe(true)
          toolbar.querySelector('.mdi-format-bold').closest('button').click()
          expect(toggleMarkup).toHaveBeenCalledWith({ start: '**' })
          if (filename === 'editor-markdown.vue') {
            app.$vuetify.breakpoint.mdAndUp = true
            await Vue.nextTick()
            const spellButton = toolbar.querySelector('.mdi-spellcheck').closest('button')
            spellButton.click()
            await Vue.nextTick()
            expect(app.$children[0].spellModeActive).toBe(true)
            expect(spellButton.classList.contains('v-btn--active')).toBe(true)
          }
        } finally {
          app.$destroy()
          root.remove()
        }
      }
    } finally {
      style.remove()
    }
  })

  it('uses readable neutral colors for the visual editor toolbar in both themes', () => {
    const sfc = loadTemplate('editor-ckeditor.vue')
    const scssPath = path.join(__dirname, '../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    const root = document.createElement('div')
    const editor = document.createElement('div')
    editor.className = 'editor-ckeditor'
    const toolbar = document.createElement('div')
    toolbar.className = 'ck ck-toolbar'
    editor.appendChild(toolbar)
    root.appendChild(editor)
    document.body.appendChild(root)

    try {
      expect(window.getComputedStyle(toolbar).backgroundColor).toBe('rgb(245, 245, 245)')
      expect(window.getComputedStyle(toolbar).borderBottomWidth).toBe('1px')
      expect(window.getComputedStyle(toolbar).getPropertyValue('--ck-color-text').trim()).toBe('#292929')
      root.className = 'theme--dark'
      expect(window.getComputedStyle(toolbar).backgroundColor).toBe('rgb(41, 41, 41)')
      expect(window.getComputedStyle(toolbar).getPropertyValue('--ck-color-text').trim()).toBe('#f5f5f5')
      expect(window.getComputedStyle(toolbar).getPropertyValue('--ck-color-button-on-background').trim()).toBe('#505050')
    } finally {
      root.remove()
      style.remove()
    }
  })
})
