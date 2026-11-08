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
        id: '30:1',
        title: '中控台开发与部署',
        description: '中控台构建步骤',
        path: '中控台（CenterConsole）/中控台开发与部署',
        locale: 'zh',
        tags: []
      }
    ])
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
})
