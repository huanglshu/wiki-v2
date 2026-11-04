const router = require('../../controllers/common')

const viewPage = router.stack.find(layer => layer.route && layer.route.path === '/*').route.stack[0].handle

describe('home page group redirect', () => {
  beforeEach(() => {
    global.WIKI = {
      config: { pageExtensions: [], lang: { code: 'zh', namespacing: true } },
      auth: {
        groups: { 1: { redirectOnLogin: '/zh/首页' } },
        getEffectivePermissions: () => ({ pages: { read: false } })
      },
      models: { pages: { getPage: jest.fn().mockResolvedValue(null) } }
    }
  })

  function request(path, user) {
    return {
      path,
      user,
      query: {},
      i18n: { changeLanguage: jest.fn() }
    }
  }

  function response() {
    return {
      locals: {},
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      cookie: jest.fn()
    }
  }

  it('redirects an authenticated user before the normal home route', async () => {
    const res = response()
    await viewPage(request('/', { id: 3, groups: [1] }), res, jest.fn())
    expect(res.redirect).toHaveBeenCalledWith('/zh/首页')
    expect(global.WIKI.models.pages.getPage).not.toHaveBeenCalled()
  })

  it('keeps the original home routing for guests', async () => {
    const res = response()
    await viewPage(request('/', { id: 2, groups: [1] }), res, jest.fn())
    expect(res.redirect).toHaveBeenCalledWith('/zh/home')
  })

  it('does not redirect a normal page', async () => {
    const res = response()
    await viewPage(request('/zh/guide', { id: 3, groups: [1] }), res, jest.fn())
    expect(res.redirect).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
