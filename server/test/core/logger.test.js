const { DateTime } = require('luxon')
const { LEVEL, MESSAGE } = require('triple-beam')
const loggerFactory = require('../../core/logger')

describe('logger timestamps', () => {
  let logger

  afterEach(() => {
    if (logger) {
      logger.close()
      logger = null
    }
    jest.restoreAllMocks()
  })

  it.each([
    ['2026-11-07T17:52:40.184Z', '2026-11-08 01:52:40'],
    ['2026-12-31T16:00:00.000Z', '2027-01-01 00:00:00']
  ])('formats console logs in Asia/Shanghai for %s', (utc, expected) => {
    jest.spyOn(DateTime, 'local').mockReturnValue(DateTime.fromISO(utc, { zone: 'utc' }))
    global.WIKI = { config: { logLevel: 'info', logFormat: 'default' } }
    logger = loggerFactory.init('MASTER')

    const info = logger.format.transform({ level: 'warn', message: 'test message', [LEVEL]: 'warn' })

    expect(info.timestamp).toBe(expected)
    expect(info[MESSAGE]).toContain(`${expected} [MASTER]`)
    expect(info[MESSAGE]).toContain('test message')
  })

  it('uses the same format in JSON logs', () => {
    jest.spyOn(DateTime, 'local').mockReturnValue(DateTime.fromISO('2026-11-07T17:52:40.184Z', { zone: 'utc' }))
    global.WIKI = { config: { logLevel: 'info', logFormat: 'json' } }
    logger = loggerFactory.init('MASTER')

    const info = logger.format.transform({ level: 'warn', message: 'test message', [LEVEL]: 'warn' })
    const output = JSON.parse(info[MESSAGE])

    expect(output.timestamp).toBe('2026-11-08 01:52:40')
    expect(output.label).toBe('MASTER')
    expect(output.level).toBe('warn')
    expect(output.message).toBe('test message')
  })
})
