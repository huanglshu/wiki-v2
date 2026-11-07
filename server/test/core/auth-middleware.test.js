const jwt = require('jsonwebtoken')
const { DateTime } = require('luxon')
const auth = require('../../core/auth')

describe('authentication middleware', () => {
  let req
  let res
  let next
  let passportResult

  beforeEach(() => {
    req = { path: '/zh/home', headers: {}, cookies: {}, get: jest.fn() }
    res = { set: jest.fn(), cookie: jest.fn() }
    next = jest.fn()
    passportResult = {}
    global.WIKI = {
      auth: {
        passport: {
          authenticate: jest.fn((strategy, options, callback) => () =>
            callback(passportResult.err, passportResult.user, passportResult.info)
          )
        },
        guest: { id: 2, permissions: [], groups: [], cacheExpiration: DateTime.utc().plus({ minutes: 1 }) },
        revocationList: { get: jest.fn() }
      },
      config: { auth: { tokenRenewal: '14d' } },
      models: { users: { refreshToken: jest.fn(), getGuestUser: jest.fn() } },
      logger: { warn: jest.fn() }
    }
  })

  it('passes passport errors to the error handler', async () => {
    const error = new Error('Authentication failed')
    passportResult.err = error

    await auth.authenticate(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(req.user).toBeUndefined()
  })

  it('passes token renewal errors to the error handler', async () => {
    const error = new Error('Database connection closed')
    const expired = new Error('Expired token')
    expired.name = 'TokenExpiredError'
    expired.expiredAt = new Date()
    passportResult.info = expired
    req.cookies.jwt = jwt.sign({ id: 7 }, 'test')
    global.WIKI.models.users.refreshToken.mockRejectedValue(error)

    await new Promise(resolve => {
      next = jest.fn(resolve)
      auth.authenticate(req, res, next)
    })

    expect(global.WIKI.models.users.refreshToken).toHaveBeenCalledWith(7)
    expect(next).toHaveBeenCalledWith(error)
    expect(req.user).toBeUndefined()
  })

  it('sets the guest user for unauthenticated requests', async () => {
    await auth.authenticate(req, res, next)

    expect(req.user).toBe(global.WIKI.auth.guest)
    expect(next).toHaveBeenCalledWith()
  })

  it('passes guest lookup errors to the error handler', async () => {
    const error = new Error('Guest lookup failed')
    global.WIKI.auth.guest.cacheExpiration = DateTime.utc().minus({ minutes: 1 })
    global.WIKI.models.users.getGuestUser.mockRejectedValue(error)

    await new Promise(resolve => {
      next = jest.fn(resolve)
      auth.authenticate(req, res, next)
    })

    expect(next).toHaveBeenCalledWith(error)
    expect(req.user).toBeUndefined()
  })
})
