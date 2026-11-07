const _ = require('lodash')
const sanitize = require('sanitize-filename')
const graphHelper = require('../../helpers/graph')
const assetHelper = require('../../helpers/asset')

/* global WIKI */

module.exports = {
  Query: {
    async assets() { return {} }
  },
  Mutation: {
    async assets() { return {} }
  },
  AssetQuery: {
    async uploadMaxFileSize() {
      return WIKI.config.uploads.maxFileSize
    },
    async list(obj, args, context) {
      let cond = {
        folderId: args.folderId === 0 ? null : args.folderId
      }
      if (args.kind !== 'ALL') {
        cond.kind = args.kind.toLowerCase()
      }
      const folderHierarchy = await WIKI.models.assetFolders.getHierarchy(args.folderId)
      const folderPath = folderHierarchy.map(h => h.slug).join('/')
      const results = await WIKI.models.assets.query().where(cond)
      return _.filter(results, r => {
        const path = folderPath ? `${folderPath}/${r.filename}` : r.filename
        return WIKI.auth.checkAccess(context.req.user, ['read:assets'], { path })
      }).map(a => ({
        ...a,
        kind: a.kind.toUpperCase()
      }))
    },
    async folders(obj, args, context) {
      const results = await WIKI.models.assetFolders.query().where({
        parentId: args.parentFolderId === 0 ? null : args.parentFolderId
      })
      const parentHierarchy = await WIKI.models.assetFolders.getHierarchy(args.parentFolderId)
      const parentPath = parentHierarchy.map(h => h.slug).join('/')
      return _.filter(results, r => {
        const path = parentPath ? `${parentPath}/${r.slug}` : r.slug
        return WIKI.auth.checkAccess(context.req.user, ['read:assets'], { path })
      })
    },
    async folderEmpty(obj, args, context) {
      if (args.folderId <= 0) {
        return false
      }
      const hierarchy = await WIKI.models.assetFolders.getHierarchy(args.folderId)
      if (!hierarchy.length || !WIKI.auth.checkAccess(context.req.user, ['manage:assets'], { path: hierarchy.map(folder => folder.slug).join('/') })) {
        return false
      }
      const child = await WIKI.models.knex('assetFolders').where({ parentId: args.folderId }).first('id')
      const file = await WIKI.models.knex('assets').where({ folderId: args.folderId }).first('id')
      return !child && !file
    }
  },
  AssetMutation: {
    /**
     * Create New Asset Folder
     */
    async createFolder(obj, args, context) {
      try {
        const folderSlug = sanitize(args.slug).toLowerCase()
        const parentFolderId = args.parentFolderId === 0 ? null : args.parentFolderId
        const result = await WIKI.models.assetFolders.query().where({
          parentId: parentFolderId,
          slug: folderSlug
        }).first()
        if (!result) {
          await WIKI.models.assetFolders.query().insert({
            slug: folderSlug,
            name: folderSlug,
            parentId: parentFolderId
          })
          return {
            responseResult: graphHelper.generateSuccess('Asset Folder has been created successfully.')
          }
        } else {
          throw new WIKI.Error.AssetFolderExists()
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    /**
     * Delete an empty asset folder.
     */
    async deleteFolder(obj, args, context) {
      try {
        if (args.id <= 0) {
          throw new WIKI.Error.AssetFolderInvalid()
        }
        const hierarchy = await WIKI.models.assetFolders.getHierarchy(args.id)
        if (!hierarchy.length) {
          throw new WIKI.Error.AssetFolderInvalid()
        }
        const path = hierarchy.map(folder => folder.slug).join('/')
        if (!WIKI.auth.checkAccess(context.req.user, ['manage:assets'], { path })) {
          throw new WIKI.Error.AssetDeleteForbidden()
        }

        await WIKI.models.knex.transaction(async trx => {
          const folder = await trx('assetFolders').where({ id: args.id }).forUpdate().first()
          if (!folder) {
            throw new WIKI.Error.AssetFolderInvalid()
          }
          const child = await trx('assetFolders').where({ parentId: args.id }).first('id')
          const asset = await trx('assets').where({ folderId: args.id }).first('id')
          if (child || asset) {
            throw new WIKI.Error.AssetFolderNotEmpty()
          }
          await trx('assetFolders').where({ id: args.id }).del()
        })
        return { responseResult: graphHelper.generateSuccess('Asset folder has been deleted successfully.') }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    /**
     * Rename an Asset
     */
    async renameAsset(obj, args, context) {
      try {
        const filename = sanitize(args.filename).toLowerCase()

        const asset = await WIKI.models.assets.query().findById(args.id)
        if (asset) {
          // Check for extension mismatch
          if (!_.endsWith(filename, asset.ext)) {
            throw new WIKI.Error.AssetRenameInvalidExt()
          }

          // Check for non-dot files changing to dotfile
          if (asset.ext.length > 0 && filename.length - asset.ext.length < 1) {
            throw new WIKI.Error.AssetRenameInvalid()
          }

          // Check for collision
          const assetCollision = await WIKI.models.assets.query().where({
            filename,
            folderId: asset.folderId
          }).first()
          if (assetCollision) {
            throw new WIKI.Error.AssetRenameCollision()
          }

          // Get asset folder path
          let hierarchy = []
          if (asset.folderId) {
            hierarchy = await WIKI.models.assetFolders.getHierarchy(asset.folderId)
          }

          // Check source asset permissions
          const assetSourcePath = (asset.folderId) ? hierarchy.map(h => h.slug).join('/') + `/${asset.filename}` : asset.filename
          if (!WIKI.auth.checkAccess(context.req.user, ['manage:assets'], { path: assetSourcePath })) {
            throw new WIKI.Error.AssetRenameForbidden()
          }

          // Check target asset permissions
          const assetTargetPath = (asset.folderId) ? hierarchy.map(h => h.slug).join('/') + `/${filename}` : filename
          if (!WIKI.auth.checkAccess(context.req.user, ['write:assets'], { path: assetTargetPath })) {
            throw new WIKI.Error.AssetRenameTargetForbidden()
          }

          // Update filename + hash
          const fileHash = assetHelper.generateHash(assetTargetPath)
          await WIKI.models.assets.query().patch({
            filename: filename,
            hash: fileHash
          }).findById(args.id)

          // Delete old asset cache
          await asset.deleteAssetCache()

          // Rename in Storage
          await WIKI.models.storage.assetEvent({
            event: 'renamed',
            asset: {
              ...asset,
              path: assetSourcePath,
              destinationPath: assetTargetPath,
              moveAuthorId: context.req.user.id,
              moveAuthorName: context.req.user.name,
              moveAuthorEmail: context.req.user.email
            }
          })

          return {
            responseResult: graphHelper.generateSuccess('Asset has been renamed successfully.')
          }
        } else {
          throw new WIKI.Error.AssetInvalid()
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    /**
     * Delete an Asset
     */
    async deleteAsset(obj, args, context) {
      try {
        const asset = await WIKI.models.assets.query().findById(args.id)
        if (asset) {
          // Check permissions
          const assetPath = await asset.getAssetPath()
          if (!WIKI.auth.checkAccess(context.req.user, ['manage:assets'], { path: assetPath })) {
            throw new WIKI.Error.AssetDeleteForbidden()
          }

          await WIKI.models.knex('assetData').where('id', args.id).del()
          await WIKI.models.assets.query().deleteById(args.id)
          await asset.deleteAssetCache()

          // Delete from Storage
          await WIKI.models.storage.assetEvent({
            event: 'deleted',
            asset: {
              ...asset,
              path: assetPath,
              authorId: context.req.user.id,
              authorName: context.req.user.name,
              authorEmail: context.req.user.email
            }
          })

          return {
            responseResult: graphHelper.generateSuccess('Asset has been deleted successfully.')
          }
        } else {
          throw new WIKI.Error.AssetInvalid()
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    /**
     * Flush Temporary Uploads
     */
    async flushTempUploads(obj, args, context) {
      try {
        await WIKI.models.assets.flushTempUploads()
        return {
          responseResult: graphHelper.generateSuccess('Temporary Uploads have been flushed successfully.')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
  // File: {
  //   folder(fl) {
  //     return fl.getFolder()
  //   }
  // }
}
