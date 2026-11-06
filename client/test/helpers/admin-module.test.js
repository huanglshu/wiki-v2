import { translateAdminModules } from '../../helpers/admin-module'
import zh from '../../../data/sideload/zh.json'

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

  it('preserves action handler casing when resolving action translations', () => {
    const t = jest.fn(key => key)
    const [translated] = translateAdminModules('storage', [{
      key: 'azure',
      title: 'Azure Blob Storage',
      actions: [{
        handler: 'exportAll',
        label: 'Export All',
        hint: 'Export all content.'
      }]
    }], t)

    expect(t).toHaveBeenCalledWith('admin:modules.storage.azure.actions.exportAll.label')
    expect(t).toHaveBeenCalledWith('admin:modules.storage.azure.actions.exportAll.hint')
    expect(translated.actions[0].handler).toBe('exportAll')
  })

  it.each(['markdownKatex', 'markdownMathjax'])('translates %s TeX hints without changing values', key => {
    const module = {
      key,
      config: [
        { key: 'useInline', value: { type: 'boolean', value: true, title: 'Inline TeX', hint: 'Process inline TeX expressions surrounded by $ symbols.' } },
        { key: 'useBlocks', value: { type: 'boolean', value: false, title: 'TeX Blocks', hint: 'Process TeX blocks enclosed by $$ symbols.' } }
      ]
    }
    const [translated] = translateAdminModules('rendering', [module], translationKey => zh[translationKey] || translationKey)
    expect(translated.config.map(cfg => cfg.value.hint)).toEqual([
      '处理由 $ 符号包围的行内 TeX 表达式。',
      '处理由 $$ 符号包围的 TeX 区块。'
    ])
    expect(translated.config.map(cfg => cfg.value.value)).toEqual([true, false])
    expect(module.config[1].value.hint).toBe('Process TeX blocks enclosed by $$ symbols.')

    const [english] = translateAdminModules('rendering', [module], translationKey => translationKey)
    expect(english.config.map(cfg => cfg.value.hint)).toEqual(module.config.map(cfg => cfg.value.hint))
  })

  it('translates AsciiDoc safe mode without changing saved enum values', () => {
    const module = {
      key: 'asciidocCore',
      config: [{
        key: 'safeMode',
        value: {
          type: 'string',
          value: 'server',
          title: 'Safe Mode',
          hint: 'Sets the safe mode to use when parsing content to HTML.',
          enum: ['unsafe', 'safe', 'server', 'secure']
        }
      }]
    }
    const [translated] = translateAdminModules('rendering', [module], key => zh[key] || key)
    expect(translated.config[0].value).toMatchObject({
      title: '安全模式',
      hint: '设置将内容解析为 HTML 时使用的安全模式。',
      value: 'server',
      enum: [
        { text: '不安全', value: 'unsafe' },
        { text: '安全', value: 'safe' },
        { text: '服务器', value: 'server' },
        { text: '受限', value: 'secure' }
      ]
    })
    const [english] = translateAdminModules('rendering', [module], key => key)
    expect(english.config[0].value.hint).toBe(module.config[0].value.hint)
    expect(english.config[0].value.enum.map(option => option.value)).toEqual(module.config[0].value.enum)
  })
})
