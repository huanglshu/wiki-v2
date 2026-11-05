/* eslint-env jest */
/* eslint-disable vue/one-component-per-file */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const VueI18Next = require('@panter/vue-i18next')
const i18next = require('i18next')
const moment = require('moment-timezone')

Vue.use(Vuetify)
Vue.use(VueI18Next)
Vue.prototype.$moment = moment
Vue.component('VCardChin', { render: h => h('div') })
Vue.component('RouterLink', { render: h => h('a') })

const localRequire = name => {
  if (name === './admin-users-create.vue' || name === '../common/user-search.vue') {
    return { __esModule: true, default: { render: h => h('div') } }
  }
  if (name === 'vue-status-indicator') {
    return { StatusIndicator: { render: h => h('span') } }
  }
  if (name === 'vuex-pathify') {
    return { get: () => () => 0 }
  }
  if (name.startsWith('gql/')) {
    return { __esModule: true, default: {} }
  }
  return require(name)
}

function loadComponent(filename) {
  const source = fs.readFileSync(path.join(__dirname, '../../../components/admin', filename), 'utf8')
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
  return Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
}

const component = loadComponent('admin-users.vue')
const editComponent = loadComponent('admin-users-edit.vue')

describe('admin users localization', () => {
  let app
  let users
  let locale

  beforeEach(() => {
    locale = i18next.createInstance()
    locale.init({
      lng: 'zh',
      fallbackLng: false,
      ns: ['admin'],
      resources: {
        zh: { admin: { ui: { users: { allProviders: '全部验证方式', never: '从未登录', providers: { local: '本地账户' } } } } },
        en: { admin: { ui: { users: { allProviders: 'All Providers', never: 'Never', providers: { local: 'Local' } } } } }
      },
      initImmediate: false
    })
    app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(component)
    }).$mount()
    document.body.appendChild(app.$el)
    users = app.$children[0]
  })

  afterEach(() => {
    app.$destroy()
    if (app.$el.parentNode) app.$el.parentNode.removeChild(app.$el)
  })

  it('renders translated and custom provider names with query results', async () => {
    const strategies = [
      { key: 'local', displayName: 'Local Database' },
      { key: 'company', displayName: 'Company SSO' }
    ]
    users.strategies = component.apollo.strategies.update({
      authentication: { activeStrategies: strategies }
    })
    users.users = [
      { id: 1, name: 'Alice', email: 'alice@example.com', providerKey: 'local', createdAt: '2026-01-01', isActive: true },
      { id: 2, name: 'Bob', email: 'bob@example.com', providerKey: 'company', createdAt: '2026-01-01', isActive: true }
    ]

    await Vue.nextTick()
    await Vue.nextTick()

    expect(app.$el.textContent).toContain('本地账户')
    expect(app.$el.textContent).toContain('Company SSO')
    expect(users.strategyOptions.map(option => option.key)).toEqual(['all', 'local', 'company'])
    expect(users.strategyOptions[0].displayName).toBe('全部验证方式')
    expect(users.getStrategyName('unknown')).toBe('unknown')
  })

  it('updates the provider filter and labels when the language changes', async () => {
    await locale.changeLanguage('en')
    await Vue.nextTick()

    expect(users.strategyOptions[0].displayName).toBe('All Providers')
    expect(users.getStrategyName('local')).toBe('Local')
  })

  it('falls back to provider names when translations or strategies are missing', () => {
    locale.removeResourceBundle('zh', 'admin')

    expect(users.getStrategyName('local')).toBe('Local')
    expect(users.getStrategyName('github')).toBe('GitHub')
    expect(component.apollo.strategies.update({ authentication: {} })).toEqual([])
  })

  it('formats creation times as numeric dates and login times in the current language', async () => {
    const createdAt = moment().subtract(3, 'days').toISOString()
    const lastLoginAt = moment().subtract(2, 'days').toISOString()
    users.users = [
      { id: 1, name: 'Alice', email: 'alice@example.com', providerKey: 'local', createdAt, lastLoginAt, isActive: true },
      { id: 2, name: 'Bob', email: 'bob@example.com', providerKey: 'local', createdAt, lastLoginAt: null, isActive: true }
    ]

    await Vue.nextTick()
    await Vue.nextTick()

    expect(app.$el.textContent).toContain(moment(createdAt).locale('en').format('YYYY-MM-DD HH:mm:ss'))
    expect(app.$el.textContent).toContain(moment(lastLoginAt).locale('zh-cn').fromNow())
    expect(app.$el.textContent).toContain('从未登录')
    expect(users.formatCreatedDate(null)).toBeNull()
    expect(users.formatCreatedDate('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')

    await locale.changeLanguage('en')
    await Vue.nextTick()

    expect(app.$el.textContent).toContain(moment(createdAt).locale('en').format('YYYY-MM-DD HH:mm:ss'))
    expect(app.$el.textContent).toContain(moment(lastLoginAt).locale('en').fromNow())
    expect(app.$el.textContent).toContain('Never')
    expect(users.formatRelativeTime('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')
  })

  it('formats all user activity times as numeric dates and times', async () => {
    const testComponent = {
      ...editComponent,
      data() {
        return { ...editComponent.data.call(this), groups: [] }
      }
    }
    const editApp = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent)
    }).$mount()
    const edit = editApp.$children[0]
    const timestamps = [
      '2026-01-01T10:30:00Z',
      '2026-02-02T11:30:00Z',
      '2026-03-03T12:30:00Z'
    ]
    edit.user = {
      ...edit.user,
      createdAt: timestamps[0],
      updatedAt: timestamps[1],
      lastLoginAt: timestamps[2]
    }

    try {
      await Vue.nextTick()
      timestamps.forEach(date => {
        expect(editApp.$el.textContent).toContain(moment(date).locale('en').format('YYYY-MM-DD HH:mm:ss'))
      })

      await locale.changeLanguage('en')
      await Vue.nextTick()
      timestamps.forEach(date => {
        expect(editApp.$el.textContent).toContain(moment(date).locale('en').format('YYYY-MM-DD HH:mm:ss'))
      })
      expect(edit.formatActivityTime(null)).toBeNull()
      expect(edit.formatActivityTime('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')
    } finally {
      editApp.$destroy()
    }
  })
})
