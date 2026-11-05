/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const VueClipboards = require('vue-clipboards').default
const moment = require('moment-timezone')
const chinese = require('../../../../data/sideload/zh.json')

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.use(Vuetify)
Vue.use(VueClipboards)
Vue.prototype.$moment = moment
Vue.prototype.$t = (key, options) => chinese[key] || (options && options.defaultValue) || key

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-api.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === './admin-api-create.vue') {
    return { __esModule: true, default: { render: h => h('div') } }
  }
  if (name === 'vue-status-indicator') {
    return { StatusIndicator: { render: h => h('span') } }
  }
  return require(name)
}
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content, { doctype: 'html' })))

describe('admin API key list', () => {
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

  it('formats all three dates without changing the underlying key data', async () => {
    const key = {
      id: 1,
      name: 'Example',
      keyShort: '...example',
      expiration: '2027-01-01T20:10:00.000Z',
      createdAt: '2026-01-01T20:05:07.000Z',
      updatedAt: '2026-02-15T18:30:09.000Z',
      isRevoked: false
    }
    const testComponent = {
      ...component,
      data() {
        return { ...component.data.call(this), keys: [key] }
      }
    }
    const app = new Vue({ vuetify: new Vuetify(), render: h => h(testComponent) }).$mount()

    try {
      await Vue.nextTick()
      const cells = [...app.$el.querySelectorAll('tbody tr td')].map(cell => cell.textContent.trim())
      expect(cells.slice(1, 4)).toEqual(['2027-01-02 04-10-00', '2026-01-02 04-05-07', '2026-02-16 02-30-09'])
      expect(app.$el.textContent).not.toContain(key.keyShort)
      expect(app.$children[0].keys[0]).toMatchObject(key)
      expect(app.$children[0].formatApiDate(null)).toBeNull()
      expect(app.$children[0].formatApiDate('2026-02-30T00:00:00Z')).toBe('2026-02-30T00:00:00Z')
      expect(moment.locale()).toBe('zh-cn')
      app.$children[0].keys[0].isRevoked = true
      await Vue.nextTick()
      expect(app.$el.textContent).toContain('已撤销')
    } finally {
      app.$destroy()
    }
  })

  it('does not request any key material in the list', () => {
    const authentication = component.apollo.keys.query.definitions[0].selectionSet.selections[0]
    const apiKeys = authentication.selectionSet.selections[0]
    const fields = apiKeys.selectionSet.selections.map(field => field.name.value)
    expect(fields).not.toContain('keyShort')
    expect(fields).not.toContain('key')
  })

  it('only opens deletion for revoked keys and deletes through GraphQL', async () => {
    const api = {
      ...component.methods,
      current: {},
      isDeleteConfirmDialogShown: false,
      deleteLoading: false,
      $t: Vue.prototype.$t,
      $store: { commit: jest.fn() },
      refresh: jest.fn().mockResolvedValue(),
      $apollo: {
        mutate: jest.fn().mockResolvedValue({
          data: {
            authentication: {
              deleteApiKey: {
                responseResult: { succeeded: true }
              }
            }
          }
        })
      }
    }

    api.deleteKey({ id: 1, name: 'Active', isRevoked: false })
    expect(api.isDeleteConfirmDialogShown).toBe(false)

    api.deleteKey({ id: 2, name: 'Revoked', isRevoked: true })
    expect(api.isDeleteConfirmDialogShown).toBe(true)
    expect(api.current).toMatchObject({ id: 2, isRevoked: true })
    expect(api.$apollo.mutate).not.toHaveBeenCalled()

    await api.deleteConfirm()

    expect(api.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { id: 2 }
    }))
    expect(api.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: 'API 密钥已成功删除。'
    }))
    expect(api.refresh).toHaveBeenCalledWith(false)
    expect(api.isDeleteConfirmDialogShown).toBe(false)
    expect(api.deleteLoading).toBe(false)
  })

  it('renders a delete action that is enabled only for revoked keys', async () => {
    const activeKey = { id: 1, name: 'Active', expiration: null, createdAt: null, updatedAt: null, isRevoked: false }
    const revokedKey = { id: 2, name: 'Revoked', expiration: null, createdAt: null, updatedAt: null, isRevoked: true }
    const testComponent = {
      ...component,
      data() {
        return { ...component.data.call(this), keys: [activeKey, revokedKey] }
      }
    }
    const app = new Vue({ vuetify: new Vuetify(), render: h => h(testComponent) }).$mount()

    try {
      await Vue.nextTick()
      const deleteButtons = [...app.$el.querySelectorAll('button[aria-label="删除"]')]
      expect(deleteButtons).toHaveLength(2)
      expect(deleteButtons[0].disabled).toBe(true)
      expect(deleteButtons[1].disabled).toBe(false)
    } finally {
      app.$destroy()
    }
  })

  it('fetches a single key without caching and clears it after the dialog closes', async () => {
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    const mount = document.createElement('div')
    root.appendChild(mount)
    document.body.appendChild(root)
    const app = new Vue({ vuetify: new Vuetify(), render: h => h(component) }).$mount(mount)
    const api = app.$children[0]
    api.$store = { commit: jest.fn() }
    api.$apollo = { query: jest.fn().mockResolvedValue({ data: { authentication: { apiKey: 'secret-token' } } }) }
    const originalExecCommand = document.execCommand
    document.execCommand = jest.fn(() => true)

    try {
      await api.viewKey({ id: 42, name: 'Example' })
      await Vue.nextTick()
      await Vue.nextTick()
      expect(api.$apollo.query).toHaveBeenCalledWith(expect.objectContaining({
        variables: { id: 42 },
        fetchPolicy: 'no-cache'
      }))
      expect(api.isViewKeyDialogShown).toBe(true)
      expect(api.revealedKey).toBe('secret-token')

      const copyButton = [...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === '复制密钥')
      expect(copyButton).toBeDefined()
      expect(copyButton.disabled).toBe(false)
      expect(copyButton.$clipboards).toBeDefined()
      expect(copyButton.$clipboards.text(copyButton)).toBe('secret-token')
      copyButton.click()
      expect(document.execCommand).toHaveBeenCalledWith('copy')
      expect(copyButton.$clipboards.clipboardAction.selectedText).toBe('secret-token')
      expect(api.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({ message: 'API 密钥已复制。' }))

      api.isViewKeyDialogShown = false
      await Vue.nextTick()
      expect(api.revealedKey).toBe('')
      expect(api.viewedKeyName).toBe('')
    } finally {
      document.execCommand = originalExecCommand
      app.$destroy()
      if (root.parentNode) root.parentNode.removeChild(root)
    }
  })

  it('shows an error without exposing the server response when key lookup fails', async () => {
    const app = new Vue({ vuetify: new Vuetify(), render: h => h(component) }).$mount()
    const api = app.$children[0]
    api.$store = { commit: jest.fn() }
    api.$apollo = { query: jest.fn().mockRejectedValue(new Error('internal diagnostic')) }

    try {
      await api.viewKey({ id: 42, name: 'Example' })
      expect(api.isViewKeyDialogShown).toBe(false)
      expect(api.revealedKey).toBe('')
      expect(api.viewKeyLoadingId).toBeNull()
      expect(api.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
        message: '无法查看 API 密钥。'
      }))
    } finally {
      app.$destroy()
    }
  })
})
