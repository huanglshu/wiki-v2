const fs = require('fs')
const path = require('path')
const Knex = require('knex')
const { graphql, parse, print } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')
const AuthDirective = require('../../graph/directives/auth')
const asset = require('../../graph/resolvers/asset')
const errors = require('../../helpers/error')

const source = fs.readFileSync(path.join(__dirname, '../../graph/schemas/asset.graphql'), 'utf8')
const mutation = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AssetMutation')
const deleteFolderField = mutation.fields.find(field => field.name.value === 'deleteFolder')
const query = parse(source).definitions.find(definition => definition.name && definition.name.value === 'AssetQuery')
const folderEmptyField = query.fields.find(field => field.name.value === 'folderEmpty')
const schema = makeExecutableSchema({
  typeDefs: `
    directive @auth(requires: [String]) on FIELD_DEFINITION
    type Query { assets: AssetQuery }
    type AssetQuery { ${print(folderEmptyField)} }
    type Mutation { assets: AssetMutation }
    type AssetMutation { ${print(deleteFolderField)} }
    type DefaultResponse { responseResult: ResponseStatus }
    type ResponseStatus { succeeded: Boolean! errorCode: Int slug: String message: String }
  `,
  resolvers: {
    Query: asset.Query,
    Mutation: asset.Mutation,
    AssetQuery: { folderEmpty: asset.AssetQuery.folderEmpty },
    AssetMutation: { deleteFolder: asset.AssetMutation.deleteFolder }
  },
  schemaDirectives: { auth: AuthDirective }
})

describe('asset folder deletion', () => {
  let knex
  let checkAccess

  beforeEach(async () => {
    knex = Knex({ client: 'sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true })
    await knex.schema.createTable('assetFolders', table => {
      table.increments('id')
      table.string('slug')
      table.integer('parentId')
    })
    await knex.schema.createTable('assets', table => {
      table.increments('id')
      table.integer('folderId')
    })
    await knex('assetFolders').insert([{ id: 1, slug: 'parent', parentId: null }, { id: 2, slug: 'folder', parentId: 1 }])
    checkAccess = jest.fn().mockReturnValue(true)
    global.WIKI = {
      Error: errors,
      auth: { checkAccess },
      models: {
        knex,
        assetFolders: {
          getHierarchy: async id => {
            const folder = await knex('assetFolders').where({ id }).first()
            return folder ? [{ slug: 'parent' }, folder] : []
          }
        }
      }
    }
  })

  afterEach(async () => {
    await knex.destroy()
    delete global.WIKI
  })

  function execute(id, user = { permissions: ['manage:assets'] }) {
    return graphql({
      schema,
      source: 'mutation ($id: Int!) { assets { deleteFolder(id: $id) { responseResult { succeeded slug } } } }',
      variableValues: { id },
      contextValue: { req: { user } }
    })
  }

  function checkEmpty(id, user = { permissions: ['manage:assets'] }) {
    return graphql({
      schema,
      source: 'query ($id: Int!) { assets { folderEmpty(folderId: $id) } }',
      variableValues: { id },
      contextValue: { req: { user } }
    })
  }

  it('reports emptiness only for an existing folder with path access', async () => {
    expect((await checkEmpty(2)).data.assets.folderEmpty).toBe(true)
    expect((await checkEmpty(0)).data.assets.folderEmpty).toBe(false)
    expect((await checkEmpty(99)).data.assets.folderEmpty).toBe(false)
    checkAccess.mockReturnValue(false)
    expect((await checkEmpty(2)).data.assets.folderEmpty).toBe(false)
    expect((await checkEmpty(2, { permissions: ['read:assets'] })).errors[0].message).toBe('Forbidden')
  })

  it.each(['child', 'file'])('reports a folder containing a %s as nonempty', async kind => {
    if (kind === 'child') {
      await knex('assetFolders').insert({ id: 3, slug: 'child', parentId: 2 })
    } else {
      await knex('assets').insert({ folderId: 2 })
    }
    expect((await checkEmpty(2)).data.assets.folderEmpty).toBe(false)
  })

  it('deletes an empty folder after checking path permissions', async () => {
    const result = await execute(2)
    expect(result.data.assets.deleteFolder.responseResult.succeeded).toBe(true)
    expect(checkAccess).toHaveBeenCalledWith(expect.anything(), ['manage:assets'], { path: 'parent/folder' })
    expect(await knex('assetFolders').where({ id: 2 }).first()).toBeUndefined()
  })

  it.each(['child', 'file'])('rejects a folder containing a %s', async kind => {
    if (kind === 'child') {
      await knex('assetFolders').insert({ id: 3, slug: 'child', parentId: 2 })
    } else {
      await knex('assets').insert({ folderId: 2 })
    }
    const result = await execute(2)
    expect(result.data.assets.deleteFolder.responseResult.slug).toBe('AssetFolderNotEmpty')
    expect(await knex('assetFolders').where({ id: 2 }).first()).toBeDefined()
  })

  it.each([0, -1, 99])('rejects root and nonexistent folder id %i', async id => {
    const result = await execute(id)
    expect(result.data.assets.deleteFolder.responseResult.slug).toBe('AssetFolderInvalid')
  })

  it('rejects users without folder path access', async () => {
    checkAccess.mockReturnValue(false)
    const result = await execute(2)
    expect(result.data.assets.deleteFolder.responseResult.slug).toBe('AssetDeleteForbidden')
    expect(await knex('assetFolders').where({ id: 2 }).first()).toBeDefined()
  })

  it('rejects users without asset management permission', async () => {
    const result = await execute(2, { permissions: ['read:assets'] })
    expect(result.errors[0].message).toBe('Forbidden')
    expect(checkAccess).not.toHaveBeenCalled()
    expect(await knex('assetFolders').where({ id: 2 }).first()).toBeDefined()
  })
})
