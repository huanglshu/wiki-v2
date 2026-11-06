jest.mock('../../modules/storage/s3generic/storage', () => ({
  init: jest.fn()
}))

const Storage = require('../../models/storage')
const s3generic = require('../../modules/storage/s3generic/storage')

describe('models/storage initialization', () => {
  let patch
  let logger

  beforeEach(() => {
    const target = {
      key: 's3generic',
      config: {},
      mode: 'push'
    }
    patch = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(1)
    })
    logger = {
      error: jest.fn(),
      warn: jest.fn()
    }
    global.WIKI = {
      data: { storage: [{ key: target.key, schedule: false }] },
      logger,
      models: {
        storage: {
          query: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([target])
            }),
            patch
          })
        }
      },
      scheduler: { jobs: [] }
    }
  })

  afterEach(() => {
    delete global.WIKI
    jest.resetAllMocks()
  })

  it('logs diagnostic fields when the error message is empty', async () => {
    s3generic.init.mockRejectedValue({
      message: null,
      code: 'Forbidden',
      statusCode: 403,
      requestId: 'request-123'
    })

    await Storage.initTargets()

    expect(logger.error).toHaveBeenCalledWith(
      '(STORAGE/s3generic) Initialization failed: Storage initialization failed., code: Forbidden, status: 403, requestId: request-123'
    )
    expect(patch).toHaveBeenCalledWith({
      state: {
        status: 'error',
        message: 'Storage initialization failed.',
        lastAttempt: expect.any(String)
      }
    })
  })

  it('logs an error message without requiring provider-specific fields', async () => {
    s3generic.init.mockRejectedValue(new Error('Connection refused'))

    await Storage.initTargets()

    expect(logger.error).toHaveBeenCalledWith(
      '(STORAGE/s3generic) Initialization failed: Connection refused'
    )
    expect(patch).toHaveBeenCalledWith({
      state: {
        status: 'error',
        message: 'Connection refused',
        lastAttempt: expect.any(String)
      }
    })
  })

  it('does not log an error after successful initialization', async () => {
    s3generic.init.mockResolvedValue()

    await Storage.initTargets()

    expect(logger.error).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledWith({
      state: {
        status: 'operational',
        message: '',
        lastAttempt: expect.any(String)
      }
    })
  })
})
