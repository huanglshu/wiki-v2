const knex = {
  schema: {
    hasTable: jest.fn().mockResolvedValue(true)
  }
}

global.WIKI = {
  models: {
    knex
  }
}

const router = require('../../controllers/auth')

const logoutRoute = router.stack.find(layer => layer.route && layer.route.path === '/logout').route.stack[0].handle

describe('GET /logout', () => {
  beforeEach(() => {
    global.WIKI = {
      models: {
        knex,
        users: {
          logout: jest.fn().mockResolvedValue('/')
        }
      }
    }
  })

  it('clears the session cookie and prevents the logout response from being cached', async () => {
    const req = { logout: jest.fn() }
    const res = {
      set: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn()
    }

    await logoutRoute(req, res)

    expect(req.logout).toHaveBeenCalled()
    expect(res.clearCookie).toHaveBeenCalledWith('jwt')
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(res.set).toHaveBeenCalledWith('Clear-Site-Data', '"cache", "storage"')
    expect(res.redirect).toHaveBeenCalledWith('/')
  })
})
