/* eslint-env jest */
/* eslint-disable vue/one-component-per-file */

global.window = {
  location: {
    url: 'http://localhost:3000/'
  }
}

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const zh = require('../../../../data/sideload/zh.json')

const source = fs.readFileSync(path.join(__dirname, '../../../components/common/social-sharing.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const clipboardHandlers = {}
const clipboardInstance = { on: jest.fn((event, handler) => { clipboardHandlers[event] = handler }) }
const ClipboardJS = jest.fn(() => clipboardInstance)

runInThisContext(`(function (require, module, exports, window, document, screen, navigator) {\n${code}\n})`)(name => {
  if (name === 'clipboard') return ClipboardJS
  return require(name)
}, componentModule, componentModule.exports, global.window, global.document, global.screen, global.navigator)

const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))

describe('social sharing localization', () => {
  let app
  let notification

  beforeEach(() => {
    Vue.config.productionTip = false
    Vue.config.devtools = false
    Vue.use(Vuetify)
    Vue.prototype.$t = key => zh[key]
    notification = jest.fn()
    Vue.prototype.$store = {
      commit: notification
    }
    app = new Vue({
      vuetify: new Vuetify(),
      render: h => h(component, {
        props: {
          url: 'http://localhost:3000/zh/首页',
          title: '首页'
        }
      })
    }).$mount()
  })

  afterEach(() => {
    app.$destroy()
    delete Vue.prototype.$t
    delete Vue.prototype.$store
  })

  it('renders the copy URL label in the active language', () => {
    expect(app.$el.textContent).toContain('复制链接')
  })

  it('localizes copy success and failure notifications', () => {
    clipboardHandlers.success()
    clipboardHandlers.error()

    expect(notification).toHaveBeenNthCalledWith(1, 'showNotification', expect.objectContaining({
      message: '链接已复制。'
    }))
    expect(notification).toHaveBeenNthCalledWith(2, 'showNotification', expect.objectContaining({
      message: '复制链接失败。'
    }))
  })
})
