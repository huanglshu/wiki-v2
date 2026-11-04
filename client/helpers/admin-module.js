import _ from 'lodash'

function translateKey (t, key, fallback) {
  if (typeof t !== 'function' || !key) {
    return fallback
  }
  const translated = t(key)
  const keyWithoutNamespace = key.includes(':') ? key.slice(key.indexOf(':') + 1) : key
  return translated && translated !== key && translated !== keyWithoutNamespace ? translated : fallback
}

function getModuleKey (type, key) {
  return `admin:modules.${type.toLowerCase()}.${String(key).toLowerCase()}`
}

function translateEnumText (type, moduleKey, text) {
  return `${getModuleKey(type, moduleKey)}.enumText.${String(text)}`
}

function translateFallback (key) {
  return `admin:modules.generic.fallback.${String(key).toLowerCase()}`
}

function translateGenericProp (t, key) {
  return translateKey(t, `admin:modules.generic.props.${String(key).toLowerCase()}.title`, null)
}

function translateDefinition (type, value, t) {
  if (!value) {
    return value
  }

  const moduleKey = getModuleKey(type, value.key)
  const translated = {
    ...value,
    title: translateKey(t, value.titleKey || `${moduleKey}.title`, value.title),
    description: translateKey(t, value.descriptionKey || `${moduleKey}.description`, value.description),
    titleKey: value.titleKey || `${moduleKey}.title`,
    descriptionKey: value.descriptionKey || `${moduleKey}.description`
  }

  if (value.config) {
    translated.config = value.config.map(cfg => {
      const sourceValue = _.isObject(cfg.value) ? cfg.value : {}
      const propKey = `${moduleKey}.props.${String(cfg.key).toLowerCase()}`
      const titleKey = sourceValue.titleKey || `${propKey}.title`
      const hintKey = sourceValue.hintKey || `${propKey}.hint`
      const cfgValue = {
        ...sourceValue,
        title: translateKey(t, titleKey, translateGenericProp(t, cfg.key) || sourceValue.title || translateKey(t, translateFallback(cfg.key), _.startCase(cfg.key))),
        hint: translateKey(t, hintKey, sourceValue.hint || '')
      }

      if (Array.isArray(sourceValue.enum)) {
        cfgValue.enum = sourceValue.enum.map(option => {
          const optionValue = _.isObject(option) ? option.value : option
          const text = _.isObject(option) ? option.text : option
          const translatedText = translateKey(t, translateEnumText(type, value.key, optionValue), text)
          return _.isObject(option) ? { ...option, text: translatedText } : { text: translatedText, value: option }
        })
      }
      return { ...cfg, value: cfgValue }
    })
  }

  if (value.actions) {
    translated.actions = value.actions.map(action => {
      const actionKey = `${moduleKey}.actions.${String(action.handler)}`
      return {
        ...action,
        label: translateKey(t, action.i18nLabelKey || `${actionKey}.label`, action.label),
        hint: translateKey(t, action.i18nHintKey || `${actionKey}.hint`, action.hint)
      }
    })
  }
  return translated
}

export function translateAdminModule (type, value, t) {
  return translateDefinition(type, value, t)
}

export function translateAdminModules (type, values, t) {
  return values.map(value => translateDefinition(type, value, t))
}

export function translateRenderingCore (core, t) {
  const translated = {
    ...core,
    children: translateAdminModules('rendering', core.children || [], t)
  }
  const pipeline = translated.input === 'markdown' ? 'markdown' : 'asciidoc'
  return {
    ...translated,
    title: translateKey(t, `admin:modules.rendering.core.${pipeline}.title`, translated.title),
    description: translateKey(t, `admin:modules.rendering.core.${pipeline}.description`, translated.description)
  }
}
