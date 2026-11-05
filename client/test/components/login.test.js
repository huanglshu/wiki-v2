/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')

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
