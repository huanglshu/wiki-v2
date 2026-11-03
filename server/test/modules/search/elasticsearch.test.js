const { getAnalysisSettings } = require('../../../modules/search/elasticsearch/analyzer')

describe('modules/search/elasticsearch/analyzer', () => {
  it('uses the configured analyzer type', () => {
    expect(getAnalysisSettings({ analyzer: 'simple' })).toEqual({
      analyzer: {
        default: {
          type: 'simple'
        }
      }
    })
  })

  it('combines ik_smart with full pinyin', () => {
    expect(getAnalysisSettings({ analyzer: 'ik_smart+pinyin' })).toEqual({
      analyzer: {
        default: {
          type: 'custom',
          tokenizer: 'ik_smart',
          filter: ['lowercase', 'pinyin']
        }
      }
    })
  })

  it('combines ik_smart with pinyin first letters', () => {
    expect(getAnalysisSettings({ analyzer: 'ik_smart+pinyin_first_letter' })).toEqual({
      analyzer: {
        default: {
          type: 'custom',
          tokenizer: 'ik_smart',
          filter: ['lowercase', 'pinyin_first_letter']
        }
      }
    })
  })
})
