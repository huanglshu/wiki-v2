/* eslint-env jest */

jest.mock('../../../helpers/search-lines', () => ({
  extractPageLineMatches: jest.requireActual('../../../helpers/search-lines').extractPageLineMatches,
  getPageSearchableLines: jest.requireActual('../../../helpers/search-lines').getPageSearchableLines,
  matchesAllTerms: jest.requireActual('../../../helpers/search-lines').matchesAllTerms,
  normalizeSearchTerms: jest.requireActual('../../../helpers/search-lines').normalizeSearchTerms,
  queryPageLineMatches: jest.fn()
}))
jest.mock('node:stream', () => require('stream'), { virtual: true })
jest.mock('node:stream/promises', () => require('stream').promises, { virtual: true })

const { Readable } = require('stream')
const { queryPageLineMatches } = require('../../../helpers/search-lines')
const engine = require('../../../modules/search/elasticsearch/engine')

describe('modules/search/elasticsearch/engine', () => {
  let instance
  let client

  beforeEach(() => {
    jest.clearAllMocks()
    client = {
      get: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      search: jest.fn(),
      scroll: jest.fn(),
      clearScroll: jest.fn().mockResolvedValue({}),
      index: jest.fn().mockResolvedValue({}),
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [{}] }),
      indices: { delete: jest.fn().mockResolvedValue({}) }
    }
    instance = Object.assign({}, engine, {
      config: { apiVersion: '8.x', indexName: 'wiki' },
      client,
      readSearchFence: jest.fn().mockResolvedValue('epoch-1'),
      buildTags: jest.fn().mockResolvedValue([])
    })
    global.WIKI = {
      logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
      models: { pages: { cleanHTML: jest.fn(value => value) } }
    }
    queryPageLineMatches.mockResolvedValue({ results: [], suggestions: [], totalHits: 0 })
  })

  afterEach(() => {
    delete global.WIKI
  })

  it.each(['6.x', '7.x', '8.x'])('uses all Elasticsearch candidates with client %s', async version => {
    instance.config.apiVersion = version
    const wrap = body => version === '8.x' ? body : { body }
    client.get.mockResolvedValue(wrap({ found: true, _source: { lineSearchVersion: 2 } }))
    client.search.mockResolvedValue(wrap({
      _scroll_id: 'scroll-1',
      _shards: { failed: 0 },
      hits: { hits: [{ _source: makeDocument(7, 'docs/a', 'CAS 合同') }] }
    }))
    client.scroll.mockResolvedValueOnce(wrap({
      _scroll_id: 'scroll-2',
      _shards: { failed: 0 },
      hits: { hits: [{ _source: makeDocument(9, 'docs/b', 'CAS 合同') }] }
    })).mockResolvedValueOnce(wrap({
      _scroll_id: 'scroll-2',
      _shards: { failed: 0 },
      hits: { hits: [] }
    }))

    const opts = { scope: 'folder', locale: 'zh', path: 'docs' }
    const result = await instance.query('CAS 合同', opts)

    expect(client.search.mock.calls[0][0].body.query.bool.should[0].bool.filter).toEqual([
      { term: { searchGrams: 'ca' } },
      { term: { searchGrams: 'as' } },
      { term: { searchGrams: '合同' } }
    ])
    expect(result.results.map(item => item.id)).toEqual(['7:1', '9:1'])
    expect(result.results[0].tags).toEqual([{ tag: 'private' }])
    expect(queryPageLineMatches).not.toHaveBeenCalled()
    expect(client.clearScroll).toHaveBeenCalledWith({ scroll_id: 'scroll-2' }, expect.any(Object))
  })

  it('fails closed without database fallback when the index marker is missing', async () => {
    client.get.mockRejectedValue(new Error('not found'))
    const opts = { scope: 'global' }
    await expect(instance.query('CAS', opts)).rejects.toThrow('Search is temporarily unavailable')
    expect(client.search).not.toHaveBeenCalled()
    expect(queryPageLineMatches).not.toHaveBeenCalled()
  })

  it('fails closed and clears the scroll on a partial Elasticsearch response', async () => {
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({
      _scroll_id: 'scroll-1',
      _shards: { failed: 0 },
      hits: { hits: [{ _source: makeDocument(7, 'docs/a', 'CAS') }] }
    })
    client.scroll.mockResolvedValue({ _shards: { failed: 1 }, hits: { hits: [] } })
    await expect(instance.query('CAS', {})).rejects.toThrow('Search is temporarily unavailable')
    expect(queryPageLineMatches).not.toHaveBeenCalled()
    expect(client.clearScroll).toHaveBeenCalled()
  })

  it('fails closed when a document was written without the new index fields', async () => {
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({
      _scroll_id: 'scroll-1',
      _shards: { failed: 0 },
      hits: { hits: [{ _source: {} }] }
    })
    await expect(instance.query('CAS', {})).rejects.toThrow('Search is temporarily unavailable')
    expect(queryPageLineMatches).not.toHaveBeenCalled()
    expect(client.clearScroll).toHaveBeenCalled()
  })

  it('rejects a search when the index changes while it is running', async () => {
    instance.readSearchFence.mockResolvedValueOnce('old').mockResolvedValueOnce('new')
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({ _shards: { failed: 0 }, hits: { hits: [] } })
    await expect(instance.query('CAS', {})).rejects.toThrow('Search is temporarily unavailable')
    expect(queryPageLineMatches).not.toHaveBeenCalled()
  })

  it('rejects a search while a shared write lock exists', async () => {
    instance.readSearchFence = engine.readSearchFence
    client.get.mockResolvedValue({ found: true, _source: { epoch: 'epoch-1' } })
    client.exists.mockResolvedValue(true)
    await expect(instance.query('CAS', {})).rejects.toThrow('Search is temporarily unavailable')
    expect(client.search).not.toHaveBeenCalled()
  })

  it('creates a shared write lock and changes the search epoch before writing', async () => {
    client.create.mockResolvedValue({})
    await instance.acquireWriteLock()
    expect(client.create.mock.calls[0][0]).toMatchObject({ index: 'wiki-line-control-v2', id: 'write-lock' })
    expect(client.index.mock.calls[0][0]).toMatchObject({ index: 'wiki-line-control-v2', id: 'state' })
    expect(client.index.mock.calls[0][0].body.epoch).toBe(client.create.mock.calls[0][0].body.owner)
  })

  it('retries when another writer temporarily holds the lock', async () => {
    client.create.mockRejectedValueOnce({ meta: { statusCode: 409 } }).mockResolvedValueOnce({})
    await instance.acquireWriteLock()
    expect(client.create).toHaveBeenCalledTimes(2)
    expect(client.index).toHaveBeenCalledTimes(1)
  })

  it('does not release a lock owned by another writer', async () => {
    client.get.mockResolvedValue({ found: true, _version: 1, _source: { owner: 'other' } })
    client.delete = jest.fn()
    await expect(instance.releaseWriteLock('owner')).rejects.toThrow('ownership changed')
    expect(client.delete).not.toHaveBeenCalled()
  })

  it('releases the lock with ES sequence-number concurrency checks', async () => {
    client.get.mockResolvedValue({ found: true, _seq_no: 3, _primary_term: 2, _source: { owner: 'owner' } })
    client.delete = jest.fn().mockResolvedValue({})
    await instance.releaseWriteLock('owner')
    expect(client.delete.mock.calls[0][0]).toMatchObject({
      index: 'wiki-line-control-v2', id: 'write-lock', if_seq_no: 3, if_primary_term: 2
    })
  })

  it('filters scope and unpublished pages using only ES data', async () => {
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({
      _scroll_id: 'scroll-1',
      _shards: { failed: 0 },
      hits: { hits: [
        { _source: makeDocument(7, 'docs/a', 'CAS') },
        { _source: makeDocument(8, 'docs-other/b', 'CAS') },
        { _source: { ...makeDocument(9, 'docs/c', 'CAS'), isPublished: false } }
      ] }
    })
    client.scroll.mockResolvedValue({ _scroll_id: 'scroll-1', _shards: { failed: 0 }, hits: { hits: [] } })
    const result = await instance.query('CAS', { scope: 'folder', path: 'docs', locale: 'zh' })
    expect(result.results.map(item => item.id)).toEqual(['7:1'])
    expect(queryPageLineMatches).not.toHaveBeenCalled()
  })

  it('logs timings and counts without search content at info level', async () => {
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({
      _scroll_id: 'scroll-1',
      _shards: { failed: 0 },
      hits: { hits: [{ _source: makeDocument(7, 'docs/private', 'CAS secret') }] }
    })
    client.scroll.mockResolvedValue({ _scroll_id: 'scroll-1', _shards: { failed: 0 }, hits: { hits: [] } })
    await instance.query('CAS', { scope: 'folder', path: 'docs', locale: 'zh' })

    const message = global.WIKI.logger.info.mock.calls[0][0]
    const details = JSON.parse(message.split('Search completed: ')[1])
    expect(details).toMatchObject({
      index: 'wiki',
      scope: 'folder',
      locale: 'zh',
      candidatePages: 1,
      matchedLinesBeforePermission: 1
    })
    expect(details.candidateMs).toEqual(expect.any(Number))
    expect(details.matchingMs).toEqual(expect.any(Number))
    expect(details.totalMs).toEqual(expect.any(Number))
    expect(message).not.toContain('CAS')
    expect(message).not.toContain('docs/private')
    expect(message).not.toContain('secret')

    const input = JSON.parse(global.WIKI.logger.debug.mock.calls[0][0].split('Search input: ')[1])
    const request = JSON.parse(global.WIKI.logger.debug.mock.calls[1][0].split('Search request: ')[1])
    expect(input).toMatchObject({ requestId: details.requestId, query: 'CAS', path: 'docs' })
    expect(request.requestId).toBe(details.requestId)
    expect(request.body.query.bool.should[0].bool.filter).toEqual([
      { term: { searchGrams: 'ca' } },
      { term: { searchGrams: 'as' } }
    ])
  })

  it('logs the failing stage and elapsed time without the query text', async () => {
    instance.readSearchFence.mockRejectedValue(new Error('ES unavailable'))
    await expect(instance.query('private-search', { scope: 'global' })).rejects.toThrow('Search is temporarily unavailable')
    const message = global.WIKI.logger.warn.mock.calls[0][0]
    const details = JSON.parse(message.split('Search unavailable: ')[1])
    expect(details).toMatchObject({ index: 'wiki', scope: 'global', stage: 'fence_before' })
    expect(details.totalMs).toEqual(expect.any(Number))
    expect(message).not.toContain('private-search')
  })

  it('returns exact line matches and metadata fallbacks from indexed data', async () => {
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({
      _scroll_id: 'scroll-1',
      _shards: { failed: 0 },
      hits: { hits: [
        { _source: { ...makeDocument(7, 'docs/a', 'CASH'), title: 'CAS Guide' } },
        { _source: { ...makeDocument(8, 'docs/b', 'unrelated'), title: 'CAS Guide' } },
        { _source: makeDocument(9, 'docs/c', 'unrelated') }
      ] }
    })
    client.scroll.mockResolvedValue({ _scroll_id: 'scroll-1', _shards: { failed: 0 }, hits: { hits: [] } })
    const result = await instance.query('CAS', {})
    expect(result.results.map(item => item.id)).toEqual(['7:1', '8'])
    expect(result.totalHits).toBe(2)
    expect(queryPageLineMatches).not.toHaveBeenCalled()
  })

  it('rejects malformed indexed permission tags', async () => {
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({
      _scroll_id: 'scroll-1',
      _shards: { failed: 0 },
      hits: { hits: [{ _source: { ...makeDocument(7, 'docs/a', 'CAS'), permissionTags: [null] } }] }
    })
    await expect(instance.query('CAS', {})).rejects.toThrow('Search is temporarily unavailable')
  })

  it('indexes raw source and metadata as case-insensitive substring candidates', async () => {
    const page = {
      id: 7,
      hash: 'hash-7',
      title: 'Guide',
      description: '',
      path: 'docs/CAS',
      localeCode: 'zh',
      content: '[Link](/docs/合同)\nCASH\n&#233;',
      isPublished: true,
      safeContent: 'Link CASH'
    }
    await instance.created(page)
    const doc = client.index.mock.calls[0][0].body
    expect(doc.pageId).toBe(7)
    expect(doc.searchGrams).toEqual(expect.arrayContaining(['ca', 'as', '合同', '/d', 'h', 'é']))
    expect(doc.searchGrams).not.toContain('CA')
    expect(doc.searchLines[1]).toEqual({ raw: 'CASH', searchable: 'CASH' })
    expect(doc.lineSchemaVersion).toBe(2)
  })

  it('updates candidates for changed content and renamed paths', async () => {
    const page = {
      id: 7,
      hash: 'old',
      destinationHash: 'new',
      title: 'Guide',
      description: '',
      path: 'docs/old',
      destinationPath: 'docs/new',
      localeCode: 'zh',
      destinationLocaleCode: 'zh',
      content: 'new content',
      isPublished: true,
      safeContent: 'new content'
    }
    client.delete = jest.fn().mockResolvedValue({})

    await instance.updated(page)
    expect(client.index.mock.calls[0][0].body.searchGrams).toEqual(expect.arrayContaining(['co', 'nt']))
    await instance.renamed(page)
    const renamed = client.index.mock.calls[1][0]
    expect(renamed.id).toBe('new')
    expect(renamed.body.searchGrams).toEqual(expect.arrayContaining(['/n', 'ne', 'ew']))
  })

  it('logs create, update, delete and rename without document contents at info level', async () => {
    const page = {
      id: 7,
      hash: 'old',
      destinationHash: 'new',
      title: 'Confidential',
      description: '',
      path: 'private/source',
      destinationPath: 'private/target',
      localeCode: 'zh',
      destinationLocaleCode: 'zh',
      content: 'secret document contents',
      isPublished: true,
      safeContent: 'secret document contents'
    }
    client.index.mockResolvedValue({ result: 'updated' })
    client.delete = jest.fn().mockResolvedValue({})
    await instance.created(page)
    await instance.updated(page)
    await instance.deleted(page)
    await instance.renamed(page)

    const messages = global.WIKI.logger.info.mock.calls.map(call => call[0])
    const details = messages.map(message => JSON.parse(message.split('Document operation completed: ')[1]))
    expect(details.map(item => item.action)).toEqual(['create', 'update', 'delete', 'rename'])
    expect(details.map(item => item.result)).toEqual(['updated', 'updated', 'deleted', 'renamed'])
    details.forEach(item => {
      expect(item).toMatchObject({ index: 'wiki', pageId: 7 })
      expect(item.totalMs).toEqual(expect.any(Number))
      expect(item.requestId).toEqual(expect.any(String))
    })
    expect(messages.join(' ')).not.toContain('secret')
    expect(messages.join(' ')).not.toContain('private/source')
    const input = JSON.parse(global.WIKI.logger.debug.mock.calls[3][0].split('Document input: ')[1])
    expect(input).toMatchObject({ action: 'rename', path: 'private/source', destinationPath: 'private/target' })
    expect(input).not.toHaveProperty('content')
  })

  it('logs failed document operations without exposing the ES error body', async () => {
    const page = {
      id: 7,
      hash: 'page-7',
      title: 'Guide',
      description: '',
      path: 'docs',
      content: 'secret document contents',
      safeContent: 'secret document contents',
      isPublished: true
    }
    client.index.mockRejectedValue({
      meta: { statusCode: 400, body: { error: { type: 'mapper_parsing_exception', reason: 'secret document contents' } } }
    })
    await expect(instance.created(page)).rejects.toBeDefined()

    const message = global.WIKI.logger.warn.mock.calls[0][0]
    const details = JSON.parse(message.split('Document operation failed: ')[1])
    expect(details).toMatchObject({
      index: 'wiki',
      action: 'create',
      pageId: 7,
      errorType: 'mapper_parsing_exception',
      statusCode: 400
    })
    expect(message).not.toContain('secret document contents')
    expect(global.WIKI.logger.warn.mock.calls[0]).toHaveLength(1)
  })

  it('allows deleting a page that was not present in the index', async () => {
    client.delete = jest.fn().mockRejectedValue({ meta: { body: { result: 'not_found' } } })
    await expect(instance.deleted({ hash: 'unpublished' })).resolves.toBeUndefined()
    expect(instance.lineIndexInvalid).not.toBe(true)
    const message = global.WIKI.logger.info.mock.calls[0][0]
    expect(JSON.parse(message.split('Document operation completed: ')[1]).result).toBe('not_found')
  })

  it('does not ignore a missing ES index when deleting a page', async () => {
    client.delete = jest.fn().mockRejectedValue({ meta: { body: { error: { type: 'index_not_found_exception' } } } })
    await expect(instance.deleted({ hash: 'page' })).rejects.toBeDefined()
    expect(instance.lineIndexInvalid).toBe(true)
  })

  it('disables ES candidates after an indexing error', async () => {
    client.index.mockRejectedValue(new Error('connection lost'))
    await expect(instance.created({
      id: 7, hash: 'hash-7', title: 'Guide', description: '', path: 'docs', content: 'CAS', safeContent: 'CAS'
    })).rejects.toThrow('connection lost')
    client.get.mockRejectedValue(new Error('index unavailable'))
    await expect(instance.query('CAS', {})).rejects.toThrow('Search is temporarily unavailable')
    expect(queryPageLineMatches).not.toHaveBeenCalled()
  })

  it('resumes after another instance rebuilds the shared index', async () => {
    instance.lineIndexInvalid = true
    client.get.mockResolvedValue({ found: true, _source: { lineSearchVersion: 2 } })
    client.search.mockResolvedValue({ _shards: { failed: 0 }, hits: { hits: [] } })
    await expect(instance.query('CAS', {})).resolves.toEqual({ results: [], suggestions: [], totalHits: 0 })
    expect(instance.lineIndexInvalid).toBe(false)
  })

  it('marks the index ready only after all published pages were indexed', async () => {
    const pages = [{
      id: 'hash-7',
      realId: 7,
      title: 'Guide',
      description: '',
      path: 'docs',
      locale: 'zh',
      content: 'CAS',
      render: 'CAS'
    }]
    const stream = jest.fn(() => Readable.from(pages))
    const where = jest.fn(() => ({ stream }))
    const from = jest.fn(() => ({ where }))
    const select = jest.fn(() => ({ from }))
    global.WIKI.models.knex = { column: jest.fn(() => ({ select })) }
    instance.createIndex = jest.fn()

    await instance.rebuild()
    expect(where).toHaveBeenCalledWith({ isPublished: true })
    expect(client.bulk.mock.calls[0][0].body[1]).toMatchObject({ pageId: 7, searchGrams: expect.arrayContaining(['ca', 'as']) })
    expect(client.index.mock.calls[0][0]).toMatchObject({ id: '__wiki_line_search_v2__', body: { lineSearchVersion: 2 } })
    expect(instance.lineIndexInvalid).toBe(false)
    const message = global.WIKI.logger.info.mock.calls.map(call => call[0])
      .find(line => line.includes('Index rebuild completed: '))
    expect(JSON.parse(message.split('Index rebuild completed: ')[1])).toMatchObject({ action: 'rebuild', indexedPages: 1 })
  })

  it('does not mark an index ready when a bulk item fails', async () => {
    const page = { id: 'hash-7', realId: 7, title: 'Guide', description: '', path: 'docs', locale: 'zh', content: 'CAS', render: 'CAS' }
    const stream = () => Readable.from([page])
    global.WIKI.models.knex = { column: () => ({ select: () => ({ from: () => ({ where: () => ({ stream }) }) }) }) }
    instance.createIndex = jest.fn()
    client.bulk.mockResolvedValue({ errors: true })

    await expect(instance.rebuild()).rejects.toThrow('rejected one or more')
    expect(client.index).not.toHaveBeenCalled()
    expect(instance.lineIndexInvalid).toBe(true)
    const message = global.WIKI.logger.warn.mock.calls.map(call => call[0])
      .find(line => line.includes('Index rebuild failed: '))
    expect(JSON.parse(message.split('Index rebuild failed: ')[1])).toMatchObject({
      action: 'rebuild',
      reason: 'Elasticsearch rejected one or more indexed pages'
    })
  })
})

function makeDocument(id, path, text) {
  return {
    pageId: id,
    path,
    title: 'Guide',
    description: '',
    locale: 'zh',
    isPublished: true,
    lineSchemaVersion: 2,
    permissionTags: ['private'],
    searchLines: [{ raw: text, searchable: text }]
  }
}
