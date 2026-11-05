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
Vue.component('VCardChin', { render: h => h('div') })

const source = fs.readFileSync(path.join(__dirname, '../../../components/profile/profile.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === 'vuex-pathify') return { get: () => () => '' }
  if (name === '../common/password-strength.vue') return { __esModule: true, default: { render: h => h('div') } }
  if (name === 'js-cookie') return { set: jest.fn() }
  return require(name)
}
runInThisContext(`(function (require, module, exports, window) {\n${code}\n})`)(
  localRequire,
  componentModule,
  componentModule.exports,
  { location: { protocol: 'https:' } }
)
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))

describe('profile activity dates', () => {
  const previousLocale = moment.locale()
  const previousTimezone = moment.defaultZone && moment.defaultZone.name

  beforeEach(() => {
    moment.tz.setDefault('Asia/Shanghai')
    moment.locale('zh-cn')
  })

  afterEach(() => {
    moment.tz.setDefault(previousTimezone)
    moment.locale(previousLocale)
  })

  it('renders activity timestamps in the configured timezone without changing them', async () => {
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const app = new Vue({ vuetify: new Vuetify(), render: h => h(component) }).$mount()
    root.appendChild(app.$el)
    const profile = app.$children[0]
    const timestamps = {
      createdAt: '2026-01-01T20:05:07.000Z',
      updatedAt: '2026-02-15T18:30:09.000Z',
      lastLoginAt: '2026-03-03T12:30:54.000Z'
    }
    Object.assign(profile.user, timestamps)

    try {
      await Vue.nextTick()
      const heading = [...app.$el.querySelectorAll('.v-toolbar__title')]
        .find(element => element.textContent.includes('profile:activity.title'))
      const values = [...heading.closest('.v-card').querySelectorAll('.v-card__text .body-2 strong')]
        .slice(0, 3).map(element => element.textContent.trim())
      expect(values).toEqual(['2026-01-02 04:05', '2026-02-16 02:30', '2026-03-03 20:30'])
      expect(profile.user).toMatchObject(timestamps)
      expect(profile.formatActivityTime(null)).toBeNull()
      expect(profile.formatActivityTime('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')
      expect(moment.locale()).toBe('zh-cn')
    } finally {
      app.$destroy()
      root.remove()
    }
  })

  it.each([
    ['', 'profile:localeDefault'],
    ['DD.MM.YYYY', 'DD.MM.YYYY']
  ])('displays date format "%s" as read-only and preserves it on save', async (dateFormat, displayed) => {
    const testComponent = {
      ...component,
      _Ctor: undefined,
      data() {
        const data = component.data.call(this)
        data.user.dateFormat = dateFormat
        return data
      }
    }
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const app = new Vue({ vuetify: new Vuetify(), render: h => h(testComponent) }).$mount()
    root.appendChild(app.$el)
    const profile = app.$children[0]
    profile.$store = { commit: jest.fn(), set: jest.fn() }
    profile.$apollo = {
      mutate: jest.fn().mockResolvedValue({
        data: { users: { updateProfile: { responseResult: { succeeded: true }, jwt: 'token' } } }
      })
    }

    try {
      await Vue.nextTick()
      const rows = [...app.$el.querySelectorAll('.v-list-item')]
      const dateRow = rows.find(row => row.querySelector('.v-list-item__title') &&
        row.querySelector('.v-list-item__title').textContent.trim() === 'profile:dateFormat')
      const timezoneRow = rows.find(row => row.querySelector('.v-list-item__title') &&
        row.querySelector('.v-list-item__title').textContent.trim() === 'profile:timezone')

      expect(dateRow.querySelector('.v-list-item__subtitle').textContent.trim()).toBe(displayed)
      expect(dateRow.querySelector('button, input, [role="combobox"]')).toBeNull()
      expect(timezoneRow.querySelector('button')).not.toBeNull()

      await profile.saveProfile()
      expect(profile.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({
        variables: expect.objectContaining({ dateFormat })
      }))
      expect(profile.user.dateFormat).toBe(dateFormat)
    } finally {
      app.$destroy()
      root.remove()
    }
  })
})
