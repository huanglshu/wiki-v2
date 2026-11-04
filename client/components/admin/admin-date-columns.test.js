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
Vue.component('RouterLink', { render: h => h('a') })

function loadComponent(filename) {
  const source = fs.readFileSync(path.join(__dirname, filename), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  const localRequire = name => name.startsWith('gql/') ? {} : require(name)
  runInThisContext(`(function (require, module, exports, siteLangs) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports, [])
  return Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
}

describe('admin list date columns', () => {
  const previousLocale = moment.locale()
  const previousTimezone = moment.defaultZone && moment.defaultZone.name
  const createdAt = '2026-01-01T20:05:07.000Z'
  const updatedAt = '2026-02-15T18:30:09.000Z'

  beforeEach(() => {
    moment.tz.setDefault('Asia/Shanghai')
    moment.locale('zh-cn')
  })

  afterEach(() => {
    moment.tz.setDefault(previousTimezone)
    moment.locale(previousLocale)
  })

  it.each([
    ['admin-groups.vue', 'groups', 'formatGroupDate', { id: 1, name: 'Group', userCount: 1, isSystem: false }],
    ['admin-pages.vue', 'pages', 'formatPageListDate', { id: 1, title: 'Page', description: '', locale: 'zh', path: 'page', isPublished: true }]
  ])('formats both date columns in %s without changing stored values', async (filename, collection, method, data) => {
    const component = loadComponent(filename)
    const record = { ...data, createdAt, updatedAt }
    const testComponent = {
      ...component,
      data() {
        return { ...component.data.call(this), [collection]: [record] }
      }
    }
    const app = new Vue({ vuetify: new Vuetify(), render: h => h(testComponent) }).$mount()

    try {
      await Vue.nextTick()
      await Vue.nextTick()
      const cells = [...app.$el.querySelectorAll('tbody tr td')].map(cell => cell.textContent.trim())
      expect(cells[3]).toBe('2026-01-02 04:05:07')
      expect(cells[4]).toBe('2026-02-16 02:30:09')
      expect(app.$children[0][collection][0]).toMatchObject({ createdAt, updatedAt })
      expect(app.$children[0][method](null)).toBeNull()
      expect(app.$children[0][method]('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')
      expect(moment.locale()).toBe('zh-cn')
    } finally {
      app.$destroy()
    }
  })
})

describe('admin dashboard date formatting', () => {
  const previousTimezone = moment.defaultZone && moment.defaultZone.name

  beforeEach(() => {
    moment.tz.setDefault('Asia/Shanghai')
  })

  afterEach(() => {
    moment.tz.setDefault(previousTimezone)
  })

  it('formats dates as year-month-day and hour-minute', () => {
    const component = loadComponent('admin-dashboard.vue')
    const formatDate = component.methods.formatDashboardDate.bind({ $moment: moment })

    expect(formatDate('2026-01-01T20:05:07.000Z')).toBe('2026-01-02 04:05')
    expect(formatDate(null)).toBeNull()
    expect(formatDate('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')
  })
})
