const fs = require('fs')
const path = require('path')
const { graphql, parse, print } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')
const AuthDirective = require('../../graph/directives/auth')
const authentication = require('../../graph/resolvers/authentication')

const source = fs.readFileSync(path.join(__dirname, '../../graph/schemas/authentication.graphql'), 'utf8')
const authQuery = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AuthenticationQuery')
const apiKeyField = authQuery.fields.find(field => field.name.value === 'apiKey')
const authMutation = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AuthenticationMutation')
const deleteApiKeyField = authMutation.fields.find(field => field.name.value === 'deleteApiKey')
const schema = makeExecutableSchema({
  typeDefs: `
    directive @auth(requires: [String]) on FIELD_DEFINITION
    type Query { authentication: AuthenticationQuery }
    type Mutation { authentication: AuthenticationMutation }
    type AuthenticationQuery { ${print(apiKeyField)} }
    type AuthenticationMutation { ${print(deleteApiKeyField)} }
    type DefaultResponse { responseResult: ResponseStatus }
    type ResponseStatus { succeeded: Boolean! errorCode: Int slug: String message: String }
  `,
  resolvers: {
    Query: authentication.Query,
    Mutation: authentication.Mutation,
    AuthenticationQuery: { apiKey: authentication.AuthenticationQuery.apiKey },
    AuthenticationMutation: { deleteApiKey: authentication.AuthenticationMutation.deleteApiKey }
  },
  schemaDirectives: { auth: AuthDirective }
})

describe('API key lookup authorization', () => {
  let findById
  let select
  let query
  let response
  let reloadApiKeys

  beforeEach(() => {
    findById = jest.fn().mockResolvedValue({ key: 'secret-token' })
    select = jest.fn(() => ({ findById }))
    query = jest.fn(() => ({ select }))
    response = { setHeader: jest.fn() }
    reloadApiKeys = jest.fn().mockResolvedValue()
    global.WIKI = {
      models: { apiKeys: { query } },
      auth: { reloadApiKeys },
      events: { outbound: { emit: jest.fn() } }
    }
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

describe('API key deletion', () => {
  let apiKeyQuery
  let findById
  let deleteById

  beforeEach(() => {
    findById = jest.fn()
    deleteById = jest.fn().mockResolvedValue(1)
    apiKeyQuery = jest.fn(() => ({ findById, deleteById }))
    global.WIKI = {
      models: { apiKeys: { query: apiKeyQuery } },
      auth: { reloadApiKeys: jest.fn().mockResolvedValue() },
      events: { outbound: { emit: jest.fn() } }
    }
  })

  afterEach(() => {
    delete global.WIKI
  })

  async function executeDelete (user) {
    return graphql({
      schema,
      source: 'mutation ($id: Int!) { authentication { deleteApiKey(id: $id) { responseResult { succeeded message } } } }',
      variableValues: { id: 42 },
      contextValue: { req: { user } }
    })
  }

  it('deletes a revoked key for an authorized administrator', async () => {
    findById.mockResolvedValue({ id: 42, name: 'Retired key', isRevoked: true })

    const result = await executeDelete({ permissions: ['manage:api'] })

    expect(result.errors).toBeUndefined()
    expect(result.data.authentication.deleteApiKey.responseResult.succeeded).toBe(true)
    expect(deleteById).toHaveBeenCalledWith(42)
    expect(global.WIKI.auth.reloadApiKeys).toHaveBeenCalled()
  })

  it('rejects deleting an active key even when the request bypasses the UI', async () => {
    findById.mockResolvedValue({ id: 42, name: 'Active key', isRevoked: false })

    const result = await executeDelete({ permissions: ['manage:api'] })

    expect(result.data.authentication.deleteApiKey.responseResult).toMatchObject({
      succeeded: false,
      message: 'Only revoked API keys can be deleted.'
    })
    expect(deleteById).not.toHaveBeenCalled()
    expect(global.WIKI.auth.reloadApiKeys).not.toHaveBeenCalled()
  })

  it('rejects deleting a missing key', async () => {
    findById.mockResolvedValue(undefined)

    const result = await executeDelete({ permissions: ['manage:api'] })

    expect(result.data.authentication.deleteApiKey.responseResult).toMatchObject({
      succeeded: false,
      message: 'API key not found.'
    })
    expect(deleteById).not.toHaveBeenCalled()
  })
})
