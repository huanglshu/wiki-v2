/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const i18next = require('i18next')
const zh = require('../../../data/sideload/zh.json')
const en = require('../../../data/sideload/en.json')

const replace = jest.fn()
const setJwt = jest.fn()
const clearClientCache = jest.fn().mockResolvedValue()
const mockWindow = {
  location: {
    protocol: 'https:',
    replace
  }
}

const source = fs.readFileSync(path.join(__dirname, '../../components/login.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === '../helpers/client-cache') {
    return { __esModule: true, default: clearClientCache }
  }
  if (name === 'js-cookie') {
    return {
      get: jest.fn(),
      set: setJwt,
      remove: jest.fn()
    }
  }
  return require(name)
}
runInThisContext(`(function (require, module, exports, window) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports, mockWindow)
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))

describe('login cache refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('clears cached client state before reloading the redirect target', async () => {
    const ctx = {
      ...component.methods,
      $nextTick: callback => callback(),
      $t: key => key,
      $refs: {},
      loaderColor: '',
      loaderTitle: ''
    }

    await component.methods.handleLoginResponse.call(ctx, {
      jwt: 'new-token',
      redirect: '/zh/home'
    })

    expect(setJwt).toHaveBeenCalledWith('jwt', 'new-token', expect.any(Object))
    expect(clearClientCache).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/zh/home')
    expect(clearClientCache.mock.invocationCallOrder[0]).toBeLessThan(replace.mock.invocationCallOrder[0])
  })
})

describe('login error messages', () => {
  const originalConsoleError = console.error

  beforeEach(() => {
    console.error = jest.fn()
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  it.each([
    [1002, 'Invalid email / username or password.', 'translated login error'],
    [1013, 'Your account has been disabled.', 'Your account has been disabled.']
  ])('shows the appropriate message for error code %i', async (errorCode, message, expected) => {
    const ctx = {
      username: 'user',
      password: 'password',
      selectedStrategy: { key: 'local' },
      $t: jest.fn().mockReturnValue('translated login error'),
      $store: { commit: jest.fn() },
      $apollo: {
        mutate: jest.fn().mockResolvedValue({
          data: { authentication: { login: { responseResult: { succeeded: false, errorCode, message } } } }
        })
      }
    }

    await component.methods.login.call(ctx)

    expect(ctx.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({ message: expected }))
    expect(ctx.isLoading).toBe(false)
    if (errorCode === 1002) {
      expect(ctx.$t).toHaveBeenCalledWith('auth:errors.invalidLoginMsg')
    } else {
      expect(ctx.$t).not.toHaveBeenCalledWith('auth:errors.invalidLoginMsg')
    }
  })
})

describe('password reset error messages', () => {
  it.each([
    ['zh', 3002, 'The mail configuration is incomplete or invalid.', zh['auth:errors.mailNotConfigured']],
    ['en', 3002, 'The mail configuration is incomplete or invalid.', en['auth:errors.mailNotConfigured']],
    ['zh', 3004, 'The recipient email address is invalid.', 'The recipient email address is invalid.']
  ])('shows the appropriate message for %s and error code %i', async (language, errorCode, message, expected) => {
    const i18n = i18next.createInstance()
    await i18n.init({
      lng: language,
      fallbackLng: 'en',
      resources: {
        zh: { auth: { errors: { mailNotConfigured: zh['auth:errors.mailNotConfigured'] } } },
        en: { auth: { errors: { mailNotConfigured: en['auth:errors.mailNotConfigured'] } } }
      }
    })
    const ctx = {
      username: 'user@example.com',
      $t: i18n.t.bind(i18n),
      $store: { commit: jest.fn() },
      $apollo: {
        mutate: jest.fn().mockResolvedValue({
          data: { authentication: { forgotPassword: { responseResult: { succeeded: false, errorCode, message } } } }
        })
      }
    }

    await component.methods.forgotPasswordSubmit.call(ctx)

    expect(ctx.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({ message: expected }))
    expect(ctx.isLoading).toBe(false)
  })
})
