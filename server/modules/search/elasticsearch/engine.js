const _ = require('lodash')
const fs = require('fs')
const { pipeline } = require('node:stream/promises')
const { Transform } = require('node:stream')
const { randomUUID } = require('crypto')
const { getAnalysisSettings } = require('./analyzer')
const { withSearchIndexWrite, markSearchIndexDirty } = require('../../../helpers/search-index-write')
const { extractPageLineMatches, getPageSearchableLines, matchesAllTerms, normalizeSearchTerms } = require('../../../helpers/search-lines')

const INDEX_MARKER_ID = '__wiki_line_search_v2__'
const CONTROL_LOCK_ID = 'write-lock'
const CONTROL_STATE_ID = 'state'
const SEARCH_TIMEOUT = 3000
const WRITE_LOCK_WAIT = 5000
const SAFE_SEARCH_ERRORS = new Set([
  'Search index changed during the request',
  'Elasticsearch line-search index is unavailable',
  'Elasticsearch line-search index needs rebuilding',
  'Elasticsearch returned an incomplete search response',
  'Elasticsearch line-search index contains an invalid page',
  'Elasticsearch returned too many page candidates',
  'Elasticsearch did not return a scroll ID',
  'Search index is being updated or its state is unavailable',
  'Elasticsearch rejected one or more indexed pages',
  'Search index is busy; please retry',
  'Search index write lock ownership changed'
])

/* global WIKI */

module.exports = {
  async activate() {
    // not used
  },
  async deactivate() {
    // not used
  },
  /**
   * INIT
   */
  async init() {
    WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Initializing...`)
    switch (this.config.apiVersion) {
      case '8.x':
        const { Client: Client8 } = require('elasticsearch8')
        this.client = new Client8({
          nodes: this.config.hosts.split(',').map(_.trim),
          sniffOnStart: this.config.sniffOnStart,
          sniffInterval: (this.config.sniffInterval > 0) ? this.config.sniffInterval : false,
          tls: getTlsOptions(this.config),
          name: 'wiki-js'
        })
        break
      case '7.x':
        const { Client: Client7 } = require('elasticsearch7')
        this.client = new Client7({
          nodes: this.config.hosts.split(',').map(_.trim),
          sniffOnStart: this.config.sniffOnStart,
          sniffInterval: (this.config.sniffInterval > 0) ? this.config.sniffInterval : false,
          ssl: getTlsOptions(this.config),
          name: 'wiki-js'
        })
        break
      case '6.x':
        const { Client: Client6 } = require('elasticsearch6')
        this.client = new Client6({
          nodes: this.config.hosts.split(',').map(_.trim),
          sniffOnStart: this.config.sniffOnStart,
          sniffInterval: (this.config.sniffInterval > 0) ? this.config.sniffInterval : false,
          ssl: getTlsOptions(this.config),
          name: 'wiki-js'
        })
        break
      default:
        throw new Error('Unsupported version of elasticsearch! Update your settings in the Administration Area.')
    }

    await this.ensureControlIndex()

    // -> Create Search Index
    await this.createIndex()

    WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Initialization completed.`)
  },
  /**
   * Create Index
   */
  async createIndex() {
    try {
      const indexExists = await this.client.indices.exists({ index: this.config.indexName })
      // Elasticsearch 6.x / 7.x
      if (this.config.apiVersion !== '8.x' && !indexExists.body) {
        WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Creating index...`)
        const idxBody = {
          properties: {
            suggest: { type: 'completion' },
            title: { type: 'text', boost: 10.0 },
            description: { type: 'text', boost: 3.0 },
            content: { type: 'text', boost: 1.0 },
            pageId: { type: 'integer' },
            searchGrams: { type: 'keyword' },
            lineSchemaVersion: { type: 'integer' },
            searchLines: { type: 'object', enabled: false },
            permissionTags: { type: 'keyword' },
            isPublished: { type: 'boolean' },
            locale: { type: 'keyword' },
            path: { type: 'text' },
            tags: { type: 'text', boost: 8.0 }
          }
        }

        await this.client.indices.create({
          index: this.config.indexName,
          body: {
            mappings: (this.config.apiVersion === '6.x') ? {
              _doc: idxBody
            } : idxBody,
            settings: {
              analysis: getAnalysisSettings(this.config)
            }
          }
        })
      // Elasticsearch 8.x
      } else if (this.config.apiVersion === '8.x' && !indexExists) {
        WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Creating index...`)
        // 8.x Doesn't support boost in mappings, so we will need to boost at query time.
        const idxBody = {
          properties: {
            suggest: { type: 'completion' },
            title: { type: 'text' },
            description: { type: 'text' },
            content: { type: 'text' },
            pageId: { type: 'integer' },
            searchGrams: { type: 'keyword' },
            lineSchemaVersion: { type: 'integer' },
            searchLines: { type: 'object', enabled: false },
            permissionTags: { type: 'keyword' },
            isPublished: { type: 'boolean' },
            locale: { type: 'keyword' },
            path: { type: 'text' },
            tags: { type: 'text' }
          }
        }

        await this.client.indices.create({
          index: this.config.indexName,
          body: {
            mappings: idxBody,
            settings: {
              analysis: getAnalysisSettings(this.config)
            }
          }
        })
      }
    } catch (err) {
      const error = _.get(err, 'meta.body.error', err)
      WIKI.logger.error(`(SEARCH/ELASTICSEARCH) Index Create/Check Error: `, error)
      throw new Error(`Elasticsearch index create/check failed: ${getErrorMessage(error)}`)
    }
  },
  /**
   * QUERY
   *
   * @param {String} q Query
   * @param {Object} opts Additional options
   */
  async query(q, opts = {}) {
    const terms = normalizeSearchTerms(q)
    if (!terms.length) {
      return { results: [], suggestions: [], totalHits: 0 }
    }

    const requestId = randomUUID()
    const startedAt = process.hrtime.bigint()
    const logContext = {
      requestId,
      index: this.config.indexName,
      scope: opts.scope || 'global',
      locale: opts.locale || null
    }
    WIKI.logger.debug(`(SEARCH/ELASTICSEARCH) Search input: ${JSON.stringify({
      ...logContext,
      query: String(q).slice(0, 256),
      queryTruncated: String(q).length > 256,
      path: opts.path ? String(opts.path).slice(0, 256) : null
    })}`)
    let stage = 'fence_before'
    try {
      const epoch = await this.readSearchFence()
      stage = 'candidates'
      const candidateStartedAt = process.hrtime.bigint()
      const pages = await this.findCandidates(terms, requestId)
      const candidateMs = elapsedMilliseconds(candidateStartedAt)
      stage = 'fence_after'
      if (await this.readSearchFence() !== epoch) {
        throw new Error('Search index changed during the request')
      }
      stage = 'matching'
      const matchingStartedAt = process.hrtime.bigint()
      const lowerTerms = terms.map(term => term.toLowerCase())
      const filtered = pages.filter(page => {
        if (!page.isPublished || (opts.locale && page.locale !== opts.locale)) {
          return false
        }
        if (opts.scope === 'page') {
          return page.path === (opts.path || '')
        }
        if (opts.scope === 'folder' && opts.path) {
          return page.path.startsWith(`${opts.path}/`)
        }
        return !(!opts.scope && opts.path && !page.path.startsWith(opts.path))
      })
      const sorted = _.sortBy(filtered, [
        page => (matchesAllTerms(page.title, lowerTerms) ? 0 : 1),
        'id'
      ])
      const results = sorted.flatMap(page => extractPageLineMatches(page, terms))
      WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Search completed: ${JSON.stringify({
        ...logContext,
        candidatePages: pages.length,
        matchedLinesBeforePermission: results.length,
        candidateMs,
        matchingMs: elapsedMilliseconds(matchingStartedAt),
        totalMs: elapsedMilliseconds(startedAt)
      })}`)
      return { results, suggestions: [], totalHits: results.length }
    } catch (err) {
      WIKI.logger.warn(`(SEARCH/ELASTICSEARCH) Search unavailable: ${JSON.stringify({
        ...logContext,
        stage,
        totalMs: elapsedMilliseconds(startedAt),
        ...errorLogDetails(err)
      })}`)
      throw new Error('Search is temporarily unavailable')
    }
  },

  async findCandidates(terms, requestId) {
    if (!this.client) {
      throw new Error('Elasticsearch line-search index is unavailable')
    }

    const requestOptions = { requestTimeout: SEARCH_TIMEOUT, maxRetries: 0 }
    const markerResponse = await this.client.get({
      index: this.config.indexName,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: INDEX_MARKER_ID
    }, requestOptions)
    const marker = this.config.apiVersion === '8.x' ? markerResponse : markerResponse.body
    if (!marker || !marker.found || !marker._source || marker._source.lineSearchVersion !== 2) {
      throw new Error('Elasticsearch line-search index needs rebuilding')
    }
    this.lineIndexInvalid = false

    // Candidate grams are a prefilter; indexed lines are checked for exact matches.
    const grams = _.uniq(terms.flatMap(term => {
      const chars = Array.from(term.toLowerCase())
      if (chars.length < 2) {
        return [chars.join('')]
      }
      return [0, Math.floor((chars.length - 2) / 2), chars.length - 2]
        .map(offset => chars.slice(offset, offset + 2).join(''))
    })).slice(0, 64)
    const pages = []
    let scrollId
    try {
      const searchRequest = {
        index: this.config.indexName,
        scroll: '1m',
        allow_partial_search_results: false,
        body: {
          query: {
            bool: {
              should: [
                { bool: { filter: grams.map(gram => ({ term: { searchGrams: gram } })) } },
                {
                  bool: {
                    must_not: [
                      { exists: { field: 'lineSchemaVersion' } },
                      { ids: { values: [INDEX_MARKER_ID] } }
                    ]
                  }
                }
              ],
              minimum_should_match: 1
            }
          },
          sort: ['_doc'],
          size: 500,
          _source: ['pageId', 'locale', 'path', 'title', 'description', 'searchLines', 'permissionTags', 'isPublished', 'lineSchemaVersion']
        }
      }
      WIKI.logger.debug(`(SEARCH/ELASTICSEARCH) Search request: ${JSON.stringify({ requestId, ...searchRequest })}`)
      let response = await this.client.search(searchRequest, requestOptions)
      while (true) {
        const body = this.config.apiVersion === '8.x' ? response : response.body
        if (!body || body.timed_out || _.get(body, '_shards.failed', 0) > 0 || !_.isArray(_.get(body, 'hits.hits'))) {
          throw new Error('Elasticsearch returned an incomplete search response')
        }
        scrollId = body._scroll_id || scrollId
        const hits = body.hits.hits
        if (!hits.length) {
          break
        }
        for (const hit of hits) {
          const doc = hit._source
          if (!doc || doc.lineSchemaVersion !== 2 || !Number.isInteger(doc.pageId) ||
              !Array.isArray(doc.searchLines) || !Array.isArray(doc.permissionTags) ||
              !doc.permissionTags.every(tag => typeof tag === 'string') ||
              !doc.searchLines.every(line => line && typeof line.raw === 'string' && typeof line.searchable === 'string') ||
              typeof doc.locale !== 'string' || typeof doc.path !== 'string' ||
              typeof doc.title !== 'string' || typeof doc.isPublished !== 'boolean') {
            throw new Error('Elasticsearch line-search index contains an invalid page')
          }
          pages.push({
            id: doc.pageId,
            locale: doc.locale,
            path: doc.path,
            title: doc.title,
            description: doc.description,
            searchLines: doc.searchLines,
            tags: doc.permissionTags.map(tag => ({ tag })),
            isPublished: doc.isPublished
          })
          if (pages.length > 10000) {
            throw new Error('Elasticsearch returned too many page candidates')
          }
        }
        if (!scrollId) {
          throw new Error('Elasticsearch did not return a scroll ID')
        }
        response = await this.client.scroll({ scroll_id: scrollId, scroll: '1m' }, requestOptions)
      }
    } finally {
      if (scrollId) {
        try {
          await this.client.clearScroll({ scroll_id: scrollId }, requestOptions)
        } catch (err) {
          WIKI.logger.warn('(SEARCH/ELASTICSEARCH) Failed to clear search scroll: ', err.message)
        }
      }
    }
    return pages
  },

  controlIndexName() {
    return `${this.config.indexName}-line-control-v2`
  },

  async ensureControlIndex() {
    const index = this.controlIndexName()
    const response = await this.client.indices.exists({ index })
    const exists = this.config.apiVersion === '8.x' ? response : response.body
    if (!exists) {
      try {
        await this.client.indices.create({ index })
      } catch (err) {
        if (_.get(err, 'meta.body.error.type') !== 'resource_already_exists_exception') {
          throw err
        }
      }
    }
    try {
      await this.client.create({
        index,
        ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
        id: CONTROL_STATE_ID,
        body: { epoch: randomUUID() },
        refresh: true
      })
    } catch (err) {
      if (_.get(err, 'meta.statusCode') !== 409 && _.get(err, 'statusCode') !== 409) {
        throw err
      }
    }
  },

  async acquireWriteLock() {
    const owner = randomUUID()
    const index = this.controlIndexName()
    const deadline = Date.now() + WRITE_LOCK_WAIT
    while (true) {
      try {
        await this.client.create({
          index,
          ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
          id: CONTROL_LOCK_ID,
          body: { owner },
          refresh: true
        }, { requestTimeout: SEARCH_TIMEOUT, maxRetries: 0 })
        break
      } catch (err) {
        const status = _.get(err, 'meta.statusCode', err.statusCode)
        if (status !== 409) {
          throw err
        }
        if (Date.now() >= deadline) {
          throw new Error('Search index is busy; please retry')
        }
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    }
    try {
      await this.client.index({
        index,
        ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
        id: CONTROL_STATE_ID,
        body: { epoch: owner },
        refresh: true
      }, { requestTimeout: SEARCH_TIMEOUT, maxRetries: 0 })
    } catch (err) {
      try {
        await this.releaseWriteLock(owner)
      } catch (cleanupError) {
        WIKI.logger.error('(SEARCH/ELASTICSEARCH) Search index write lock requires recovery:', cleanupError)
      }
      throw err
    }
    return owner
  },

  async releaseWriteLock(owner) {
    const index = this.controlIndexName()
    const requestOptions = { requestTimeout: SEARCH_TIMEOUT, maxRetries: 0 }
    const response = await this.client.get({
      index,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: CONTROL_LOCK_ID
    }, requestOptions)
    const body = this.config.apiVersion === '8.x' ? response : response.body
    if (!body || !body.found || _.get(body, '_source.owner') !== owner ||
        !Number.isInteger(body._seq_no) || !Number.isInteger(body._primary_term)) {
      throw new Error('Search index write lock ownership changed')
    }
    await this.client.delete({
      index,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: CONTROL_LOCK_ID,
      if_seq_no: body._seq_no,
      if_primary_term: body._primary_term,
      refresh: true
    }, requestOptions)
  },

  async readSearchFence() {
    const index = this.controlIndexName()
    const requestOptions = { requestTimeout: SEARCH_TIMEOUT, maxRetries: 0 }
    const stateResponse = await this.client.get({
      index,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: CONTROL_STATE_ID
    }, requestOptions)
    const state = this.config.apiVersion === '8.x' ? stateResponse : stateResponse.body
    const lockResponse = await this.client.exists({
      index,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: CONTROL_LOCK_ID
    }, requestOptions)
    const locked = this.config.apiVersion === '8.x' ? lockResponse : lockResponse.body
    if (!state || !state.found || !_.get(state, '_source.epoch') || locked !== false) {
      throw new Error('Search index is being updated or its state is unavailable')
    }
    return state._source.epoch
  },

  async invalidateLineIndex() {
    this.lineIndexInvalid = true
    try {
      await this.client.delete({
        index: this.config.indexName,
        ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
        id: INDEX_MARKER_ID,
        refresh: true
      }, { requestTimeout: SEARCH_TIMEOUT, maxRetries: 0 })
    } catch (err) {
      if (_.get(err, 'meta.statusCode') !== 404 && _.get(err, 'statusCode') !== 404) {
        throw err
      }
    }
  },

  async runIndexOperation(action, page, operation) {
    const startedAt = process.hrtime.bigint()
    const logContext = {
      requestId: randomUUID(),
      index: this.config.indexName,
      action,
      pageId: page.id || null
    }
    WIKI.logger.debug(`(SEARCH/ELASTICSEARCH) Document input: ${JSON.stringify({
      ...logContext,
      path: page.path ? String(page.path).slice(0, 256) : null,
      destinationPath: page.destinationPath ? String(page.destinationPath).slice(0, 256) : null
    })}`)
    try {
      const response = await operation()
      const result = typeof response === 'string' ?
        response :
        _.get(response, this.config.apiVersion === '8.x' ? 'result' : 'body.result', null)
      WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Document operation completed: ${JSON.stringify({
        ...logContext,
        result,
        totalMs: elapsedMilliseconds(startedAt)
      })}`)
      return response
    } catch (err) {
      this.lineIndexInvalid = true
      WIKI.logger.warn(`(SEARCH/ELASTICSEARCH) Document operation failed: ${JSON.stringify({
        ...logContext,
        totalMs: elapsedMilliseconds(startedAt),
        ...errorLogDetails(err)
      })}`)
      throw err
    }
  },

  async deleteIndexedPage(id) {
    try {
      await this.client.delete({
        index: this.config.indexName,
        ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
        id,
        refresh: true
      })
      return 'deleted'
    } catch (err) {
      if (_.get(err, 'meta.body.result') !== 'not_found') {
        throw err
      }
      return 'not_found'
    }
  },

  /**
   * Build tags field
   * @param id
   * @returns {Promise<*|*[]>}
   */
  async buildTags(id) {
    const tags = await WIKI.models.pages.query().findById(id).select('*').withGraphJoined('tags')
    return (tags.tags && tags.tags.length > 0) ? tags.tags.map(function (tag) {
      return tag.tag
    }) : []
  },
  /**
   * Build suggest field
   */
  buildSuggest(page) {
    return _.reject(_.uniq(_.concat(
      page.title.split(' ').map(s => ({
        input: s,
        weight: 10
      })),
      page.description.split(' ').map(s => ({
        input: s,
        weight: 3
      })),
      page.safeContent.split(' ').map(s => ({
        input: s,
        weight: 1
      }))
    )), ['input', ''])
  },
  /**
   * CREATE
   *
   * @param {Object} page Page to create
   */
  async created(page) {
    await this.runIndexOperation('create', page, async () => this.client.index({
      index: this.config.indexName,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: page.hash,
      body: buildSearchDocument(page, await this.buildTags(page.id), this.buildSuggest(page)),
      refresh: true
    }))
  },
  /**
   * UPDATE
   *
   * @param {Object} page Page to update
   */
  async updated(page) {
    await this.runIndexOperation('update', page, async () => this.client.index({
      index: this.config.indexName,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: page.hash,
      body: buildSearchDocument(page, await this.buildTags(page.id), this.buildSuggest(page)),
      refresh: true
    }))
  },
  /**
   * DELETE
   *
   * @param {Object} page Page to delete
   */
  async deleted(page) {
    await this.runIndexOperation('delete', page, () => this.deleteIndexedPage(page.hash))
  },
  /**
   * RENAME
   *
   * @param {Object} page Page to rename
   */
  async renamed(page) {
    await this.runIndexOperation('rename', page, async () => {
      await this.deleteIndexedPage(page.hash)
      await this.client.index({
        index: this.config.indexName,
        ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
        id: page.destinationHash,
        body: buildSearchDocument({
          ...page,
          localeCode: page.destinationLocaleCode,
          path: page.destinationPath
        }, await this.buildTags(page.id), this.buildSuggest(page)),
        refresh: true
      })
      return 'renamed'
    })
  },
  /**
   * REBUILD INDEX
   */
  async rebuild() {
    const startedAt = process.hrtime.bigint()
    const logContext = { requestId: randomUUID(), index: this.config.indexName, action: 'rebuild' }
    WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Index rebuild started: ${JSON.stringify(logContext)}`)
    try {
      const indexedPages = await withSearchIndexWrite(() => this.rebuildWithIndexLock())
      WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Index rebuild completed: ${JSON.stringify({
        ...logContext,
        indexedPages,
        totalMs: elapsedMilliseconds(startedAt)
      })}`)
      return indexedPages
    } catch (err) {
      WIKI.logger.warn(`(SEARCH/ELASTICSEARCH) Index rebuild failed: ${JSON.stringify({
        ...logContext,
        totalMs: elapsedMilliseconds(startedAt),
        ...errorLogDetails(err)
      })}`)
      throw err
    }
  },

  async rebuildWithIndexLock() {
    this.lineIndexInvalid = true
    markSearchIndexDirty()
    try {
      await this.client.indices.delete({ index: this.config.indexName })
    } catch (err) {
      if (_.get(err, 'meta.statusCode') !== 404 && _.get(err, 'statusCode') !== 404) {
        throw err
      }
    }
    await this.createIndex()

    const MAX_INDEXING_BYTES = 10 * Math.pow(2, 20) - Buffer.from('[').byteLength - Buffer.from(']').byteLength // 10 MB
    const MAX_INDEXING_COUNT = 1000
    const COMMA_BYTES = Buffer.from(',').byteLength

    let chunks = []
    let bytes = 0
    let indexedPages = 0

    const processDocument = async (cb, doc) => {
      try {
        if (doc) {
          doc['tags'] = await this.buildTags(doc.realId)
          doc.safeContent = WIKI.models.pages.cleanHTML(doc.render)
          doc.searchDocument = buildSearchDocument({
            ...doc,
            id: doc.realId,
            localeCode: doc.locale,
            isPublished: true
          }, doc.tags, this.buildSuggest(doc))
          const docBytes = Buffer.byteLength(JSON.stringify(doc))
          // -> Current batch exceeds size limit, flush
          if (chunks.length && docBytes + COMMA_BYTES + bytes >= MAX_INDEXING_BYTES) {
            await flushBuffer()
          }

          if (chunks.length > 0) {
            bytes += COMMA_BYTES
          }
          bytes += docBytes
          chunks.push(doc)

          // -> Current batch exceeds count limit, flush
          if (chunks.length >= MAX_INDEXING_COUNT) {
            await flushBuffer()
          }
        } else {
          // -> End of stream, flush
          await flushBuffer()
        }
        cb()
      } catch (err) {
        cb(err)
      }
    }

    const flushBuffer = async () => {
      if (!chunks.length) {
        return
      }
      WIKI.logger.info(`(SEARCH/ELASTICSEARCH) Sending batch of ${chunks.length}...`)
      try {
        const bulkResult = await this.client.bulk({
          index: this.config.indexName,
          body: _.reduce(chunks, (result, doc) => {
            result.push({
              index: {
                _index: this.config.indexName,
                _id: doc.id,
                ...(this.config.apiVersion !== '8.x' && { _type: '_doc' })
              }
            })
            result.push(doc.searchDocument)
            return result
          }, []),
          refresh: true
        })
        const bulkBody = this.config.apiVersion === '8.x' ? bulkResult : bulkResult.body
        if (!bulkBody || bulkBody.errors || !Array.isArray(bulkBody.items) || bulkBody.items.length !== chunks.length) {
          throw new Error('Elasticsearch rejected one or more indexed pages')
        }
        indexedPages += chunks.length
      } catch (err) {
        WIKI.logger.warn(`(SEARCH/ELASTICSEARCH) Index batch failed: ${JSON.stringify(errorLogDetails(err))}`)
        throw err
      }
      chunks.length = 0
      bytes = 0
    }

    // Added real id in order to fetch page tags from the query
    await pipeline(
      WIKI.models.knex.column({ id: 'hash' }, 'path', { locale: 'localeCode' }, 'title', 'description', 'content', 'render', { realId: 'id' }).select().from('pages').where({
        isPublished: true
      }).stream(),
      new Transform({
        objectMode: true,
        transform: async (chunk, enc, cb) => processDocument(cb, chunk),
        flush: async (cb) => processDocument(cb)
      })
    )
    await this.client.index({
      index: this.config.indexName,
      ...(this.config.apiVersion !== '8.x' && { type: '_doc' }),
      id: INDEX_MARKER_ID,
      body: { lineSearchVersion: 2 },
      refresh: true
    })
    this.lineIndexInvalid = false
    return indexedPages
  }
}

function buildSearchGrams(page, lines) {
  const grams = new Set()
  // Include parsed lines as well as source so decoded text and link targets remain searchable.
  const values = [page.title, page.description, page.path, page.content]
    .concat(lines.map(line => line.searchable))
  for (const value of values) {
    const chars = Array.from(String(value || '').toLowerCase())
    for (let i = 0; i < chars.length; i++) {
      grams.add(chars[i])
      if (i + 1 < chars.length) {
        grams.add(chars[i] + chars[i + 1])
      }
    }
  }
  return [...grams]
}

function elapsedMilliseconds(startedAt) {
  return Math.round(Number(process.hrtime.bigint() - startedAt) / 10000) / 100
}

function errorLogDetails(err) {
  const error = err && typeof err === 'object' ? err : {}
  const type = _.get(error, 'meta.body.error.type') || error.code || error.name || 'Error'
  const statusCode = _.get(error, 'meta.statusCode', error.statusCode)
  return {
    errorType: typeof type === 'string' ? type.slice(0, 128) : 'Error',
    ...(Number.isInteger(statusCode) && { statusCode }),
    ...(SAFE_SEARCH_ERRORS.has(error.message) && { reason: error.message })
  }
}

function buildSearchDocument(page, tags, suggest) {
  const lines = getPageSearchableLines(page)
  return {
    suggest,
    tags,
    permissionTags: tags,
    locale: page.localeCode,
    path: page.path,
    title: page.title,
    description: page.description,
    content: page.safeContent,
    pageId: page.id,
    isPublished: page.isPublished === true || page.isPublished === 1,
    lineSchemaVersion: 2,
    searchLines: lines,
    searchGrams: buildSearchGrams(page, lines)
  }
}

function getTlsOptions(conf) {
  if (!conf.tlsCertPath) {
    return {
      rejectUnauthorized: conf.verifyTLSCertificate
    }
  }

  const caList = []
  if (conf.verifyTLSCertificate) {
    caList.push(fs.readFileSync(conf.tlsCertPath))
  }

  return {
    rejectUnauthorized: conf.verifyTLSCertificate,
    ca: caList
  }
}

function getErrorMessage(err) {
  if (_.isString(err)) {
    return err
  }
  return _.get(err, 'reason') || _.get(err, 'type') || _.get(err, 'message') || JSON.stringify(err)
}
