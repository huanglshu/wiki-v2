const UNEXPECTED_MESSAGES = [
  'An unexpected error occurred.',
  'An unexpected error occurred',
  'An unexpected error occured.',
  'An unexpected error occured'
]

export function getLocalizedNotificationMarker (message) {
  if (/Please use virtual hosted style to access/i.test(message || '')) {
    return 'i18n:common:error.storageS3Endpoint'
  }
  return message
}

export function getNotificationMessage (message, t) {
  message = getLocalizedNotificationMarker(message)
  if (typeof message === 'string' && message.startsWith('i18n:')) {
    return t(message.substring('i18n:'.length))
  }
  if (/^Network Error:/i.test(message || '')) {
    return t('common:error.network')
  }
  if (UNEXPECTED_MESSAGES.includes(message)) {
    return t('common:error.unexpected')
  }
  return message
}
