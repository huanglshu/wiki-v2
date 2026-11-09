const _ = require('lodash')
const graphHelper = require('../../helpers/graph')
const { getStorageStatusMessage } = require('../../helpers/storage-status')

/* global WIKI */

module.exports = {
  Query: {
    async storage() { return {} }
  },
  Mutation: {
    async storage() { return {} }
  },
  StorageQuery: {
    async targets(obj, args, context, info) {
      let targets = await WIKI.models.storage.getTargets()
      targets = _.sortBy(targets.map(tgt => {
        const targetInfo = _.find(WIKI.data.storage, ['key', tgt.key]) || {}
        return {
          ...targetInfo,
          ...tgt,
          hasSchedule: (targetInfo.schedule !== false),
          syncInterval: tgt.syncInterval || targetInfo.schedule || 'P0D',
          syncIntervalDefault: targetInfo.schedule,
          config: _.sortBy(_.transform(tgt.config, (res, value, key) => {
            const configData = _.get(targetInfo.props, key, false)
            if (configData) {
              res.push({
                key,
                value: JSON.stringify({
                  ...configData,
                  value: (configData.sensitive && !_.isEmpty(value)) ? '********' : (_.isNil(value) ? '' : value)
                })
              })
            }
          }, []), 'key')
        }
      }), ['title', 'key'])
      return targets
    },
    async targetSecret(obj, args, context) {
      if (context && context.res) {
        context.res.setHeader('Cache-Control', 'no-store')
      }
      const targetInfo = _.find(WIKI.data.storage, ['key', args.targetKey])
      const configData = targetInfo && targetInfo.props && Object.prototype.hasOwnProperty.call(targetInfo.props, args.configKey) ? targetInfo.props[args.configKey] : null
      if (!configData || configData.sensitive !== true) {
        throw new Error('Invalid sensitive storage field')
      }

      const target = await WIKI.models.storage.query().select('config').findById(args.targetKey)
      if (!target || !target.config || !Object.prototype.hasOwnProperty.call(target.config, args.configKey)) {
        throw new Error('Invalid storage target')
      }
      return _.isNil(target.config[args.configKey]) ? '' : String(target.config[args.configKey])
    },
    async status(obj, args, context, info) {
      let activeTargets = await WIKI.models.storage.query().where('isEnabled', true)
      return activeTargets.map(tgt => {
        const targetInfo = _.find(WIKI.data.storage, ['key', tgt.key]) || {}
        return {
          key: tgt.key,
          titleKey: targetInfo.titleKey,
          title: targetInfo.title,
          status: _.get(tgt, 'state.status') || 'pending',
          message: getStorageStatusMessage(_.get(tgt, 'state.message')),
          lastAttempt: _.get(tgt, 'state.lastAttempt', null)
        }
      })
    }
  },
  StorageMutation: {
    async updateTargets(obj, args, context) {
      try {
        let dbTargets = await WIKI.models.storage.getTargets()
        for (let tgt of args.targets) {
          const currentDbTarget = _.find(dbTargets, ['key', tgt.key])
          if (!currentDbTarget) {
            continue
          }
          await WIKI.models.storage.query().patch({
            isEnabled: tgt.isEnabled,
            mode: tgt.mode,
            syncInterval: tgt.syncInterval,
            config: _.reduce(tgt.config, (result, value, key) => {
              let configValue = _.get(JSON.parse(value.value), 'v', null)
              if (configValue === '********') {
                configValue = _.get(currentDbTarget.config, value.key, '')
              }
              _.set(result, `${value.key}`, configValue)
              return result
            }, {}),
            state: {
              status: 'pending',
              message: 'Initializing...',
              lastAttempt: null
            }
          }).where('key', tgt.key)
        }
        await WIKI.models.storage.initTargets()
        return {
          responseResult: graphHelper.generateSuccess('Storage targets updated successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async executeAction(obj, args, context) {
      try {
        await WIKI.models.storage.executeAction(args.targetKey, args.handler)
        return {
          responseResult: graphHelper.generateSuccess('Action completed.')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
