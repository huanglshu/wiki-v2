const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawnSync } = require('child_process')
const yaml = require('js-yaml')
const cheerio = require('cheerio')
const knex = require('knex')

const sourceHistoryId = Number(process.env.SOURCE_HISTORY_ID || 168)
const apply = process.argv.includes('--apply')
const inspect = process.argv.includes('--inspect')

const chapters = [
  { heading: 'OA启动', pageId: 7 },
  { heading: 'OA代码块', pageId: 40 },
  { heading: 'OA对接ERP', pageId: 39 },
  { heading: 'OA对接PS中间库', pageId: null },
  { heading: '定时器同步更新', pageId: 41 },
  { heading: '同步更新组织架构', pageId: 42 },
  { heading: '同步更新人力资源', pageId: 43 }
]

const config = yaml.safeLoad(
  fs.readFileSync(path.join(process.cwd(), 'config.yml'), 'utf8')
)
const db = knex({
  client: 'mysql2',
  connection: {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.pass,
    database: config.db.db
  },
  pool: { min: 0, max: 1 }
})

const escapeHtml = value => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const inspectChapters = sourceText => {
  const normalized = sourceText.replace(/\r\n?/g, '\n')
  const marker = '本文档使用MinDoc构建-'
  const markerIndexes = []
  let markerIndex = normalized.indexOf(marker)
  while (markerIndex >= 0) {
    markerIndexes.push(markerIndex)
    markerIndex = normalized.indexOf(marker, markerIndex + marker.length)
  }
  if (markerIndexes.length < chapters.length) {
    throw new Error('Could not find all MinDoc page markers')
  }

  const starts = markerIndexes.map(markerStart => {
    const lineEnd = normalized.indexOf('\n', markerStart)
    if (lineEnd < 0) {
      return null
    }
    const headingStart = lineEnd + 1
    const headingEnd = normalized.indexOf('\n', headingStart)
    const heading = normalized.slice(headingStart, headingEnd < 0 ? normalized.length : headingEnd).trim()
    return { heading, markerStart, headingStart }
  }).filter(Boolean)

  const chapterStarts = chapters
    .filter(chapter => chapter.pageId)
    .map(chapter => {
      const start = starts.find(item => item.heading === chapter.heading)
      if (!start) {
        throw new Error(`Could not find chapter: ${chapter.heading}`)
      }
      return { ...chapter, headingStart: start.headingStart, markerStart: start.markerStart }
    })
    .sort((a, b) => a.markerStart - b.markerStart)

  return chapterStarts.map((chapter, index) => {
    const next = chapterStarts[index + 1]
    const end = next ? next.markerStart : normalized.length
    const text = normalized
      .slice(chapter.headingStart + chapter.heading.length, end)
      .replace(/本文档使用MinDoc构建\s*-\s*\d+\s*-\s*/g, '')
      .trim()
    if (!text) {
      throw new Error(`Could not extract chapter: ${chapter.heading}`)
    }
    return {
      ...chapter,
      text,
      html: `<h1>${escapeHtml(chapter.heading)}</h1>\n<pre>${escapeHtml(text)}</pre>`
    }
  })
}

const main = async () => {
  const sourceResult = await db('pageHistory')
    .select('id', 'pageId', 'path', 'title', 'content')
    .where({ id: sourceHistoryId })
    .first()

  if (!sourceResult || !sourceResult.content) {
    throw new Error(`History record ${sourceHistoryId} has no content`)
  }

  const sourceText = cheerio.load(sourceResult.content)('pre').text()
  if (!sourceText) {
    throw new Error(`History record ${sourceHistoryId} has no preformatted text`)
  }

  const extracted = inspectChapters(sourceText)
  const expectedSamples = {
    39: 'OA对接ERP',
    40: 'OA代码块',
    41: 'Path : alpha-schedule',
    42: '常用参数',
    43: '参数 : isAllSynPost'
  }
  for (const [pageId, sample] of Object.entries(expectedSamples)) {
    const chapter = extracted.find(item => item.pageId === Number(pageId))
    const normalizedText = chapter ? chapter.text.replace(/\s+/g, ' ') : ''
    const normalizedSample = sample.replace(/\s+/g, ' ')
    if (!chapter || !normalizedText.includes(normalizedSample)) {
      throw new Error(`Chapter validation failed for page ${pageId}: missing "${sample}"`)
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    source: {
      historyId: sourceResult.id,
      pageId: sourceResult.pageId,
      path: sourceResult.path
    },
    chapters: extracted.map(chapter => ({
      pageId: chapter.pageId,
      heading: chapter.heading,
      chars: chapter.text.length
    }))
  }, null, 2))

  if (inspect) {
    for (const chapter of extracted) {
      console.log(`\n===== PAGE ${chapter.pageId}: ${chapter.heading} =====\n`)
      console.log(chapter.text.slice(0, 1500))
    }
  }

  if (!apply) {
    await db.destroy()
    return
  }

  const pageIds = extracted.map(chapter => chapter.pageId)
  const currentRows = await db('pages')
    .select('id', 'path', 'title', 'content', 'render', 'toc', 'contentType')
    .whereIn('id', pageIds)
  const backupPath = path.join(os.tmpdir(), `wiki-v2-oa-pages-backup-${Date.now()}.json`)
  fs.writeFileSync(backupPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    source: sourceResult,
    pages: currentRows
  }, null, 2))
  console.log(`Backup: ${backupPath}`)

  const restored = await db.transaction(async trx => {
    let updated = 0
    for (const chapter of extracted) {
      updated += await trx('pages')
        .where({ id: chapter.pageId })
        .whereRaw("CHAR_LENGTH(COALESCE(content, '')) = 0")
        .update({
          content: chapter.html,
          contentType: 'html',
          render: null,
          toc: null
        })
    }
    return updated
  })

  console.log(`Restored ${restored} pages`)
  await db.destroy()

  for (const chapter of extracted) {
    const result = spawnSync(
      process.execPath,
      ['server/core/worker.js', '--job=render-page', `--data=${chapter.pageId}`],
      { cwd: process.cwd(), stdio: 'inherit' }
    )
    if (result.status !== 0) {
      throw new Error(`Failed to render page ${chapter.pageId}`)
    }
  }
}

main().catch(async err => {
  console.error(err)
  await db.destroy()
  process.exitCode = 1
})
