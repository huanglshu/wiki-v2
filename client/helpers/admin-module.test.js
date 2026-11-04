import { translateAdminModules } from './admin-module'

describe('admin module translations', () => {
  it('falls back to enum values when i18next returns a missing key without its namespace', () => {
    const t = jest.fn(key => key.replace(/^admin:/, ''))
    const [translated] = translateAdminModules('search', [{
      key: 'elasticsearch',
      title: 'Elasticsearch',
      config: [{
        key: 'apiVersion',
        value: {
          type: 'string',
          enum: ['7.x']
        }
      }]
    }], t)

    expect(translated.config[0].value.enum).toEqual([{ text: '7.x', value: '7.x' }])
  })
})
