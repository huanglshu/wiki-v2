const jwt = require('jsonwebtoken')
const { DateTime } = require('luxon')
const auth = require('../../core/auth')
const page = require('../../graph/resolvers/page')

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

  describe('user-bound API keys', () => {
    let account
    let findById

    beforeEach(() => {
      account = {
        id: 7,
        name: 'Editor',
        email: 'editor@example.com',
        isActive: true,
        isVerified: true,
        groups: [{ id: 3, permissions: ['read:pages', 'write:pages'] }],
        getGlobalPermissions() { return this.groups.flatMap(group => group.permissions) },
        getGroups() { return this.groups.map(group => group.id) }
      }
      const modifyGraph = jest.fn(async () => account)
      findById = jest.fn(() => ({ withGraphFetched: () => ({ modifyGraph }) }))
      global.WIKI.models.users.query = jest.fn(() => ({ findById }))
      global.WIKI.config.api = { isEnabled: true }
      global.WIKI.auth.validApiKeys = [42]
      global.WIKI.auth.groups = { 3: { pageRules: [
        { path: 'docs', roles: ['read:pages'], match: 'START', deny: false, locales: [] }
      ] } }
      passportResult.user = { api: 42, uid: 7 }
    })

    async function authenticate () {
      await new Promise(resolve => {
        next = jest.fn(resolve)
        auth.authenticate(req, res, next)
      })
    }

    it('uses the real user and current group permissions for access and page operations', async () => {
      await authenticate()
      expect(req.user).toMatchObject({ id: 7, name: 'Editor', groups: [3], permissions: ['read:pages', 'write:pages'] })
      expect(auth.checkAccess(req.user, ['read:pages'], { path: 'docs/page' })).toBe(true)
      expect(auth.checkAccess(req.user, ['read:pages'], { path: 'private/page' })).toBe(false)
      global.WIKI.models.pages = { createPage: jest.fn().mockResolvedValue({ id: 99 }) }
      await page.PageMutation.create(null, { path: 'docs/page' }, { req })
      expect(global.WIKI.models.pages.createPage).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({ id: 7 })
      }))

      account.groups = [{ id: 4, permissions: ['read:assets'] }]
      await authenticate()
      expect(req.user.groups).toEqual([4])
      expect(req.user.permissions).toEqual(['read:assets'])
      expect(auth.checkAccess(req.user, ['read:pages'], { path: 'docs/page' })).toBe(false)
    })

    it.each([
      ['legacy', { api: 42, grp: 1 }],
      ['guest', { api: 42, uid: 2 }],
      ['revoked', { api: 99, uid: 7 }]
    ])('rejects %s keys', async (label, payload) => {
      passportResult.user = payload
      await authenticate()
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(req.user).toBeUndefined()
      expect(findById).not.toHaveBeenCalled()
    })

    it.each([
      ['inactive', { isActive: false }],
      ['unverified', { isVerified: false }]
    ])('rejects a key for an %s user', async (label, state) => {
      Object.assign(account, state)
      await authenticate()
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(req.user).toBeUndefined()
    })

    it('rejects deleted users and propagates database failures', async () => {
      account = null
      await authenticate()
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      const error = new Error('database unavailable')
      global.WIKI.models.users.query.mockImplementation(() => { throw error })
      await authenticate()
      expect(next).toHaveBeenCalledWith(error)
    })

    it('does not renew expired API keys as user sessions', async () => {
      passportResult.user = null
      passportResult.info = Object.assign(new Error('expired'), { name: 'TokenExpiredError', expiredAt: new Date() })
      req.cookies.jwt = jwt.sign({ api: 42, uid: 7 }, 'test')
      await authenticate()
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(global.WIKI.models.users.refreshToken).not.toHaveBeenCalled()
    })
  })
})
