const fs = require('fs')
const path = require('path')
const { graphql, parse, print } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')
const AuthDirective = require('../../graph/directives/auth')
const authentication = require('../../graph/resolvers/authentication')
const jwt = require('jsonwebtoken')
const ownToken = jwt.sign({ api: 42, uid: 7 }, 'test')

const source = fs.readFileSync(path.join(__dirname, '../../graph/schemas/authentication.graphql'), 'utf8')
const authQuery = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AuthenticationQuery')
const apiKeyField = authQuery.fields.find(field => field.name.value === 'apiKey')
const authMutation = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AuthenticationMutation')
const deleteApiKeyField = authMutation.fields.find(field => field.name.value === 'deleteApiKey')
const createApiKeyField = authMutation.fields.find(field => field.name.value === 'createApiKey')
const schema = makeExecutableSchema({
  typeDefs: `
    directive @auth(requires: [String]) on FIELD_DEFINITION
    type Query { authentication: AuthenticationQuery }
    type Mutation { authentication: AuthenticationMutation }
    type AuthenticationQuery { ${print(apiKeyField)} }
    type AuthenticationMutation { ${print(deleteApiKeyField)} ${print(createApiKeyField)} }
    type AuthenticationCreateApiKeyResponse { responseResult: ResponseStatus key: String }
    type DefaultResponse { responseResult: ResponseStatus }
    type ResponseStatus { succeeded: Boolean! errorCode: Int slug: String message: String }
  `,
  resolvers: {
    Query: authentication.Query,
    Mutation: authentication.Mutation,
    AuthenticationQuery: { apiKey: authentication.AuthenticationQuery.apiKey },
    AuthenticationMutation: {
      deleteApiKey: authentication.AuthenticationMutation.deleteApiKey,
      createApiKey: authentication.AuthenticationMutation.createApiKey
    }
  },
  schemaDirectives: { auth: AuthDirective }
})

describe('user-bound API key creation', () => {
  let findById
  let createNewKey

  beforeEach(() => {
    findById = jest.fn().mockResolvedValue({ id: 7, isActive: true, isVerified: true })
    createNewKey = jest.fn().mockResolvedValue('new-key')
    global.WIKI = {
      models: {
        users: { query: () => ({ findById }) },
        apiKeys: { createNewKey }
      },
      auth: { reloadApiKeys: jest.fn().mockResolvedValue() },
      events: { outbound: { emit: jest.fn() } }
    }
  })

  afterEach(() => { delete global.WIKI })

  function execute (user, userId) {
    return graphql({
      schema,
      source: `mutation ($userId: Int!) {
        authentication {
          createApiKey(name: "Integration", expiration: "1y", userId: $userId) {
            key responseResult { succeeded message }
          }
        }
      }`,
      variableValues: { userId },
      contextValue: { req: { user } }
    })
  }

  it('allows an API manager to bind their own user', async () => {
    const result = await execute({ id: 7, permissions: ['manage:api'] }, 7)
    expect(result.data.authentication.createApiKey).toMatchObject({ key: 'new-key', responseResult: { succeeded: true } })
    expect(createNewKey).toHaveBeenCalledWith({ name: 'Integration', expiration: '1y', userId: 7 })
  })

  it('prevents an API manager from impersonating another user', async () => {
    const result = await execute({ id: 8, permissions: ['manage:api'] }, 7)
    expect(result.data.authentication.createApiKey.responseResult.succeeded).toBe(false)
    expect(createNewKey).not.toHaveBeenCalled()
    expect(findById).not.toHaveBeenCalled()
  })

  it('allows administrators to select another active user but never the guest', async () => {
    const admin = { id: 1, permissions: ['manage:system'] }
    expect((await execute(admin, 7)).data.authentication.createApiKey.responseResult.succeeded).toBe(true)
    createNewKey.mockClear()
    expect((await execute(admin, 2)).data.authentication.createApiKey.responseResult.succeeded).toBe(false)
    expect(createNewKey).not.toHaveBeenCalled()
  })

  it.each([null, { isActive: false, isVerified: true }, { isActive: true, isVerified: false }])(
    'rejects missing or unavailable accounts: %p', async account => {
      findById.mockResolvedValue(account)
      const result = await execute({ id: 1, permissions: ['manage:system'] }, 7)
      expect(result.data.authentication.createApiKey.responseResult.succeeded).toBe(false)
      expect(createNewKey).not.toHaveBeenCalled()
    }
  )
})

describe('API key lookup authorization', () => {
  let findById
  let select
  let query
  let response
  let reloadApiKeys

  beforeEach(() => {
    findById = jest.fn().mockResolvedValue({ key: ownToken })
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
    const result = await execute({ id: 7, permissions: [permission] })

    expect(result.errors).toBeUndefined()
    expect(result.data.authentication.apiKey).toBe(ownToken)
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

  it('does not expose another user’s key to an API manager', async () => {
    const result = await execute({ id: 8, permissions: ['manage:api'] })
    expect(result.data.authentication.apiKey).toBeNull()
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
    findById.mockResolvedValue({ id: 42, name: 'Retired key', isRevoked: true, key: ownToken })

    const result = await executeDelete({ id: 7, permissions: ['manage:api'] })

    expect(result.errors).toBeUndefined()
    expect(result.data.authentication.deleteApiKey.responseResult.succeeded).toBe(true)
    expect(deleteById).toHaveBeenCalledWith(42)
    expect(global.WIKI.auth.reloadApiKeys).toHaveBeenCalled()
  })

  it('deletes an active key and reloads the authentication caches', async () => {
    findById.mockResolvedValue({ id: 42, name: 'Active key', isRevoked: false, key: ownToken })

    const result = await executeDelete({ id: 7, permissions: ['manage:api'] })

    expect(result.data.authentication.deleteApiKey.responseResult.succeeded).toBe(true)
    expect(deleteById).toHaveBeenCalledWith(42)
    expect(global.WIKI.auth.reloadApiKeys).toHaveBeenCalled()
    expect(global.WIKI.events.outbound.emit).toHaveBeenCalledWith('reloadApiKeys')
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

  it.each([false, true])('does not allow deleting another user’s key when revoked is %s', async isRevoked => {
    findById.mockResolvedValue({ id: 42, isRevoked, key: ownToken })
    const result = await executeDelete({ id: 8, permissions: ['manage:api'] })
    expect(result.data.authentication.deleteApiKey.responseResult.succeeded).toBe(false)
    expect(deleteById).not.toHaveBeenCalled()
  })

  it('allows a system administrator to delete an unbound legacy key', async () => {
    findById.mockResolvedValue({ id: 42, isRevoked: true, key: jwt.sign({ api: 42, grp: 1 }, 'test') })
    const result = await executeDelete({ id: 1, permissions: ['manage:system'] })
    expect(result.data.authentication.deleteApiKey.responseResult.succeeded).toBe(true)
    expect(deleteById).toHaveBeenCalledWith(42)
  })
})

describe('API key revocation authorization', () => {
  afterEach(() => { delete global.WIKI })

  it('prevents an API manager from revoking another user’s key', async () => {
    const patch = jest.fn()
    global.WIKI = {
      models: { apiKeys: { query: () => ({ findById: () => ({ then: resolve => resolve({ key: ownToken }), patch }) }) } },
      auth: { reloadApiKeys: jest.fn() },
      events: { outbound: { emit: jest.fn() } }
    }
    const result = await authentication.AuthenticationMutation.revokeApiKey(
      null, { id: 42 }, { req: { user: { id: 8, permissions: ['manage:api'] } } }
    )
    expect(result.responseResult.succeeded).toBe(false)
    expect(patch).not.toHaveBeenCalled()
  })
})
