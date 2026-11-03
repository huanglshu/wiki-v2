/* global WIKI */

const _ = require('lodash')
const { DateTime } = require('luxon')
const { getModuleI18nKey } = require('./module-i18n')

module.exports = {
  /**
   * Get default value of type
   *
   * @param {any} type primitive type name
   * @returns Default value
   */
  getTypeDefaultValue (type) {
    switch (type.toLowerCase()) {
      case 'string':
        return ''
      case 'number':
        return 0
      case 'boolean':
        return false
    }
  },
  parseModuleProps (props) {
    return _.transform(props, (result, value, key) => {
      let defaultValue = ''
      if (_.isPlainObject(value)) {
        defaultValue = !_.isNil(value.default) ? value.default : this.getTypeDefaultValue(value.type)
      } else {
        defaultValue = this.getTypeDefaultValue(value)
      }
      _.set(result, key, {
        default: defaultValue,
        type: (value.type || value).toLowerCase(),
        title: value.title || _.startCase(key),
        titleKey: getModuleI18nKey(value, 'title', null),
        hint: value.hint || false,
        hintKey: getModuleI18nKey(value, 'hint', null),
        enum: value.enum || false,
        multiline: value.multiline || false,
        sensitive: value.sensitive || false,
        maxWidth: value.maxWidth || 0,
        order: value.order || 100
      })
      return result
    }, {})
  },
  getCookieOpts () {
    return {
      expires: DateTime.utc().plus({ days: 365 }).toJSDate(),
      ...(WIKI.config.host.startsWith('https://') ? { secure: true } : {})
    }
  }
}
