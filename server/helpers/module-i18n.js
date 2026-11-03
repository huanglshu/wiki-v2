function getModuleI18nKey (value, field, fallback) {
  if (!value || typeof value !== 'object') {
    return fallback
  }
  const suffix = `${field.charAt(0).toUpperCase()}${field.slice(1)}Key`
  return value[`i18n${suffix}`] || fallback
}

module.exports = {
  getModuleI18nKey
}
