const fs = require('fs')
const path = require('path')
const os = require('os')
const yaml = require('js-yaml')
const knex = require('knex')

const dryRun = process.argv.includes('--dry-run')
const apply = process.argv.includes('--apply') || !dryRun

const readConfig = () => {
  const configPath = path.join(process.cwd(), 'config.yml')
  return yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
}

const dbConfig = readConfig().db
const db = knex({
  client: 'mysql2',
  connection: {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.pass,
    database: dbConfig.db
  },
  pool: { min: 0, max: 1 }
})

const missingPagesQuery = `
  SELECT
    id,
    path,
    title,
    contentType
  FROM pages
  WHERE CHAR_LENGTH(COALESCE(content, '')) = 0
    OR CHAR_LENGTH(COALESCE(render, '')) = 0
  ORDER BY id
`

const directHistoryQuery = `
  SELECT
    p.id AS pageId,
    p.path,
    p.title,
    h.id AS historyId,
    h.content,
    h.contentType,
    'direct-history' AS recoverySource
  FROM pages p
  JOIN pageHistory h ON h.id = (
    SELECT MAX(h2.id)
    FROM pageHistory h2
    WHERE h2.pageId = p.id
      AND CHAR_LENGTH(COALESCE(h2.content, '')) > 0
  )
  WHERE (CHAR_LENGTH(COALESCE(p.content, '')) = 0 OR CHAR_LENGTH(COALESCE(p.render, '')) = 0)
    AND CHAR_LENGTH(COALESCE(h.content, '')) > 0
  ORDER BY p.id
`

const exactPathHistoryQuery = `
  SELECT
    p.id AS pageId,
    p.path,
    p.title,
    h.id AS historyId,
    h.content,
    h.contentType,
    'exact-path-history' AS recoverySource
  FROM pages p
  JOIN pageHistory h ON h.id = (
    SELECT MAX(h2.id)
    FROM pageHistory h2
    WHERE h2.path = p.path
      AND CHAR_LENGTH(COALESCE(h2.content, '')) > 0
  )
  WHERE (CHAR_LENGTH(COALESCE(p.content, '')) = 0 OR CHAR_LENGTH(COALESCE(p.render, '')) = 0)
  ORDER BY p.id
`

const stats = async () => {
  const result = await db.raw(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN CHAR_LENGTH(COALESCE(content, '')) > 0 THEN 1 ELSE 0 END) AS withContent,
      SUM(CASE WHEN CHAR_LENGTH(COALESCE(render, '')) > 0 THEN 1 ELSE 0 END) AS withRender
    FROM pages
  `)
  return result[0][0]
}

;(async () => {
  const before = await stats()
  const missingPages = (await db.raw(missingPagesQuery))[0]
  const directRows = (await db.raw(directHistoryQuery))[0]
  const exactPathRows = (await db.raw(exactPathHistoryQuery))[0]
  const byPageId = new Map()
  for (const row of directRows) {
    byPageId.set(row.pageId, row)
  }
  for (const row of exactPathRows) {
    if (!byPageId.has(row.pageId)) {
      byPageId.set(row.pageId, row)
    }
  }
  const rows = [...byPageId.values()]
  const totalChars = rows.reduce((total, row) => total + row.content.length, 0)

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    before,
    missingPages: missingPages.length,
    missingPageIds: missingPages.map(page => page.id),
    restorablePages: rows.length,
    unrecoverablePageIds: missingPages
      .filter(page => !byPageId.has(page.id))
      .map(page => page.id),
    candidates: rows.map(row => ({
      pageId: row.pageId,
      path: row.path,
      historyId: row.historyId,
      source: row.recoverySource,
      chars: row.content.length
    })),
    totalChars
  }, null, 2))

  if (!apply) {
    await db.destroy()
    return
  }

  const backupPath = path.join(os.tmpdir(), `wiki-v2-pages-backup-${Date.now()}.json`)
  fs.writeFileSync(backupPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    pages: await db('pages')
      .select('id', 'path', 'title', 'content', 'render', 'toc', 'contentType')
      .whereIn('id', rows.map(row => row.pageId))
  }, null, 2))

  const restored = await db.transaction(async trx => {
    let updated = 0
    for (const row of rows) {
      updated += await trx('pages').where({ id: row.pageId }).update({
        content: row.content,
        contentType: row.contentType,
        render: null,
        toc: null
      })
    }
    return updated
  })

  console.log(JSON.stringify({
    backup: backupPath,
    restored,
    after: await stats()
  }, null, 2))

  if (process.argv.includes('--fill-empty')) {
    const fallback = await db('pages')
      .whereIn('id', missingPages.map(page => page.id))
      .whereRaw("CHAR_LENGTH(COALESCE(render, '')) = 0")
      .update({
        render: '<p></p>',
        toc: JSON.stringify([])
      })
    console.log(JSON.stringify({
      emptyRenderFallbacks: fallback,
      afterFallback: await stats()
    }, null, 2))
  }
  await db.destroy()
})().catch(async err => {
  console.error(err)
  await db.destroy()
  process.exitCode = 1
})
