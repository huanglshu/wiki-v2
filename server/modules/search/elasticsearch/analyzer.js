const _ = require('lodash')

function getAnalysisSettings (conf) {
  if (!_.startsWith(conf.analyzer, 'ik_smart+pinyin')) {
    return {
      analyzer: {
        default: {
          type: conf.analyzer
        }
      }
    }
  }

  return {
    analyzer: {
      default: {
        type: 'custom',
        tokenizer: 'ik_smart',
        filter: conf.analyzer === 'ik_smart+pinyin_first_letter' ?
          ['lowercase', 'pinyin_first_letter'] :
          ['lowercase', 'pinyin']
      }
    }
  }
}

module.exports = {
  getAnalysisSettings
}
