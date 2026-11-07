const router = require('../../controllers/common')

const viewPage = router.stack.find(layer => layer.route && layer.route.path === '/*').route.stack[0].handle

describe('document navigation response', () => {
  let page
  let permissions
  let req
  let res
  let next

  beforeEach(() => {
    page = {
      id: 7,
      localeCode: 'zh',
      path: 'folder/page',
      title: 'Page',
      description: 'Description',
      tags: [],
      isPublished: true,
      contentType: 'markdown',
      toc: '[]',
      render: '<p>Document</p>',
      extra: { css: '', js: '' }
    }
    permissions = { pages: { read: true, write: false } }
    global.WIKI = {
      config: {
        pageExtensions: [],
        lang: { code: 'zh', namespacing: true },
        features: { featurePageComments: false }
      },
      auth: {
        groups: {},
        getEffectivePermissions: jest.fn(() => permissions)
      },
      models: { pages: { getPage: jest.fn().mockResolvedValue(page) } },
      data: { commentProvider: {} }
    }
    req = {
      path: '/zh/folder/page',
      user: { id: 3, groups: [] },
      query: {},
      get: jest.fn(header => header === 'X-Wiki-Page-Navigation' ? '1' : ''),
      i18n: { changeLanguage: jest.fn(), dir: () => 'ltr' }
    }
    res = {
      locals: {},
      set: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      cookie: jest.fn()
    }
    next = jest.fn()
  })

  it('returns only permitted page data without source content', async () => {
    page.content = 'private source'
    await viewPage(req, res, next)

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store')
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      softNavigation: true,
      effectivePermissions: permissions,
      page: expect.objectContaining({
        id: 7,
        path: 'folder/page',
        render: '<p>Document</p>',
        filename: 'zh/folder/page.md'
      })
    }))
    expect(res.json.mock.calls[0][0].page.content).toBeUndefined()
    expect(next).not.toHaveBeenCalled()
  })

  it('does not expose page content without read permission', async () => {
    permissions.pages.read = false
    await viewPage(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).not.toHaveBeenCalled()
  })

  it('does not expose unpublished pages to readers without write permission', async () => {
    page.isPublished = false
    await viewPage(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).not.toHaveBeenCalled()
  })

  it.each([
    ['page scripts', () => { page.extra.js = 'alert(1)' }],
    ['page styles', () => { page.extra.css = 'p { color: red }' }],
    ['tabsets', () => { page.render = '<tabset></tabset>' }],
    ['external comments', () => {
      global.WIKI.config.features.featurePageComments = true
      global.WIKI.data.commentProvider.codeTemplate = true
    }]
  ])('requires a full load for %s', async (name, setup) => {
    setup()
    await viewPage(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      softNavigation: false,
      page: null,
      effectivePermissions: null
    })
  })
})
