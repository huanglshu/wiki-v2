const fs = require('fs')
const path = require('path')
const { graphql, parse, print } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')
const AuthDirective = require('../../graph/directives/auth')
const asset = require('../../graph/resolvers/asset')

const source = fs.readFileSync(path.join(__dirname, '../../graph/schemas/asset.graphql'), 'utf8')
const assetQuery = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AssetQuery')
const field = assetQuery.fields.find(item => item.name.value === 'uploadMaxFileSize')
const schema = makeExecutableSchema({
  typeDefs: `
    directive @auth(requires: [String]) on FIELD_DEFINITION
    type Query { assets: AssetQuery }
    type AssetQuery { ${print(field)} }
  `,
  resolvers: {
    Query: asset.Query,
    AssetQuery: { uploadMaxFileSize: asset.AssetQuery.uploadMaxFileSize }
  },
  schemaDirectives: { auth: AuthDirective }
})

describe('asset upload size limit', () => {
  beforeEach(() => {
    global.WIKI = { config: { uploads: { maxFileSize: 10485760 } } }
  })

  afterEach(() => {
    delete global.WIKI
  })

  const execute = permissions => graphql({
    schema,
    source: '{ assets { uploadMaxFileSize } }',
    contextValue: { req: { user: { permissions } } }
  })

  it.each(['write:assets', 'manage:system'])('returns the current size to %s', async permission => {
    const result = await execute([permission])
    expect(result.errors).toBeUndefined()
    expect(result.data.assets.uploadMaxFileSize).toBe(10485760)
    global.WIKI.config.uploads.maxFileSize = 1234
    expect((await execute([permission])).data.assets.uploadMaxFileSize).toBe(1234)
  })

  it('rejects users without upload permission', async () => {
    const result = await execute(['read:assets'])
    expect(result.errors[0].message).toBe('Forbidden')
  })
})
