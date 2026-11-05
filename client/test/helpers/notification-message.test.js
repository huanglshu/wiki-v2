import { getLocalizedNotificationMarker, getNotificationMessage } from '../../helpers/notification-message'
import i18next from 'i18next'
import _ from 'lodash'
import en from '../../../data/sideload/en.json'
import zh from '../../../data/sideload/zh.json'

const serverErrors = require('../../../server/helpers/error')

describe('notification message', () => {
  const t = key => {
    return key === 'common:error.network' ? '网络错误，请检查网络连接后重试。' : key
  }

  it('translates network errors instead of exposing the raw Apollo message', () => {
    expect(getNotificationMessage('Network Error: Failed to fetch', t)).toBe('网络错误，请检查网络连接后重试。')
  })

  it('keeps non-network notification content unchanged', () => {
    expect(getNotificationMessage('保存成功', t)).toBe('保存成功')
  })

  it('resolves translated notification keys at render time', () => {
    const t = jest.fn(key => `translated:${key}`)

    expect(getNotificationMessage('i18n:common:error.unexpected', t)).toBe('translated:common:error.unexpected')
    expect(t).toHaveBeenCalledWith('common:error.unexpected')
  })

  it('localizes the S3 endpoint error marker', () => {
    expect(getLocalizedNotificationMarker('Please use virtual hosted style to access.'))
      .toBe('i18n:common:error.storageS3Endpoint')

    const t = jest.fn(key => key === 'common:error.storageS3Endpoint' ? '对象存储同步失败。' : key)

    expect(getNotificationMessage('i18n:common:error.storageS3Endpoint', t)).toBe('对象存储同步失败。')
  })

  it('covers each standard server error in both language packages', () => {
    for (const [name, ErrorType] of Object.entries(serverErrors)) {
      const key = `common:serverError.${name}`
      expect(en[key]).toBe(new ErrorType().message)
      expect(zh[key]).toEqual(expect.any(String))
      expect(zh[key]).not.toBe('')
    }
    for (const key of Object.keys(en).filter(key => key.startsWith('common:serverError.'))) {
      expect(zh[key]).toEqual(expect.any(String))
      expect(zh[key]).not.toBe('')
    }
  })

  it('translates known server errors and preserves unknown messages', async () => {
    const resources = { en: { common: {} }, zh: { common: {} } }
    for (const [language, translations] of [['en', en], ['zh', zh]]) {
      for (const [key, value] of Object.entries(translations)) {
        if (key.startsWith('common:serverError.')) {
          _.set(resources[language].common, key.slice('common:'.length), value)
        }
      }
    }
    const i18n = i18next.createInstance()
    await i18n.init({ lng: 'zh', fallbackLng: 'en', resources })
    const translate = i18n.t.bind(i18n)

    expect(getNotificationMessage(new serverErrors.AuthAccountBanned().message, translate)).toBe(zh['common:serverError.AuthAccountBanned'])
    expect(getNotificationMessage('Password must be at least 6 characters!', translate)).toBe(zh['common:serverError.PasswordTooShort'])
    expect(getNotificationMessage('Unknown provider error: 123', translate)).toBe('Unknown provider error: 123')
    await i18n.changeLanguage('en')
    expect(getNotificationMessage(new serverErrors.AuthAccountBanned().message, translate)).toBe(en['common:serverError.AuthAccountBanned'])
  })

  it('preserves the original error if its translation is unavailable', () => {
    const message = new serverErrors.PageNotFound().message
    expect(getNotificationMessage(message, key => key)).toBe(message)
  })
})
