/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const translations = require('../../../../data/sideload/zh.json')

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-api-create.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(require, componentModule, componentModule.exports)
const component = componentModule.exports.default

describe('API key user selection', () => {
  it('renders a user selector instead of group and full-access controls', () => {
    const template = pug.render(sfc.template.content)
    expect(template).toContain('v-autocomplete')
    expect(template).toContain('v-model="userId"')
    expect(template).not.toContain('v-model="fullAccess"')
    expect(template).not.toContain('v-model="group"')
    expect(translations['admin:ui.api.boundUser']).toBeTruthy()
    expect(component.methods.userText({ name: 'Editor', email: 'editor@example.com' })).toBe('Editor (editor@example.com)')
  })

  it('requires a user and sends the selected user ID to GraphQL', async () => {
    const context = {
      name: 'Integration',
      expiration: '1y',
      userId: null,
      loading: false,
      $t: key => translations[key] || key,
      $store: { commit: jest.fn() },
      $apollo: { mutate: jest.fn().mockResolvedValue({
        data: { authentication: { createApiKey: { responseResult: { succeeded: false, message: 'No' } } } }
      }) }
    }
    await component.methods.generate.call(context)
    expect(context.$apollo.mutate).not.toHaveBeenCalled()
    expect(context.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: expect.objectContaining({ message: translations['admin:ui.api.boundUserError'] })
    }))

    context.userId = 7
    await component.methods.generate.call(context)
    const request = context.$apollo.mutate.mock.calls[0][0]
    expect(request.variables).toEqual({ name: 'Integration', expiration: '1y', userId: 7 })
    expect(request.mutation.loc.source.body).toContain('userId: $userId')
    expect(request.mutation.loc.source.body).not.toContain('fullAccess')
  })
})
