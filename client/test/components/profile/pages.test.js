/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const moment = require('moment-timezone')

Vue.use(Vuetify)
Vue.prototype.$moment = moment
Vue.prototype.$t = key => key

const source = fs.readFileSync(path.join(__dirname, '../../../components/profile/pages.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const assign = jest.fn()
runInThisContext(`(function (require, module, exports, window) {\n${code}\n})`)(
  require,
  componentModule,
  componentModule.exports,
  { location: { assign } }
)
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))

describe('profile page list dates', () => {
  const previousLocale = moment.locale()
  const previousTimezone = moment.defaultZone && moment.defaultZone.name

  beforeEach(() => {
    moment.tz.setDefault('Asia/Shanghai')
    moment.locale('zh-cn')
    assign.mockClear()
  })

  afterEach(() => {
    moment.tz.setDefault(previousTimezone)
    moment.locale(previousLocale)
  })

  it('formats both timestamps without changing the data or page navigation', async () => {
    const record = {
      id: 42,
      title: 'Test',
      description: '',
      locale: 'zh',
      path: 'test',
      createdAt: '2026-01-01T20:05:07.000Z',
      updatedAt: '2026-02-15T18:30:09.000Z'
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      render: h => h(component)
    }).$mount()
    const pages = app.$children[0]
    pages.pages = [record]

    try {
      await Vue.nextTick()
      await Vue.nextTick()
      const row = app.$el.querySelector('tbody tr')
      const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim())
      expect(cells.slice(2)).toEqual(['2026-01-02 04:05', '2026-02-16 02:30'])
      expect(pages.pages[0]).toMatchObject(record)
      expect(pages.formatPageDate(null)).toBeNull()
      expect(pages.formatPageDate('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')
      expect(moment.locale()).toBe('zh-cn')
      row.click()
      expect(assign).toHaveBeenCalledWith('/i/42')
    } finally {
      app.$destroy()
    }
  })
})
