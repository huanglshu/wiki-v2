const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const mysql = require('mysql2/promise')
const fetch = require('node-fetch')
const proxyFromEnv = require('proxy-from-env')
const HttpsProxyAgent = require('https-proxy-agent')
const HttpProxyAgent = require('http-proxy-agent')

const ROOTPATH = path.resolve(__dirname, '..')

function parseArgs (argv) {
  return argv.reduce((args, arg) => {
    if (arg === '--all') {
      args.all = true
    } else if (arg.startsWith('--proxy=')) {
      args.proxy = arg.substring('--proxy='.length)
    } else if (arg.startsWith('--config=')) {
      args.config = arg.substring('--config='.length)
    }
    return args
  }, {})
}

function unwrapSetting (value) {
  if (value && typeof value === 'object' && Object.keys(value).length === 1 && Object.hasOwn(value, 'v')) {
    return value.v
  }
  return value
}

async function queryGraphQL (endpoint, agent, query, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables }),
    agent,
    timeout: 30000
  })
  if (!response.ok) {
    throw new Error(`Graph endpoint returned HTTP ${response.status}.`)
  }
  const payload = await response.json()
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors.map(err => err.message).join('; '))
  }
  return payload
}

function getLocaleStrings (strings) {
  return strings.reduce((result, row) => {
    if (row.key.includes('::')) {
      return result
    }
    result[row.key] = row.value || row.key
    return result
  }, {})
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  const configPath = path.resolve(ROOTPATH, args.config || 'config.yml')
  const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
  const db = config.db

  if (!db || !db.host || !db.user || !(db.db || db.database)) {
    throw new Error(`Database configuration is missing in ${configPath}.`)
  }

  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port || 3306,
    user: db.user,
    password: db.pass || '',
    database: db.db || db.database
  })

  let settings = {}
  try {
    const [rows] = await connection.query(
      "SELECT `key`, `value` FROM settings WHERE `key` IN ('graphEndpoint', 'lang', 'dataPath')"
    )
    settings = rows.reduce((result, row) => {
      result[row.key] = unwrapSetting(row.value)
      return result
    }, {})
  } finally {
    await connection.end()
  }

  const endpoint = settings.graphEndpoint || config.graphEndpoint || 'https://graph.requarks.io'
  const localeConfig = settings.lang || config.lang || {}
  const dataPath = settings.dataPath || config.dataPath || './data'
  const proxy = args.proxy || proxyFromEnv.getProxyForUrl(endpoint)
  const proxyAgent = proxy ?
    (new URL(endpoint).protocol === 'http:' ? new HttpProxyAgent(proxy) : new HttpsProxyAgent(proxy)) :
    undefined

  console.log(`Graph endpoint: ${endpoint}`)
  console.log(`Proxy: ${proxy || 'direct'}`)

  const localesPayload = await queryGraphQL(endpoint, proxyAgent, `{
    localization {
      locales {
        availability
        code
        name
        nativeName
        isRTL
      }
    }
  }`)
  const locales = localesPayload.data.localization.locales
  const localeCodes = args.all ?
    locales.map(locale => locale.code) :
    (localeConfig.namespacing ? localeConfig.namespaces : [localeConfig.code || 'en'])

  const outputDir = path.resolve(ROOTPATH, dataPath, 'sideload')
  await fs.ensureDir(outputDir)
  await fs.writeJson(path.join(outputDir, 'locales.json'), localesPayload, { spaces: 2 })

  for (const code of localeCodes) {
    const stringsPayload = await queryGraphQL(endpoint, proxyAgent, `query ($code: String!) {
      localization {
        strings(code: $code) {
          key
          value
        }
      }
    }`, { code })
    const strings = getLocaleStrings(stringsPayload.data.localization.strings)
    await fs.writeJson(path.join(outputDir, `${code}.json`), strings, { spaces: 2 })
    console.log(`Exported ${code} (${Object.keys(strings).length} strings)`)
  }

  console.log(`Offline locale packages written to ${outputDir}`)
}

main().catch(err => {
  console.error(err.message)
  process.exitCode = 1
})
