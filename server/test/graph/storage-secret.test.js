const { graphql } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')
const AuthDirective = require('../../graph/directives/auth')
const storage = require('../../graph/resolvers/storage')

const schema = makeExecutableSchema({
  typeDefs: `
    directive @auth(requires: [String]) on FIELD_DEFINITION
    type Query { storage: StorageQuery }
    type StorageQuery {
      targetSecret(targetKey: String!, configKey: String!): String @auth(requires: ["manage:system"])
    }
  `,
  resolvers: {
    Query: storage.Query,
    StorageQuery: {
      targetSecret: storage.StorageQuery.targetSecret
    }
  },
  schemaDirectives: { auth: AuthDirective }
})

describe('storage secret lookup', () => {
  let findById
  let select
  let query
  let response

  beforeEach(() => {
    findById = jest.fn().mockResolvedValue({
      config: {
        secretAccessKey: 'real-secret',
        region: 'us-east-1'
      }
    })
    select = jest.fn(() => ({ findById }))
    query = jest.fn(() => ({ select }))
    response = { setHeader: jest.fn() }
    global.WIKI = {
      data: {
        storage: [{
          key: 's3',
          props: {
            secretAccessKey: { sensitive: true },
            region: { sensitive: false }
          }
        }]
      },
      models: {
        storage: { query }
      }
    }
  })

  afterEach(() => {
    delete global.WIKI
  })

  function execute(user, configKey = 'secretAccessKey') {
    return graphql({
      schema,
      source: 'query ($targetKey: String!, $configKey: String!) { storage { targetSecret(targetKey: $targetKey, configKey: $configKey) } }',
      variableValues: { targetKey: 's3', configKey },
      contextValue: { req: { user }, res: response }
    })
  }

  it('returns a sensitive value without caching for a system administrator', async () => {
    const result = await execute({ permissions: ['manage:system'] })

    expect(result.errors).toBeUndefined()
    expect(result.data.storage.targetSecret).toBe('real-secret')
    expect(select).toHaveBeenCalledWith('config')
    expect(findById).toHaveBeenCalledWith('s3')
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })

  it.each([
    [null, 'Unauthorized'],
    [{ permissions: ['manage:api'] }, 'Forbidden']
  ])('rejects access without system management permission', async (user, message) => {
    const result = await execute(user)

    expect(result.errors[0].message).toBe(message)
    expect(query).not.toHaveBeenCalled()
  })

  it.each(['region', 'unknown'])('refuses to expose non-sensitive or unknown field %s', async configKey => {
    const result = await execute({ permissions: ['manage:system'] }, configKey)

    expect(result.errors[0].message).toBe('Invalid sensitive storage field')
    expect(query).not.toHaveBeenCalled()
  })

  it('returns an empty string for an empty sensitive value', async () => {
    findById.mockResolvedValueOnce({ config: { secretAccessKey: null } })

    const result = await execute({ permissions: ['manage:system'] })

    expect(result.errors).toBeUndefined()
    expect(result.data.storage.targetSecret).toBe('')
  })
})
