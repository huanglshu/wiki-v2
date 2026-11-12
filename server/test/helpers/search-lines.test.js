/* eslint-env jest */

const {
  normalizeSearchTerms,
  extractPageLineMatches,
  queryPageLineMatches
} = require('../../helpers/search-lines')

describe('server/helpers/search-lines', () => {
  it('normalizes search terms by whitespace', () => {
    expect(normalizeSearchTerms('  合同   管理  ')).toEqual(['合同', '管理'])
    expect(normalizeSearchTerms('   ')).toEqual([])
  })

  it('extracts exact substring line matches with 1-based line numbers and ignores pinyin false positives', () => {
    const svnPage = {
      id: 8,
      title: 'SVN数据',
      description: 'HR自助接口',
      path: '人事系统（PS）/SVN数据',
      locale: 'zh',
      content: [
        '# HR自助IScript 接口调用文档',
        'http://ehr-ps.gdalpha.com:8001/psc',
        '包含公共账户 alphasso 会话认证逻辑'
      ].join('\n')
    }

    expect(extractPageLineMatches(svnPage, '哈哈')).toEqual([])

    const contractPage = {
      id: 21,
      title: '合同档案接口配置清单',
      description: '接口字段定义',
      path: '办公系统（OA）/合同档案接口配置清单',
      locale: 'zh',
      content: [
        '> 来源：档案项目开发及配置清单工作簿的「合同」工作表。',
        '',
        '普通说明文字不包含关键词',
        '| companyCode | 所属公司 | String | 200 | - | 是 | - | 传合同的所属公司代码 |'
      ].join('\n')
    }

    expect(extractPageLineMatches(contractPage, '合同')).toEqual([
      {
        id: '21:1',
        title: '合同档案接口配置清单',
        description: '> 来源：档案项目开发及配置清单工作簿的「合同」工作表。',
        path: '办公系统（OA）/合同档案接口配置清单',
        locale: 'zh',
        tags: []
      },
      {
        id: '21:4',
        title: '合同档案接口配置清单',
        description: '| companyCode | 所属公司 | String | 200 | - | 是 | - | 传合同的所属公司代码 |',
        path: '办公系统（OA）/合同档案接口配置清单',
        locale: 'zh',
        tags: []
      }
    ])
  })

  it('falls back to title or description when body lines do not contain the term', () => {
    const page = {
      id: 30,
      title: '中控台开发与部署',
      description: '中控台构建步骤',
      path: '中控台（CenterConsole）/中控台开发与部署',
      locale: 'zh',
      content: '正文仅包含构建脚本说明'
    }

    expect(extractPageLineMatches(page, '中控台')).toEqual([
      {
        id: '30',
        title: '中控台开发与部署',
        description: '中控台构建步骤',
        path: '中控台（CenterConsole）/中控台开发与部署',
        locale: 'zh',
        tags: []
      }
    ])
  })

  it('excludes image and attachment targets while retaining captions and surrounding text', () => {
    const page = {
      id: 40,
      title: 'Guide',
      description: '',
      path: 'docs/guide',
      locale: 'en',
      content: [
        '![Diagram](/uploads/secret-diagram.png)',
        '[Download report](/files/secret-report.pdf?version=1)',
        '<img src="/images/secret-picture.png" alt="Diagram">',
        '<a href="/files/secret-sheet.xlsx">Download sheet</a>',
        'See https://example.com/files/secret-archive.zip for details',
        'Secret is also mentioned in ordinary text.',
        '[Documentation](/docs/secret-guide)',
        'API endpoint https://example.com/secret-api',
        '<a href="/docs/secret-html">HTML documentation</a>',
        'Resource https://example.com/uploads/secret-resource',
        '[Download](/uploads/secret-file)'
      ].join('\n')
    }

    expect(extractPageLineMatches(page, 'secret').map(result => result.id)).toEqual(['40:6', '40:7', '40:8', '40:9'])
    expect(extractPageLineMatches(page, 'Download').map(result => result.id)).toEqual(['40:2', '40:4', '40:11'])
    expect(extractPageLineMatches(page, 'Diagram').map(result => result.id)).toEqual(['40:1', '40:3'])
    expect(extractPageLineMatches(page, 'Download secret')).toEqual([])
  })

  it('excludes resource paths from reference links and preserves source line numbers', () => {
    const page = {
      id: 41,
      title: 'Guide',
      description: '',
      path: 'docs/guide',
      locale: 'en',
      content: '[Reference][file]\n\n[file]: /files/secret-report.pdf\n\nSecret details'
    }

    const results = extractPageLineMatches(page, 'secret')
    expect(results.map(result => result.id)).toEqual(['41:5'])
    expect(results[0].description).toBe('Secret details')
    expect(extractPageLineMatches(page, 'Reference').map(result => result.id)).toEqual(['41:1'])
  })

  it('queries published pages and returns flat line matches', async () => {
    const mockPages = [
      {
        id: 7,
        title: 'OA项目启动说明',
        description: 'OA项目启动说明',
        path: '办公系统（OA）/OA项目启动说明',
        locale: 'zh',
        content: '第一行：无关内容\n第二行：启动OA系统服务\n第三行：检查OA日志',
        tags: [{ tag: 'oa', title: 'OA' }]
      }
    ]

    const mockBuilder = {
      column: jest.fn().mockReturnThis(),
      withGraphJoined: jest.fn().mockReturnThis(),
      modifyGraph: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(mockPages)
    }

    global.WIKI = {
      config: { db: { type: 'mysql' } },
      models: {
        pages: {
          query: jest.fn(() => mockBuilder)
        }
      }
    }

    const res = await queryPageLineMatches('OA', { locale: 'zh' })
    expect(res.totalHits).toBe(2)
    expect(res.results).toEqual([
      {
        id: '7:2',
        title: 'OA项目启动说明',
        description: '第二行：启动OA系统服务',
        path: '办公系统（OA）/OA项目启动说明',
        locale: 'zh',
        tags: [{ tag: 'oa', title: 'OA' }]
      },
      {
        id: '7:3',
        title: 'OA项目启动说明',
        description: '第三行：检查OA日志',
        path: '办公系统（OA）/OA项目启动说明',
        locale: 'zh',
        tags: [{ tag: 'oa', title: 'OA' }]
      }
    ])
  })

  it('restricts folder and page results to exact path boundaries', async () => {
    const pages = ['docs/a', 'docs/sub/b', 'docs-other/c', 'docs/a-extra'].map((path, index) => ({
      id: index + 1, title: path, description: '', path, locale: 'zh', content: 'needle'
    }))
    const conditions = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis()
    }
    const builder = {
      column: jest.fn().mockReturnThis(),
      withGraphJoined: jest.fn().mockReturnThis(),
      modifyGraph: jest.fn().mockReturnThis(),
      where: jest.fn(callback => {
        callback(conditions)
        return Promise.resolve(pages)
      })
    }
    global.WIKI = {
      config: { db: { type: 'mysql' } },
      models: { pages: { query: () => builder } }
    }

    const folder = await queryPageLineMatches('needle', { scope: 'folder', path: 'docs', locale: 'zh' })
    expect(folder.results.map(result => result.path)).toEqual(['docs/a', 'docs/sub/b', 'docs/a-extra'])
    expect(conditions.andWhere).toHaveBeenCalledWith('pages.path', 'like', 'docs/%')

    const page = await queryPageLineMatches('needle', { scope: 'page', path: 'docs/a', locale: 'zh' })
    expect(page.results.map(result => result.path)).toEqual(['docs/a'])
    expect(conditions.andWhere).toHaveBeenCalledWith('pages.path', 'docs/a')
  })

  it('restricts Elasticsearch candidates by page ID and skips empty candidate sets', async () => {
    const conditions = {
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis()
    }
    const builder = {
      column: jest.fn().mockReturnThis(),
      withGraphJoined: jest.fn().mockReturnThis(),
      modifyGraph: jest.fn().mockReturnThis(),
      where: jest.fn(callback => {
        callback(conditions)
        return Promise.resolve([])
      })
    }
    global.WIKI = {
      config: { db: { type: 'mysql' } },
      models: { pages: { query: jest.fn(() => builder) } }
    }

    await queryPageLineMatches('CAS', { scope: 'global' }, [7, 9])
    expect(conditions.whereIn).toHaveBeenCalledWith('pages.id', [7, 9])
    global.WIKI.models.pages.query.mockClear()
    expect(await queryPageLineMatches('CAS', {}, [])).toEqual({ results: [], suggestions: [], totalHits: 0 })
    expect(global.WIKI.models.pages.query).not.toHaveBeenCalled()
  })
})
