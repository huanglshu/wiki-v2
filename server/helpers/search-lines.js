const _ = require('lodash')
const cheerio = require('cheerio')
const striptags = require('striptags')
const he = require('he')
const markdown = require('markdown-it')({ html: true })

/* global WIKI */

const resourceExtensions = 'png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff?|pdf|docx?|xlsx?|pptx?|odt|ods|odp|zip|rar|7z|tar|gz|mp3|mp4|wav|webm|mov|woff2?|ttf|otf'
const resourcePathPattern = new RegExp(`(?:https?:\\/\\/|\\/|\\.\\.?\\/)?[^\\s<>"'\\[\\]()|]*\\.(?:${resourceExtensions})(?:[?#][^\\s<>"'\\[\\]()|]*)?(?=$|[\\s<>"'\\[\\]()|,;])`, 'gi')
const resourceDirectoryPattern = /(?:https?:\/\/[^\s/]+)?\/(?:_assets|uploads)\/[^\s<>"'[\]()|]*/gi
const resourceTargetPattern = new RegExp(`\\.(?:${resourceExtensions})(?:[?#].*)?$`, 'i')

function isResourceTarget(target) {
  return resourceTargetPattern.test(target) || /^(?:https?:\/\/[^/]+)?\/(?:_assets|uploads)\//i.test(target)
}

function removeResourcePaths(text) {
  return String(text || '').replace(resourceDirectoryPattern, ' ').replace(resourcePathPattern, ' ')
}

function searchableLine(rawLine, env) {
  const tokens = markdown.parseInline(rawLine, env)[0].children || []
  const parts = []
  tokens.forEach(token => {
    if (token.type === 'link_open') {
      const target = token.attrGet('href') || ''
      if (!isResourceTarget(target)) {
        parts.push(target)
      }
    } else if (token.type === 'image') {
      parts.push(token.content)
    } else if (token.type === 'html_inline') {
      const $ = cheerio.load(token.content, null, false)
      $('a[href]').each((index, element) => {
        const target = $(element).attr('href')
        if (!isResourceTarget(target)) {
          parts.push(target)
        }
      })
      $('img[alt]').each((index, element) => parts.push($(element).attr('alt')))
      parts.push(striptags(token.content))
    } else if (token.type === 'text' || token.type === 'code_inline') {
      parts.push(token.content)
    }
  })
  return he.decode(removeResourcePaths(parts.join(' ')))
}

/**
 * Split a search query into non-empty literal terms.
 *
 * @param {String} rawQuery Search input
 * @returns {String[]} Normalized search terms
 */
function normalizeSearchTerms(rawQuery = '') {
  const trimmed = _.trim(String(rawQuery || ''))
  if (!trimmed) {
    return []
  }
  return trimmed.split(/\s+/).filter(Boolean)
}

/**
 * Escape SQL LIKE wildcard characters.
 *
 * @param {String} term Search term
 * @returns {String} Escaped term
 */
function escapeLikeTerm(term = '') {
  return String(term).replace(/[\\%_]/g, '\\$&')
}

/**
 * Convert rendered HTML into lines when raw source content is unavailable.
 *
 * @param {String} rawHtml Rendered HTML
 * @returns {String} Line-separated plain text
 */
function htmlToLines(rawHtml = '') {
  if (!rawHtml) {
    return ''
  }
  const withLineBreaks = String(rawHtml)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6]|pre|blockquote)\s*>/gi, '\n')
  return he.decode(striptags(withLineBreaks))
}

/**
 * Check whether candidate text contains every search term (case-insensitive).
 *
 * @param {String} text Candidate text
 * @param {String[]} lowerTerms Lowercased search terms
 * @returns {Boolean} True when all terms match
 */
function matchesAllTerms(text, lowerTerms) {
  if (!text || !lowerTerms.length) {
    return false
  }
  const lowerText = String(text).toLowerCase()
  return lowerTerms.every(term => lowerText.includes(term))
}

function getPageSearchableLines(page) {
  if (Array.isArray(page.searchLines)) {
    return page.searchLines
  }
  const sourceText = (typeof page.content === 'string' && page.content.length > 0) ?
    page.content :
    htmlToLines(page.render)
  if (!sourceText) {
    return []
  }
  const env = {}
  markdown.parse(sourceText, env)
  return sourceText.split(/\r?\n/).map(rawLine => {
    const lineText = _.trim(rawLine)
    return {
      raw: lineText,
      searchable: lineText ? searchableLine(lineText, env) : ''
    }
  })
}

/**
 * Extract line-by-line matches from a single page.
 *
 * @param {Object} page Page record
 * @param {String|String[]} queryOrTerms Raw query string or normalized terms
 * @returns {Object[]} Line match items compatible with PageSearchResult
 */
function extractPageLineMatches(page, queryOrTerms) {
  const terms = Array.isArray(queryOrTerms) ? queryOrTerms : normalizeSearchTerms(queryOrTerms)
  if (!page || !terms.length) {
    return []
  }

  const lowerTerms = terms.map(t => t.toLowerCase())
  const locale = page.locale || page.localeCode || ''
  const tags = Array.isArray(page.tags) ? page.tags : []
  const matches = []
  const lines = getPageSearchableLines(page)
  if (lines.length) {
    lines.forEach((line, idx) => {
      if (!line.raw) {
        return
      }
      if (matchesAllTerms(line.searchable, lowerTerms)) {
        matches.push({
          id: `${page.id}:${idx + 1}`,
          title: page.title,
          description: line.raw,
          path: page.path,
          locale,
          tags
        })
      }
    })
  }

  if (matches.length === 0) {
    const titleMatched = matchesAllTerms(page.title, lowerTerms)
    const descMatched = matchesAllTerms(page.description, lowerTerms)
    const pathMatched = matchesAllTerms(page.path, lowerTerms)

    if (titleMatched || descMatched || pathMatched) {
      const fallbackLine = descMatched ?
        _.trim(page.description) :
        (titleMatched ? _.trim(page.title) : _.trim(page.path))
      matches.push({
        id: String(page.id),
        title: page.title,
        description: fallbackLine,
        path: page.path,
        locale,
        tags
      })
    }
  }

  return matches
}

/**
 * Query published pages and return line-level exact substring matches.
 *
 * @param {String} q Search query
 * @param {Object} opts Optional filters (locale, path)
 * @returns {Promise<{results: Object[], suggestions: String[], totalHits: Number}>}
 */
async function queryPageLineMatches(q, opts = {}, candidateIds) {
  const terms = normalizeSearchTerms(q)
  if (!terms.length || (Array.isArray(candidateIds) && !candidateIds.length)) {
    return {
      results: [],
      suggestions: [],
      totalHits: 0
    }
  }

  const isPostgres = _.get(WIKI, 'config.db.type') === 'postgres'
  const likeOp = isPostgres ? 'ILIKE' : 'LIKE'

  const pages = await WIKI.models.pages.query()
    .column('pages.id', 'pages.title', 'pages.description', 'pages.path', 'pages.content', 'pages.render', 'pages.localeCode as locale')
    .withGraphJoined('tags')
    .modifyGraph('tags', builder => {
      builder.select('tag')
    })
    .where(builder => {
      builder.where('pages.isPublished', true)
      if (Array.isArray(candidateIds)) {
        builder.whereIn('pages.id', candidateIds)
      }
      if (opts && opts.locale) {
        builder.andWhere('pages.localeCode', opts.locale)
      }
      if (opts.scope === 'page') {
        builder.andWhere('pages.path', opts.path || '')
      } else if (opts.scope === 'folder' && opts.path) {
        builder.andWhere('pages.path', 'like', `${opts.path}/%`)
      } else if (!opts.scope && opts.path) {
        builder.andWhere('pages.path', 'like', `${opts.path}%`)
      }
      terms.forEach(term => {
        const pattern = `%${escapeLikeTerm(term)}%`
        builder.andWhere(builderSub => {
          builderSub.where('pages.title', likeOp, pattern)
          builderSub.orWhere('pages.description', likeOp, pattern)
          builderSub.orWhere('pages.path', likeOp, pattern)
          builderSub.orWhere('pages.content', likeOp, pattern)
        })
      })
    })

  const lowerTerms = terms.map(t => t.toLowerCase())
  const sortedPages = _.sortBy(pages, [
    page => (matchesAllTerms(page.title, lowerTerms) ? 0 : 1),
    'id'
  ])

  const results = []
  sortedPages.forEach(page => {
    if (opts.scope === 'page' && page.path !== opts.path) {
      return
    }
    if (opts.scope === 'folder' && opts.path && !page.path.startsWith(`${opts.path}/`)) {
      return
    }
    const pageMatches = extractPageLineMatches(page, terms)
    if (pageMatches.length) {
      results.push(...pageMatches)
    }
  })

  return {
    results,
    suggestions: [],
    totalHits: results.length
  }
}

module.exports = {
  normalizeSearchTerms,
  matchesAllTerms,
  getPageSearchableLines,
  extractPageLineMatches,
  queryPageLineMatches
}
