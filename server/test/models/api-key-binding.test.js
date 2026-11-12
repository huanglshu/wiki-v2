const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const ApiKey = require('../../models/apiKeys')

describe('user-bound API key signing', () => {
  afterEach(() => { delete global.WIKI })

  it('signs the bound user ID and does not grant a group or full access', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: 'test-passphrase' },
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    })
    const patch = jest.fn().mockResolvedValue(1)
    const insert = jest.fn().mockResolvedValue({ id: 42 })
    global.WIKI = {
      config: {
        certs: { private: privateKey },
        sessionSecret: 'test-passphrase',
        auth: { audience: 'test-wiki' }
      },
      models: { apiKeys: { query: () => ({ insert, findById: () => ({ patch }) }) } }
    }

    const key = await ApiKey.createNewKey({ name: 'Integration', expiration: '1y', userId: 7 })
    const payload = jwt.verify(key, publicKey, { algorithms: ['RS256'], audience: 'test-wiki', issuer: 'urn:wiki.js' })

    expect(payload).toMatchObject({ api: 42, uid: 7 })
    expect(payload.grp).toBeUndefined()
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Integration', isRevoked: true }))
    expect(patch).toHaveBeenCalledWith({ key, isRevoked: false })
  })
})
