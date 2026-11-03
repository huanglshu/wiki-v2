const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const mysql = require('mysql2/promise')

const ROOTPATH = path.resolve(__dirname, '..')
const SOURCE_MODULE_DIRS = [
  { type: 'analytics', dir: path.resolve(ROOTPATH, 'server', 'modules', 'analytics') },
  { type: 'comments', dir: path.resolve(ROOTPATH, 'server', 'modules', 'comments') },
  { type: 'rendering', dir: path.resolve(ROOTPATH, 'server', 'modules', 'rendering') },
  { type: 'search', dir: path.resolve(ROOTPATH, 'server', 'modules', 'search') },
  { type: 'storage', dir: path.resolve(ROOTPATH, 'server', 'modules', 'storage') }
]

function flattenLocale (value, result = {}, trail = []) {
  for (const [key, item] of Object.entries(value || {})) {
    const current = [...trail, key]
    if (item && typeof item === 'object') {
      flattenLocale(item, result, current)
    } else {
      result[`${current[0]}:${current.slice(1).join('.')}`] = item
    }
  }
  return result
}

function getModuleSources () {
  const result = {}
  for (const { type, dir } of SOURCE_MODULE_DIRS) {
    for (const name of fs.readdirSync(dir)) {
      const sourcePath = path.join(dir, name, 'definition.yml')
      if (!fs.existsSync(sourcePath)) {
        continue
      }
      const definition = yaml.safeLoad(fs.readFileSync(sourcePath, 'utf8'))
      const base = `admin:modules.${type}.${String(definition.key).toLowerCase()}`
      result[`${base}.title`] = definition.title
      if (definition.description) {
        result[`${base}.description`] = definition.description
      }
      for (const [prop, value] of Object.entries(definition.props || {})) {
        const propBase = `${base}.props.${prop.toLowerCase()}`
        result[`${propBase}.title`] = value.title
        if (value.hint) {
          result[`${propBase}.hint`] = value.hint
        }
      }
      for (const [action, value] of Object.entries(definition.actions || {})) {
        const actionBase = `${base}.actions.${action.toLowerCase()}`
        result[`${actionBase}.label`] = value.label
        if (value.hint) {
          result[`${actionBase}.hint`] = value.hint
        }
      }
    }
  }
  return result
}

function buildFallbackValue (key) {
  const pathParts = key.split(':').slice(1).join(':').split('.')
  const label = pathParts.filter(part => !['props', 'actions', 'title', 'description', 'label', 'hint'].includes(part)).at(-1)
  return label ?
    label.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) :
    key
}

async function main () {
  const config = yaml.safeLoad(fs.readFileSync(path.resolve(ROOTPATH, 'config.yml'), 'utf8'))
  const db = config.db
  if (!db || !db.host || !db.user || !(db.db || db.database)) {
    throw new Error('Database configuration is missing in config.yml.')
  }

  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port || 3306,
    user: db.user,
    password: db.pass || '',
    database: db.db || db.database
  })

  try {
    const [rows] = await connection.query("SELECT strings FROM locales WHERE code = 'en' LIMIT 1")
    if (!rows[0] || !rows[0].strings) {
      throw new Error('English locale was not found in the database.')
    }

    const english = flattenLocale(rows[0].strings)
    const zh = JSON.parse(fs.readFileSync(path.resolve(ROOTPATH, 'data', 'sideload', 'zh.json'), 'utf8'))
    const moduleSources = getModuleSources()
    for (const key of Object.keys(zh)) {
      if (!(key in english)) {
        english[key] = moduleSources[key] || buildFallbackValue(key)
      }
    }

    fs.writeFileSync(
      path.resolve(ROOTPATH, 'data', 'sideload', 'en.json'),
      `${JSON.stringify(Object.fromEntries(Object.entries(english).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`
    )
    console.log(`Wrote ${Object.keys(english).length} English locale keys.`)
  } finally {
    await connection.end()
  }
}

main().catch(err => {
  console.error(err.message)
  process.exitCode = 1
})
