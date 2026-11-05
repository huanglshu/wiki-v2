/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

function loadComponent (filename, stubs = {}, browserWindow = global.window) {
  const source = fs.readFileSync(path.join(__dirname, '../../../components/editor', filename), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  const localRequire = name => {
    if (stubs[name]) {
      return stubs[name]
    }
    if (name === 'vuex-pathify') {
      return { get: () => () => '', sync: () => ({}) }
    }
    if (name.startsWith('codemirror') || name.startsWith('gql')) {
      return {}
    }
    return require(name)
  }
  runInThisContext(`(function (require, module, exports, siteLangs, siteConfig, window) {\n${code}\n})`)(
    localRequire,
    componentModule,
    componentModule.exports,
    [],
    { lang: 'zh', rtl: false },
    browserWindow
  )
  return componentModule.exports.default
}

describe('editor navigation', () => {
  let replace

  beforeEach(() => {
    replace = jest.fn()
    global.window = { location: { replace } }
  })

  afterEach(() => {
    delete global.window
  })

  it('returns to the editor selector when the properties dialog is closed', () => {
    const component = loadComponent('editor-modal-properties.vue')
    const vm = {
      isShown: true,
      $emit: jest.fn()
    }

    component.methods.closeToEditorSelector.call(vm)

    expect(vm.isShown).toBe(false)
    expect(vm.$emit).toHaveBeenCalledWith('select-editor')
  })

  it('exits the editor selector to the home page', () => {
    const component = loadComponent('editor-modal-editorselect.vue', {}, global.window)
    const vm = {
      isShown: true
    }

    component.methods.exitToHome.call(vm)

    expect(vm.isShown).toBe(false)
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('keeps the exit button without the floating back arrow', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../components/editor/editor-modal-editorselect.vue'), 'utf8')
    const template = compiler.parseComponent(source).template.content

    expect(template).toContain('@click=\'exitToHome\'')
    expect(template).not.toContain('mdi-undo-variant')
    expect(template).not.toContain('@click=\'goBack\'')
  })

  it('keeps the editor selector modal while showing the light background', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../components/editor/editor-modal-editorselect.vue'), 'utf8')
    const template = compiler.parseComponent(source).template.content

    expect(template).toContain('persistent')
    expect(template).toContain(":overlay-opacity='$vuetify.theme.dark ? undefined : 0'")
  })
})
