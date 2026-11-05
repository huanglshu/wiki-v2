/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')

const source = fs.readFileSync(path.join(__dirname, '../../store/index.js'), 'utf8')
const code = babel.transformSync(source, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const moduleExports = { exports: {} }
const commit = jest.fn()
const localRequire = name => {
  if (name === 'vuex-pathify') {
    return {
      default: { plugin: {} },
      make: { mutations: () => ({}) }
    }
  }
  if (name === 'vue') {
    return { use: jest.fn() }
  }
  if (name === 'vuex') {
    return {
      Store: function (opts) {
        this.mutations = opts.mutations
        this.commit = commit
      }
    }
  }
  if (name === './page' || name === './site' || name === './user') {
    return { __esModule: true, default: {} }
  }
  if (name === '../helpers/notification-message') {
    return {
      getLocalizedNotificationMarker: message => {
        return /Please use virtual hosted style to access/i.test(message || '') ?
          'i18n:common:error.storageS3Endpoint' :
          message
      }
    }
  }
  return require(name)
}
runInThisContext(`(function (require, module, exports, WIKI) {\n${code}\n})`)(localRequire, moduleExports, moduleExports.exports, { $store: { commit } })
const store = moduleExports.exports.default

describe('store graph errors', () => {
  it('marks S3 endpoint failures for localized display', () => {
    store.mutations.pushGraphError({}, {
      graphQLErrors: [{ message: 'Please use virtual hosted style to access.' }]
    })

    expect(commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: 'i18n:common:error.storageS3Endpoint'
    }))
  })
})
