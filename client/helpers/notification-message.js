const UNEXPECTED_MESSAGES = [
  'An unexpected error occurred.',
  'An unexpected error occurred',
  'An unexpected error occured.',
  'An unexpected error occured'
]

export function getNotificationMessage (message, t) {
  if (/^Network Error:/i.test(message || '')) {
    return t('common:error.network')
  }
  if (UNEXPECTED_MESSAGES.includes(message)) {
    return t('common:error.unexpected')
  }
  return message
}
