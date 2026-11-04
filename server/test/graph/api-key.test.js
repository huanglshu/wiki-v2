const fs = require('fs')
const path = require('path')
const { graphql, parse, print } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')
const AuthDirective = require('../../graph/directives/auth')
const authentication = require('../../graph/resolvers/authentication')

const source = fs.readFileSync(path.join(__dirname, '../../graph/schemas/authentication.graphql'), 'utf8')
const authQuery = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AuthenticationQuery')
const apiKeyField = authQuery.fields.find(field => field.name.value === 'apiKey')
const schema = makeExecutableSchema({
  typeDefs: `
    directive @auth(requires: [String]) on FIELD_DEFINITION
    type Query { authentication: AuthenticationQuery }
    type AuthenticationQuery { ${print(apiKeyField)} }
  `,
  resolvers: {
    Query: authentication.Query,
    AuthenticationQuery: { apiKey: authentication.AuthenticationQuery.apiKey }
  },
  schemaDirectives: { auth: AuthDirective }
})

describe('API key lookup authorization', () => {
  let findById
  let select
  let query
  let response

  beforeEach(() => {
    findById = jest.fn().mockResolvedValue({ key: 'secret-token' })
    select = jest.fn(() => ({ findById }))
    query = jest.fn(() => ({ select }))
    response = { setHeader: jest.fn() }
    global.WIKI = { models: { apiKeys: { query } } }
  })

  afterEach(() => {
    delete global.WIKI
  })

  function execute(user) {
    return graphql({
      schema,
      source: 'query ($id: Int!) { authentication { apiKey(id: $id) } }',
      variableValues: { id: 42 },
      contextValue: { req: { user }, res: response }
    })
  }

  it.each(['manage:system', 'manage:api'])('allows %s and prevents response caching', async permission => {
    const result = await execute({ permissions: [permission] })

    expect(result.errors).toBeUndefined()
    expect(result.data.authentication.apiKey).toBe('secret-token')
    expect(select).toHaveBeenCalledWith('key')
    expect(findById).toHaveBeenCalledWith(42)
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })

  it.each([
    [null, 'Unauthorized'],
    [{ permissions: ['read:pages'] }, 'Forbidden']
  ])('rejects access without API management permission', async (user, message) => {
    const result = await execute(user)

    expect(result.errors[0].message).toBe(message)
    expect(query).not.toHaveBeenCalled()
  })

  it('returns no key for missing or unfinished entries', async () => {
    findById.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ key: 'pending' })

    expect((await execute({ permissions: ['manage:api'] })).data.authentication.apiKey).toBeNull()
    expect((await execute({ permissions: ['manage:api'] })).data.authentication.apiKey).toBeNull()
  })
})
