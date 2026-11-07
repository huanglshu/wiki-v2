<template lang='pug'>
  v-card.editor-modal-media.animated.fadeInLeft(
    flat, tile, :class='[`is-editor-` + editorKey, { "is-management": management }]'
    :role='management ? `dialog` : null'
    :aria-modal='management ? `true` : null'
    :aria-label='management ? $t(`editor:assets.title`) : null'
    :tabindex='management ? -1 : null'
    @click.native='closeOnBackgroundClick'
    @keydown.esc.native='closeOnEscape'
  )
    v-container.pa-3(grid-list-lg, fluid)
      v-layout(row, wrap)
        v-flex(xs12, :lg9='!management', :lg12='management')
          v-card.radius-7.animated.fadeInLeft.wait-p1s(:light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark')
            v-card-text(:class='{ "editor-media-layout": management }')
              .d-flex.editor-media-toolbar
                v-toolbar.editor-media-heading(:class='{ "radius-7": !management }', :color='management ? `transparent` : ($vuetify.theme.dark ? `teal` : `teal lighten-5`)', dense, flat, height='44')
                  div(:class='[management ? `editor-media-title` : `body-2`, $vuetify.theme.dark ? `white--text` : `teal--text`]') {{$t('editor:assets.title')}}
                  span.editor-media-heading-divider(v-if='management', :class='$vuetify.theme.dark ? `white--text` : `teal--text`', aria-hidden='true') |
                  span.editor-media-heading-path(v-if='management', :class='$vuetify.theme.dark ? `blue--text text--lighten-3` : `primary--text`', :aria-label='$t("editor:assets.currentFolderPath")', :title='currentFolderPath') {{ currentFolderPath }}
                  v-spacer
                  v-btn(v-if='!management', text, icon, @click='refresh')
                    v-icon(:color='$vuetify.theme.dark ? `white` : `teal`') mdi-refresh
                v-btn.ml-3.my-0.mr-0.radius-7.editor-media-delete-folder(
                  v-if='management && canManageAssets'
                  outlined
                  large
                  color='red darken-2'
                  :icon='$vuetify.breakpoint.smAndDown'
                  :aria-label='$t("editor:assets.deleteFolder")'
                  :disabled='!canDeleteCurrentFolder'
                  @click='deleteFolderDialog = true'
                )
                  v-icon(:left='$vuetify.breakpoint.mdAndUp') mdi-folder-remove-outline
                  span.hidden-sm-and-down {{$t('editor:assets.deleteFolder')}}
                v-btn.ml-3.my-0.mr-0.radius-7.editor-media-batch-delete(
                  v-if='management && canManageAssets'
                  outlined
                  large
                  color='red darken-2'
                  :icon='$vuetify.breakpoint.smAndDown'
                  :aria-label='$t("editor:assets.deleteSelected")'
                  :disabled='selectedAssets.length === 0'
                  @click='batchDeleteDialog = true'
                )
                  v-icon(:left='$vuetify.breakpoint.mdAndUp') mdi-delete-outline
                  span.hidden-sm-and-down {{$t('editor:assets.deleteSelected')}}
                v-dialog(v-if='!management || canUploadAssets', v-model='newFolderDialog', max-width='550', :persistent='newFolderLoading')
                  template(v-slot:activator='{ on }')
                    v-btn.ml-3.my-0.mr-0.radius-7(outlined, large, color='teal', :icon='management ? $vuetify.breakpoint.smAndDown : $vuetify.breakpoint.xsOnly', :aria-label='$t("editor:assets.newFolder")', v-on='on')
                      v-icon(:left='$vuetify.breakpoint.mdAndUp') mdi-plus
                      span.hidden-sm-and-down(:class='$vuetify.theme.dark ? `teal--text text--lighten-3` : ``') {{$t('editor:assets.newFolder')}}
                  v-card
                    .dialog-header.is-short.subtitle-1 {{$t('editor:assets.newFolder')}}
                    v-card-text.pt-5
                      .editor-media-folder-create
                        .editor-media-folder-create-path(
                          :aria-label='$t("editor:assets.currentFolderPath")'
                          :title='currentFolderPath'
                        )
                          span.editor-media-folder-create-path-text {{ currentFolderPath.slice(0, -1) }}
                          span /
                        v-text-field(
                          outlined
                          v-model='newFolderName'
                          :label='$t(`editor:assets.folderName`)'
                          :disabled='newFolderLoading'
                          counter='255'
                          @keyup.enter='createFolder'
                          @keyup.esc='!newFolderLoading && (newFolderDialog = false)'
                          ref='folderNameIpt'
                        )
                      i18next.caption.grey--text.text--darken-1(path='editor:assets.folderNameNamingRules', tag='div')
                        a(place='namingRules', href='https://docs-beta.requarks.io/guide/assets#naming-restrictions', target='_blank') {{$t('editor:assets.folderNameNamingRulesLink')}}
                    v-card-chin
                      v-spacer
                      v-btn(text, @click='newFolderDialog = false', :disabled='newFolderLoading') {{$t('common:actions.cancel')}}
                      v-btn.px-3(color='primary', @click='createFolder', :disabled='!isFolderNameValid', :loading='newFolderLoading') {{$t('common:actions.create')}}
                v-btn.ml-3.my-0.mr-0.radius-7.editor-media-upload-button(
                  v-if='management && canUploadAssets'
                  outlined
                  large
                  color='teal'
                  :icon='$vuetify.breakpoint.smAndDown'
                  :aria-label='$t("editor:assets.uploadFiles")'
                  @click='openUploadDialog'
                )
                  v-icon(:left='$vuetify.breakpoint.mdAndUp') mdi-cloud-upload-outline
                  span.hidden-sm-and-down {{$t('editor:assets.uploadFiles')}}
              .editor-media-folder-tree(v-if='management', role='navigation', :aria-label='$t("editor:assets.folders")', tabindex='0')
                v-treeview(
                  :items='assetFolderTree'
                  :active='[currentFolderId]'
                  :open='openAssetFolders'
                  :load-children='fetchTreeFolders'
                  item-key='id'
                  item-text='name'
                  dense
                  activatable
                  hoverable
                  expand-icon='mdi-menu-down-outline'
                  @update:active='selectTreeFolder'
                  @update:open='updateTreeOpen'
                )
                  template(v-slot:prepend='{ open }')
                    v-icon {{ open ? 'mdi-folder-open' : 'mdi-folder' }}
                  template(v-slot:label='{ item }')
                    span(:title='item.name') {{ item.name }}
              v-toolbar.editor-media-path(v-if='!management', flat, dense, :color='$vuetify.theme.dark ? `grey darken-3` : `white`')
                template(v-if='folderTree.length > 0')
                  .body-2
                    span.mr-1 /
                    template(v-for='folder of folderTree')
                      span(:key='folder.id') {{folder.name}}
                      span.mx-1 /
                .body-2(v-else) / #[em {{ $t('common:sidebar.root') }}]
              template(v-if='!management && (folders.length > 0 || currentFolderId > 0)')
                v-btn.is-icon.mx-1(:color='$vuetify.theme.dark ? `grey lighten-1` : `grey darken-2`', outlined, :dark='currentFolderId > 0', @click='upFolder()', :disabled='currentFolderId === 0')
                  v-icon mdi-folder-upload
                v-btn.btn-normalcase.mx-1(v-for='folder of folders', :key='folder.id', depressed,  color='grey darken-2', dark, @click='downFolder(folder)')
                  v-icon(left) mdi-folder
                  span.caption(style='text-transform: none;') {{ folder.name }}
                v-divider.mt-2
              v-data-table.editor-media-files(
                v-model='selectedAssets'
                :items='assets'
                :headers='headers'
                :show-select='management && canManageAssets'
                :tabindex='management ? 0 : null'
                :page.sync='pagination'
                :items-per-page='management ? itemsPerPage : 15'
                :loading='loading'
                must-sort,
                sort-by='ID',
                sort-desc,
                hide-default-footer,
                dense
              )
                template(v-slot:header.data-table-select='{ props, on }')
                  v-simple-checkbox.v-data-table__checkbox(
                    v-bind='props'
                    :ripple='false'
                    role='checkbox'
                    tabindex='0'
                    :aria-label='$t("editor:assets.selectPage")'
                    :aria-checked='props.indeterminate ? `mixed` : String(props.value)'
                    v-on='on'
                    @keydown.space.prevent='on.input(!props.value)'
                    @keydown.enter.prevent='on.input(!props.value)'
                  )
                template(slot='item', slot-scope='props')
                  tr.is-clickable(
                    @click.left='currentFileId = props.item.id'
                    @click.right.prevent=''
                    :class='currentFileId === props.item.id ? ($vuetify.theme.dark ? `grey darken-3-d5` : `teal lighten-5`) : ``'
                    )
                    td(v-if='management && canManageAssets')
                      v-simple-checkbox.v-data-table__checkbox(
                        :value='props.isSelected'
                        :ripple='false'
                        role='checkbox'
                        tabindex='0'
                        :aria-label='$t("editor:assets.selectFile", { name: props.item.filename })'
                        :aria-checked='String(props.isSelected)'
                        @input='props.select($event)'
                        @keydown.space.prevent.stop='props.select(!props.isSelected)'
                        @keydown.enter.prevent.stop='props.select(!props.isSelected)'
                      )
                    td.caption(v-if='$vuetify.breakpoint.smAndUp', :class='{ "text-center": management }') {{ management ? (pagination - 1) * itemsPerPage + props.index + 1 : props.item.id }}
                    td.editor-media-filename(:title='props.item.filename')
                      .body-2
                        button.editor-media-preview-button(
                          v-if='management && props.item.kind === `IMAGE`'
                          type='button'
                          :title='$t("editor:assets.previewFileAction", { name: props.item.filename })'
                          :aria-label='$t("editor:assets.previewFileAction", { name: props.item.filename })'
                          @click.stop='openPreviewDialog(props.item)'
                        ): strong(:class='currentFileId === props.item.id ? `teal--text` : ``') {{ props.item.filename }}
                        strong(v-else, :class='currentFileId === props.item.id ? `teal--text` : ``') {{ props.item.filename }}
                      .caption.grey--text {{ props.item.description }}
                    td.text-xs-center(v-if='$vuetify.breakpoint.lgAndUp')
                      v-chip.ma-0(x-small, :color='$vuetify.theme.dark ? `grey darken-4` : `grey lighten-4`')
                        .overline {{props.item.ext.toUpperCase().substring(1)}}
                    td.caption(v-if='$vuetify.breakpoint.mdAndUp') {{ props.item.fileSize | prettyBytes }}
                    td.caption(v-if='$vuetify.breakpoint.mdAndUp') {{ formatAssetDate(props.item.createdAt) }}
                    td.editor-media-actions(v-if='$vuetify.breakpoint.smAndUp || management')
                      v-menu(v-if='management', offset-x, min-width='200', :value='assetActionsFileId === props.item.id', @input='assetActionsFileId = $event ? props.item.id : null')
                        template(v-slot:activator='{ on }')
                          v-btn(
                            icon
                            tile
                            small
                            :aria-label='$t("editor:assets.fileActionsFor", { name: props.item.filename })'
                            :title='$t("editor:assets.fileActionsFor", { name: props.item.filename })'
                            v-on='on'
                            @click.stop='currentFileId = props.item.id'
                          )
                            v-icon(color='grey darken-2') mdi-dots-horizontal
                        v-list(nav, style='border-top: 5px solid #444;')
                          v-list-item(v-if='canManageAssets', @click='openRenameDialog(props.item)')
                            v-list-item-avatar(size='24')
                              v-icon(color='orange') mdi-keyboard-outline
                            v-list-item-content {{$t('common:actions.rename')}}
                          v-list-item(v-clipboard='assetPublicUrl(props.item)', @success='onAssetLinkCopied', @error='onAssetLinkCopyError')
                            v-list-item-avatar(size='24')
                              v-icon(color='primary') mdi-content-copy
                            v-list-item-content {{$t('editor:assets.copyLink')}}
                      v-menu(v-else-if='!management', offset-x, min-width='200')
                        template(v-slot:activator='{ on }')
                          v-btn(v-if='!management || canManageAssets', icon, v-on='on', tile, small, :aria-label='$t("editor:assets.headerActions")', @click.left='currentFileId = props.item.id')
                            v-icon(color='grey darken-2') mdi-dots-horizontal
                        v-list(nav, style='border-top: 5px solid #444;')
                          //- v-list-item(@click='', disabled)
                          //-   v-list-item-avatar(size='24')
                          //-     v-icon(color='teal') mdi-text-short
                          //-   v-list-item-content {{$t('common:actions.properties')}}
                          //- template(v-if='props.item.kind === `IMAGE`')
                          //-   v-list-item(@click='previewDialog = true', disabled)
                          //-     v-list-item-avatar(size='24')
                          //-       v-icon(color='green') mdi-image-search-outline
                          //-     v-list-item-content {{$t('common:actions.preview')}}
                          //-   v-list-item(@click='', disabled)
                          //-     v-list-item-avatar(size='24')
                          //-       v-icon(color='indigo') mdi-crop-rotate
                          //-     v-list-item-content {{$t('common:actions.edit')}}
                          //-   v-list-item(@click='', disabled)
                          //-     v-list-item-avatar(size='24')
                          //-       v-icon(color='purple') mdi-flash-circle
                          //-     v-list-item-content {{$t('common:actions.optimize')}}
                          v-list-item(@click='openRenameDialog()')
                            v-list-item-avatar(size='24')
                              v-icon(color='orange') mdi-keyboard-outline
                            v-list-item-content {{$t('common:actions.rename')}}
                          //- v-list-item(@click='', disabled)
                          //-   v-list-item-avatar(size='24')
                          //-     v-icon(color='blue') mdi-file-move
                          //-   v-list-item-content {{$t('common:actions.move')}}
                          v-list-item(@click='deleteDialog = true')
                            v-list-item-avatar(size='24')
                              v-icon(color='red') mdi-file-hidden
                            v-list-item-content {{$t('common:actions.delete')}}
                template(slot='loading')
                  span {{$t('common:dataIterator.loadingText')}}
                template(slot='no-data')
                  span(v-if='management') {{$t('editor:assets.folderEmpty')}}
                  v-alert.mt-3.radius-7(v-else, icon='mdi-folder-open-outline', :value='true', outlined, color='teal') {{$t('editor:assets.folderEmpty')}}
              .py-2.editor-media-pagination(v-if='management')
                span.caption.editor-media-file-count {{$t('editor:assets.fileCountTotal', { count: assets.length })}}
                v-pagination(v-model='pagination', :length='Math.max(1, pageTotal)', :disabled='pageTotal === 0', :total-visible='5', color='teal')
                v-select.editor-media-page-size(
                  v-model='itemsPerPage'
                  :items='pageSizeOptions'
                  :aria-label='$t("editor:assets.itemsPerPage")'
                  dense
                  hide-details
                  outlined
                )
              .text-xs-center.py-2(v-else-if='pageTotal > 1')
                v-pagination(v-model='pagination', :length='pageTotal', color='teal')
              .d-flex.mt-3.editor-media-footer
                v-select.editor-media-alignment(
                  v-if='management && insertion'
                  v-model='imageAlignment'
                  :items='imageAlignments'
                  :label='$t("editor:assets.imageAlign")'
                  :disabled='currentAsset.kind !== `IMAGE`'
                  dense
                  outlined
                  hide-details
                )
                v-spacer(v-if='management')
                v-toolbar.radius-7(v-else, flat, :color='$vuetify.theme.dark ? `grey darken-2` : `grey lighten-4`', dense, height='44')
                  .body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-1` : `grey--text text--darken-1`') {{$t('editor:assets.fileCount', { count: assets.length })}}
                v-btn.ml-3.mr-0.my-0.radius-7(color='red darken-2', large, @click='cancel', dark)
                  v-icon(left) mdi-close
                  span {{$t(management && !selection ? 'common:actions.close' : 'common:actions.cancel')}}
                v-btn.ml-3.mr-0.my-0.radius-7(v-if='!management || selection', color='teal', large, @click='insert', :disabled='!currentAsset.id', :dark='!!currentAsset.id')
                  v-icon(left) mdi-playlist-plus
                  span {{$t(selection && !insertion ? 'common:actions.select' : 'common:actions.insert')}}

        v-flex(v-if='!management', xs12, lg3)
          v-card.radius-7.animated.fadeInRight.wait-p3s(:light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark')
            v-card-text
              .d-flex
                v-toolbar.radius-7(:color='$vuetify.theme.dark ? `teal` : `teal lighten-5`', dense, flat, height='44')
                  v-icon.mr-3(:color='$vuetify.theme.dark ? `white` : `teal`') mdi-cloud-upload
                  .body-2(:class='$vuetify.theme.dark ? `white--text` : `teal--text`') {{$t('editor:assets.uploadAssets')}}
                v-btn.my-0.ml-3.mr-0.radius-7(outlined, large, color='teal', @click='browse', v-if='$vuetify.breakpoint.mdAndUp')
                  v-icon(left) mdi-plus-box-multiple
                  span(:class='$vuetify.theme.dark ? `teal--text text--lighten-3` : ``') {{$t('common:actions.browse')}}
              file-pond.mt-3(
                name='mediaUpload'
                ref='pond'
                v-bind='filePondLabels'
                allow-multiple='true'
                :files='files'
                max-files='10'
                :server='filePondServerOpts'
                :instant-upload='false'
                :allow-revert='false'
                @processfile='onFileProcessed'
              )
            v-divider
            v-card-actions.pa-3
              .caption.grey--text.text-darken-2 {{ $t('editor:assets.uploadLimit') }}
              v-spacer
              v-btn.px-4(color='teal', dark, @click='upload') {{$t('common:actions.upload')}}

          //- v-card.mt-3.radius-7.animated.fadeInRight.wait-p4s(:light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark')
          //-   v-card-text.pb-0
          //-     v-toolbar.radius-7(:color='$vuetify.theme.dark ? `teal` : `teal lighten-5`', dense, flat)
          //-       v-icon.mr-3(:color='$vuetify.theme.dark ? `white` : `teal`') mdi-cloud-download
          //-       .body-2(:class='$vuetify.theme.dark ? `white--text` : `teal--text`') {{$t('editor:assets.fetchImage')}}
          //-       v-spacer
          //-       v-chip(label, color='white', small).teal--text coming soon
          //-     v-text-field.mt-3(
          //-       v-model='remoteImageUrl'
          //-       outlined
          //-       color='teal'
          //-       single-line
          //-       placeholder='https://example.com/image.jpg'
          //-     )
          //-   v-divider
          //-   v-card-actions.pa-3
          //-     .caption.grey--text.text-darken-2 Max 5 MB
          //-     v-spacer
          //-     v-btn.px-4(color='teal', disabled) {{$t('common:actions.fetch')}}

          v-card.mt-3.radius-7.animated.fadeInRight.wait-p4s(v-if='!management', :light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark')
            v-card-text.pb-0
              v-toolbar.radius-7(:color='$vuetify.theme.dark ? `teal` : `teal lighten-5`', dense, flat)
                v-icon.mr-3(:color='$vuetify.theme.dark ? `white` : `teal`') mdi-format-align-top
                .body-2(:class='$vuetify.theme.dark ? `white--text` : `teal--text`') {{$t('editor:assets.imageAlign')}}
              v-select.mt-3(
                v-model='imageAlignment'
                :items='imageAlignments'
                outlined
                single-line
                color='teal'
                :placeholder='$t("editor:assets.imageAlignOption.none")'
              )

    v-dialog(v-if='management && canUploadAssets', v-model='uploadDialog', max-width='700', :persistent='uploadLoading')
      v-card.editor-media-upload-dialog
        .dialog-header.is-short
          span.editor-media-upload-title {{$t('editor:assets.uploadFiles')}}
          v-spacer
          v-btn(outlined, color='teal', :disabled='uploadLoading', @click='browse')
            v-icon(left) mdi-plus-box-multiple
            span {{$t('common:actions.browse')}}
        v-divider
        v-card-text.pt-5.pb-5
          file-pond(
            name='mediaUpload'
            ref='pond'
            v-bind='filePondLabels'
            allow-multiple='true'
            :files='files'
            max-files='10'
            :server='filePondServerOpts'
            :instant-upload='false'
            :allow-revert='false'
            @processfile='onFileProcessed'
          )
        v-divider
        v-card-actions.pa-3
          .caption.grey--text.text--darken-2 {{ uploadLimitText }}
          v-spacer
          v-btn(color='red darken-2', dark, :disabled='uploadLoading', @click='uploadDialog = false') {{$t('common:actions.close')}}
          v-btn.px-4(color='teal', dark, :loading='uploadLoading', @click='upload') {{$t('common:actions.upload')}}

    v-dialog(v-model='previewDialog', max-width='733', :aria-label='$t("editor:assets.imagePreview")')
      v-card.editor-media-preview-dialog
        .dialog-header.is-short {{ currentAsset.filename }}
        v-card-text.pa-4
          img(v-if='previewDialog && currentAsset.kind === `IMAGE`', :src='currentAssetUrl', :alt='currentAsset.filename')

    //- RENAME DIALOG

    v-dialog(v-model='renameDialog', max-width='550')
      v-card
        .dialog-header.is-short.is-orange
          v-icon.mr-2(color='white') mdi-keyboard
          span {{$t('editor:assets.renameAsset')}}
        v-card-text.pt-5
          .body-2 {{$t('editor:assets.renameAssetSubtitle')}}
          v-text-field(
            outlined
            single-line
            :counter='255'
            v-model='renameAssetName'
            @keyup.enter='renameAsset'
            :disabled='renameAssetLoading'
          )
        v-card-chin
          v-spacer
          v-btn.editor-media-rename-cancel(outlined, text, @click='renameDialog = false', :disabled='renameAssetLoading') {{$t('common:actions.cancel')}}
          v-btn.px-3(color='orange darken-3', @click='renameAsset', :loading='renameAssetLoading').white--text {{$t('common:actions.rename')}}

    //- DELETE DIALOG

    v-dialog(v-model='deleteDialog', max-width='550', persistent)
      v-card
        .dialog-header.is-short.is-red
          v-icon.mr-2(color='white') mdi-trash-can-outline
          span {{$t('editor:assets.deleteAsset')}}
        v-card-text.pt-5
          .body-2 {{$t('editor:assets.deleteAssetConfirm')}}
          .body-2.red--text.text--darken-2 {{currentAsset.filename}}?
          .caption.mt-3 {{$t('editor:assets.deleteAssetWarn')}}
        v-card-chin
          v-spacer
          v-btn(text, @click='deleteDialog = false', :disabled='deleteAssetLoading') {{$t('common:actions.cancel')}}
          v-btn.px-3(color='red darken-2', @click='deleteAsset', :loading='deleteAssetLoading').white--text {{$t('common:actions.delete')}}

    v-dialog(v-model='batchDeleteDialog', max-width='550', persistent)
      v-card
        .dialog-header.is-short.is-red
          v-icon.mr-2(color='white') mdi-trash-can-outline
          span {{$t('editor:assets.deleteSelected')}}
        v-card-text.pt-5
          .body-2 {{$t('editor:assets.deleteSelectedConfirm', { count: selectedAssets.length })}}
          .caption.mt-3 {{$t('editor:assets.deleteAssetWarn')}}
        v-card-chin
          v-spacer
          v-btn(text, @click='batchDeleteDialog = false', :disabled='batchDeleteLoading') {{$t('common:actions.cancel')}}
          v-btn.px-3(color='red darken-2', @click='deleteSelectedAssets', :disabled='selectedAssets.length === 0', :loading='batchDeleteLoading').white--text {{$t('common:actions.delete')}}

    v-dialog(v-model='deleteFolderDialog', max-width='550', persistent)
      v-card
        .dialog-header.is-short.is-red
          v-icon.mr-2(color='white') mdi-folder-remove-outline
          span {{$t('editor:assets.deleteFolder')}}
        v-card-text.pt-5
          .body-2 {{$t('editor:assets.deleteFolderConfirm')}}
          .body-2.red--text.text--darken-2 {{currentFolderPath}}
          .caption.mt-3 {{$t('editor:assets.deleteAssetWarn')}}
        v-card-chin
          v-spacer
          v-btn(text, @click='deleteFolderDialog = false', :disabled='deleteFolderLoading') {{$t('common:actions.cancel')}}
          v-btn.px-3(color='red darken-2', @click='deleteFolder', :loading='deleteFolderLoading').white--text {{$t('common:actions.delete')}}
</template>

<script>
/* global siteConfig */
import _ from 'lodash'
import { get, sync } from 'vuex-pathify'
import Cookies from 'js-cookie'
import sanitizeFilename from 'sanitize-filename'
import vueFilePond from 'vue-filepond'
import 'filepond/dist/filepond.min.css'

import listAssetQuery from 'gql/editor/editor-media-query-list.gql'
import listFolderAssetQuery from 'gql/editor/editor-media-query-folder-list.gql'
import folderEmptyQuery from 'gql/editor/editor-media-query-folder-empty.gql'
import uploadLimitQuery from 'gql/editor/editor-media-query-upload-limit.gql'
import createAssetFolderMutation from 'gql/editor/editor-media-mutation-folder-create.gql'
import deleteAssetFolderMutation from 'gql/editor/editor-media-mutation-folder-delete.gql'
import renameAssetMutation from 'gql/editor/editor-media-mutation-asset-rename.gql'
import deleteAssetMutation from 'gql/editor/editor-media-mutation-asset-delete.gql'
import zhTranslations from '../../../data/sideload/zh.json'
import enTranslations from '../../../data/sideload/en.json'

const FilePond = vueFilePond()
const localeSegmentRegex = /^[A-Z]{2}(-[A-Z]{2})?$/i
const disallowedFolderChars = /[A-Z()=.!@#$%?&*+`~<>,;:\\/[\]¬{| ]/
const imageAlignmentTranslationKeys = [
  'assets.folders',
  'assets.deleteSelected',
  'assets.imageAlign',
  'assets.imageAlignOption.none',
  'assets.imageAlignOption.left',
  'assets.imageAlignOption.center',
  'assets.imageAlignOption.right',
  'assets.imageAlignOption.absoluteTopRight'
]
const filePondLabelTranslationKeys = {
  labelIdle: 'assets.uploadAssetsDropZone',
  labelInvalidField: 'assets.filepond.invalidField',
  labelFileWaitingForSize: 'assets.filepond.fileWaitingForSize',
  labelFileSizeNotAvailable: 'assets.filepond.fileSizeNotAvailable',
  labelFileCountSingular: 'assets.filepond.fileCountSingular',
  labelFileCountPlural: 'assets.filepond.fileCountPlural',
  labelFileLoading: 'assets.filepond.fileLoading',
  labelFileAdded: 'assets.filepond.fileAdded',
  labelFileLoadError: 'assets.filepond.fileLoadError',
  labelFileRemoved: 'assets.filepond.fileRemoved',
  labelFileRemoveError: 'assets.filepond.fileRemoveError',
  labelFileProcessing: 'assets.filepond.fileProcessing',
  labelFileProcessingComplete: 'assets.filepond.fileProcessingComplete',
  labelFileProcessingAborted: 'assets.filepond.fileProcessingAborted',
  labelFileProcessingError: 'assets.filepond.fileProcessingError',
  labelFileProcessingRevertError: 'assets.filepond.fileProcessingRevertError',
  labelTapToCancel: 'assets.filepond.tapToCancel',
  labelTapToRetry: 'assets.filepond.tapToRetry',
  labelTapToUndo: 'assets.filepond.tapToUndo',
  labelButtonRemoveItem: 'assets.filepond.buttonRemoveItem',
  labelButtonAbortItemLoad: 'assets.filepond.buttonAbortItemLoad',
  labelButtonRetryItemLoad: 'assets.filepond.buttonRetryItemLoad',
  labelButtonAbortItemProcessing: 'assets.filepond.buttonAbortItemProcessing',
  labelButtonUndoItemProcessing: 'assets.filepond.buttonUndoItemProcessing',
  labelButtonRetryItemProcessing: 'assets.filepond.buttonRetryItemProcessing',
  labelButtonProcessItem: 'assets.filepond.buttonProcessItem'
}

export default {
  components: {
    FilePond
  },
  props: {
    management: {
      type: Boolean,
      default: false
    },
    selection: {
      type: Boolean,
      default: false
    },
    insertion: {
      type: Boolean,
      default: false
    },
    value: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      folders: [],
      assetFolderTree: [{
        id: 0,
        name: this.$t('common:sidebar.root'),
        path: [],
        children: []
      }],
      openAssetFolders: [0],
      files: [],
      assets: [],
      selectedAssets: [],
      pagination: 1,
      itemsPerPage: 20,
      remoteImageUrl: '',
      imageAlignment: '',
      loading: false,
      uploadDialog: false,
      uploadLoading: false,
      uploadMaxFileSize: null,
      uploadLimitRequest: 0,
      newFolderDialog: false,
      newFolderName: '',
      newFolderLoading: false,
      deleteFolderDialog: false,
      deleteFolderLoading: false,
      emptyFolderId: null,
      folderEmptyRequest: 0,
      previewDialog: false,
      assetActionsFileId: null,
      renameDialog: false,
      renameAssetName: '',
      renameAssetLoading: false,
      deleteDialog: false,
      deleteAssetLoading: false,
      batchDeleteDialog: false,
      batchDeleteLoading: false
    }
  },
  computed: {
    canUploadAssets () {
      return _.some(_.get(this.$store, 'state.user.permissions', []), permission => ['manage:system', 'write:assets'].includes(permission))
    },
    canManageAssets () {
      return _.some(_.get(this.$store, 'state.user.permissions', []), permission => ['manage:system', 'manage:assets'].includes(permission))
    },
    canDeleteCurrentFolder () {
      return this.management && this.canManageAssets && this.currentFolderId > 0 && this.emptyFolderId === this.currentFolderId
    },
    isShown: {
      get() { return this.value },
      set(val) { this.$emit('input', val) }
    },
    editorKey: get('editor/editorKey'),
    activeModal: sync('editor/activeModal'),
    folderTree: get('editor/media@folderTree'),
    currentFolderId: sync('editor/media@currentFolderId'),
    currentFileId: sync('editor/media@currentFileId'),
    currentFolderPath () {
      const path = this.folderTree.map(folder => folder.slug).join('/')
      return path ? `/${path}/` : '/'
    },
    uploadLimitText () {
      if (!Number.isSafeInteger(this.uploadMaxFileSize) || this.uploadMaxFileSize < 0) {
        return this.$t('editor:assets.uploadLimitCount')
      }
      let size = this.uploadMaxFileSize
      let unit = 'B'
      for (const nextUnit of ['KB', 'MB', 'GB']) {
        if (size === 0 || size % 1024 !== 0) {
          break
        }
        size /= 1024
        unit = nextUnit
      }
      return this.$t('editor:assets.uploadLimitDynamic', { size: `${size} ${unit}` })
    },
    pageTotal () {
      if (!this.assets) {
        return 0
      }

      return Math.ceil(this.assets.length / (this.management ? this.itemsPerPage : 15))
    },
    pageSizeOptions () {
      return [20, 50, 100].map(value => ({
        text: this.$t('editor:assets.pageSizeOption', { count: value }),
        value
      }))
    },
    filePondLabels () {
      return Object.entries(filePondLabelTranslationKeys).reduce((labels, [label, key]) => {
        labels[label] = this.$t(`editor:${key}`)
        return labels
      }, {})
    },
    imageAlignments () {
      return [
        { text: this.$t('editor:assets.imageAlignOption.none'), value: '' },
        { text: this.$t('editor:assets.imageAlignOption.left'), value: 'left' },
        { text: this.$t('editor:assets.imageAlignOption.center'), value: 'center' },
        { text: this.$t('editor:assets.imageAlignOption.right'), value: 'right' },
        { text: this.$t('editor:assets.imageAlignOption.absoluteTopRight'), value: 'abstopright' }
      ]
    },
    headers() {
      return _.compact([
        this.management && this.canManageAssets && { value: 'data-table-select', width: 56, sortable: false },
        this.$vuetify.breakpoint.smAndUp && { text: this.$t(this.management ? 'editor:assets.headerNumber' : 'editor:assets.headerId'), value: 'id', width: 80, sortable: !this.management, align: this.management ? 'center' : 'start' },
        { text: this.$t('editor:assets.headerFilename'), value: 'filename' },
        this.$vuetify.breakpoint.lgAndUp && { text: this.$t('editor:assets.headerType'), value: 'ext', width: 90 },
        this.$vuetify.breakpoint.mdAndUp && { text: this.$t('editor:assets.headerFileSize'), value: 'fileSize', width: 110 },
        this.$vuetify.breakpoint.mdAndUp && { text: this.$t('editor:assets.headerAdded'), value: 'createdAt', width: 175 },
        (this.$vuetify.breakpoint.smAndUp || this.management) && { text: this.$t('editor:assets.headerActions'), value: '', width: 80, sortable: false, align: 'center', class: 'editor-media-actions' }
      ])
    },
    isFolderNameValid() {
      return this.newFolderName.length > 1 && !localeSegmentRegex.test(this.newFolderName) && !disallowedFolderChars.test(this.newFolderName)
    },
    currentAsset () {
      return _.find(this.assets, ['id', this.currentFileId]) || {}
    },
    currentAssetUrl () {
      if (!this.currentAsset.filename) {
        return ''
      }
      const segments = this.folderTree.map(folder => folder.slug).concat(this.currentAsset.filename)
      return `${window.location.origin}/${segments.map(segment => encodeURIComponent(segment)).join('/')}`
    },
    filePondServerOpts () {
      const jwtToken = Cookies.get('jwt')
      return {
        process: {
          url: '/u',
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      }
    }
  },
  watch: {
    currentFolderId() {
      this.selectedAssets = []
      this.checkFolderEmpty()
    },
    folders() {
      this.checkFolderEmpty()
    },
    assets() {
      this.checkFolderEmpty()
    },
    itemsPerPage() {
      this.pagination = 1
    },
    newFolderDialog(newValue, oldValue) {
      if (newValue) {
        this.$nextTick(() => {
          this.$refs.folderNameIpt.focus()
        })
      }
    }
  },
  filters: {
    prettyBytes(num) {
      if (typeof num !== 'number' || isNaN(num)) {
        throw new TypeError('Expected a number')
      }

      let exponent
      let unit
      let neg = num < 0
      let units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

      if (neg) {
        num = -num
      }
      if (num < 1) {
        return (neg ? '-' : '') + num + ' B'
      }
      exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
      num = (num / Math.pow(1000, exponent)).toFixed(2) * 1
      unit = units[exponent]

      return (neg ? '-' : '') + num + ' ' + unit
    }
  },
  created() {
    const i18next = this.$i18n.i18next
    for (const [locale, translations] of Object.entries({ zh: zhTranslations, en: enTranslations })) {
      for (const key of imageAlignmentTranslationKeys) {
        i18next.addResource(locale, 'editor', key, translations[`editor:${key}`])
      }
      if (i18next.getResource(locale, 'common', 'dataIterator.loadingText') === undefined) {
        i18next.addResource(locale, 'common', 'dataIterator.loadingText', translations['common:dataIterator.loadingText'])
      }
      for (const key of ['assets.itemsPerPage', 'assets.headerNumber', 'assets.fileCountTotal', 'assets.pageSizeOption', 'assets.currentFolderPath', 'assets.selectPage', 'assets.selectFile', 'assets.renameFileAction', 'assets.deleteFileAction', 'assets.previewFileAction', 'assets.imagePreview', 'assets.fileActions', 'assets.fileActionsFor', 'assets.copyLink', 'assets.copyLinkSuccess', 'assets.copyLinkError', 'assets.deleteSelectedConfirm', 'assets.deleteSelectedSuccess', 'assets.deleteSelectedPartial', 'assets.deleteFolder', 'assets.deleteFolderConfirm', 'assets.deleteFolderNotEmpty', 'assets.deleteFolderInvalid', 'assets.deleteFolderForbidden', 'assets.deleteFolderSuccess', 'assets.uploadFiles', 'assets.uploadLimitDynamic', 'assets.uploadLimitCount']) {
        if (i18next.getResource(locale, 'editor', key) === undefined) {
          i18next.addResource(locale, 'editor', key, translations[`editor:${key}`])
        }
      }
      for (const key of Object.values(filePondLabelTranslationKeys)) {
        if (i18next.getResource(locale, 'editor', key) === undefined) {
          i18next.addResource(locale, 'editor', key, translations[`editor:${key}`])
        }
      }
    }
  },
  mounted() {
    if (this.management) {
      this.$store.set('editor/media@folderTree', [])
      this.currentFolderId = 0
      this.currentFileId = null
      this.$el.focus()
    }
  },
  methods: {
    async openUploadDialog() {
      this.uploadDialog = true
      this.uploadMaxFileSize = null
      const request = ++this.uploadLimitRequest
      try {
        const response = await this.$apollo.query({
          query: uploadLimitQuery,
          fetchPolicy: 'network-only'
        })
        if (request === this.uploadLimitRequest) {
          this.uploadMaxFileSize = _.get(response, 'data.assets.uploadMaxFileSize', null)
        }
      } catch (err) {
        if (request === this.uploadLimitRequest) {
          this.$store.commit('pushGraphError', err)
        }
      }
    },
    async checkFolderEmpty() {
      const request = ++this.folderEmptyRequest
      const folderId = this.currentFolderId
      this.emptyFolderId = null
      if (!this.management || !this.canManageAssets || !folderId || folderId < 0) {
        return
      }
      try {
        const response = await this.$apollo.query({
          query: folderEmptyQuery,
          variables: { folderId },
          fetchPolicy: 'network-only'
        })
        if (request === this.folderEmptyRequest && folderId === this.currentFolderId && _.get(response, 'data.assets.folderEmpty') === true) {
          this.emptyFolderId = folderId
        }
      } catch (err) {
        if (request === this.folderEmptyRequest) {
          this.$store.commit('pushGraphError', err)
        }
      }
    },
    closeOnEscape() {
      if (this.management && !this.newFolderDialog && !this.renameDialog && this.assetActionsFileId === null && !this.deleteDialog && !this.batchDeleteDialog && !this.deleteFolderDialog && !this.uploadDialog && !this.previewDialog) {
        this.cancel()
      }
    },
    closeOnBackgroundClick(event) {
      if (this.newFolderDialog || this.renameDialog || this.assetActionsFileId !== null || this.deleteDialog || this.batchDeleteDialog || this.deleteFolderDialog || this.uploadDialog || this.previewDialog) {
        return
      }
      if (event.target.closest('.v-card') === event.currentTarget) {
        this.cancel()
      }
    },
    formatAssetDate(date) {
      if (!date) {
        return date
      }
      const value = this.$moment(date)
      if (!value.isValid()) {
        return date
      }
      return value.locale('en').format('YYYY-MM-DD HH:mm:ss')
    },
    async refresh() {
      await this.$apollo.queries.assets.refetch()
      if (this.management) {
        await this.refreshTreeFolder()
      }
      this.$store.commit('showNotification', {
        message: this.$t('editor:assets.refreshSuccess'),
        style: 'success',
        icon: 'check'
      })
    },
    insert () {
      const asset = _.find(this.assets, ['id', this.currentFileId])
      if (!asset) {
        return
      }
      const assetPath = this.folderTree.map(f => f.slug).join('/')
      // eslint-disable-next-line vue/custom-event-name-casing
      this.$root.$emit('editorInsert', {
        kind: asset.kind,
        path: this.currentFolderId > 0 ? `/${assetPath}/${asset.filename}` : `/${asset.filename}`,
        text: asset.filename,
        align: this.imageAlignment
      })
      this.activeModal = ''
    },
    browse () {
      this.$refs.pond.browse()
    },
    async upload () {
      if (this.uploadLoading) {
        return
      }
      const files = this.$refs.pond.getFiles()
      if (files.length < 1) {
        return this.$store.commit('showNotification', {
          message: this.$t('editor:assets.noUploadError'),
          style: 'warning',
          icon: 'warning'
        })
      }
      for (let file of files) {
        file.setMetadata({
          folderId: this.currentFolderId
        })
      }
      this.uploadLoading = true
      try {
        await this.$refs.pond.processFiles()
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      } finally {
        this.uploadLoading = false
      }
    },
    async onFileProcessed (err, file) {
      if (err) {
        return this.$store.commit('showNotification', {
          message: this.$t('editor:assets.uploadFailed'),
          style: 'error',
          icon: 'error'
        })
      }
      _.delay(() => {
        this.$refs.pond.removeFile(file.id)
      }, 5000)

      await this.$apollo.queries.assets.refetch()
    },
    findTreeFolder(id, nodes = this.assetFolderTree) {
      for (const node of nodes) {
        if (node.id === id) {
          return node
        }
        const child = this.findTreeFolder(id, node.children || [])
        if (child) {
          return child
        }
      }
      return null
    },
    async fetchTreeFolders(item) {
      try {
        const response = await this.$apollo.query({
          query: listFolderAssetQuery,
          variables: { parentFolderId: item.id },
          fetchPolicy: 'network-only'
        })
        const children = _.get(response, 'data.assets.folders', [])
        item.children = children.map(folder => {
          const previous = (item.children || []).find(child => child.id === folder.id)
          return {
            ...folder,
            path: item.path.concat(folder),
            children: previous ? previous.children : []
          }
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
        throw err
      }
    },
    async refreshTreeFolder() {
      const folder = this.findTreeFolder(this.currentFolderId)
      if (folder) {
        await this.fetchTreeFolders(folder)
      }
    },
    updateTreeOpen(open) {
      const nodes = _.uniq([0, ...open])
      if (!_.isEqual(nodes, this.openAssetFolders)) {
        this.openAssetFolders = nodes
      }
    },
    selectTreeFolder(active) {
      const folder = this.findTreeFolder(active[0])
      if (!folder) {
        return
      }
      this.$store.set('editor/media@folderTree', folder.path)
      this.currentFolderId = folder.id
      this.currentFileId = null
      this.pagination = 1
      this.$nextTick(() => this.updateTreeOpen([...this.openAssetFolders, ...folder.path.map(parent => parent.id)]))
    },
    downFolder(folder) {
      this.$store.commit('editor/pushMediaFolderTree', folder)
      this.currentFolderId = folder.id
      this.currentFileId = null
      if (this.management) {
        this.$nextTick(() => this.$el.focus())
      }
    },
    upFolder() {
      this.$store.commit('editor/popMediaFolderTree')
      const parentFolder = _.last(this.folderTree)
      this.currentFolderId = parentFolder ? parentFolder.id : 0
      this.currentFileId = null
      if (this.management) {
        this.$nextTick(() => this.$el.focus())
      }
    },
    async createFolder() {
      if (!this.isFolderNameValid || this.newFolderLoading) {
        return
      }
      const parentFolderId = this.currentFolderId
      const slug = sanitizeFilename(this.newFolderName).toLowerCase()
      this.$store.commit(`loadingStart`, 'editor-media-createfolder')
      this.newFolderLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: createAssetFolderMutation,
          variables: {
            parentFolderId,
            slug: this.newFolderName
          }
        })
        if (_.get(resp, 'data.assets.createFolder.responseResult.succeeded', false)) {
          const foldersResponse = await this.$apollo.queries.folders.refetch()
          const folder = _.find(_.get(foldersResponse, 'data.assets.folders', []), { slug })
          if (this.management) {
            await this.refreshTreeFolder()
            if (folder) {
              this.selectTreeFolder([folder.id])
            }
          } else if (folder) {
            this.downFolder(folder)
          }
          this.$store.commit('showNotification', {
            message: this.$t('editor:assets.folderCreateSuccess'),
            style: 'success',
            icon: 'check'
          })
          this.newFolderDialog = false
          this.newFolderName = ''
        } else {
          this.$store.commit('pushGraphError', new Error(_.get(resp, 'data.assets.createFolder.responseResult.message')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.newFolderLoading = false
      this.$store.commit(`loadingStop`, 'editor-media-createfolder')
    },
    async deleteFolder() {
      if (!this.management || !this.canManageAssets || !this.deleteFolderDialog || this.deleteFolderLoading || !this.currentFolderId) {
        return
      }
      const folderId = this.currentFolderId
      const parent = this.findTreeFolder(this.folderTree.length > 1 ? this.folderTree[this.folderTree.length - 2].id : 0)
      this.deleteFolderLoading = true
      try {
        const response = await this.$apollo.mutate({
          mutation: deleteAssetFolderMutation,
          variables: { id: folderId }
        })
        const result = _.get(response, 'data.assets.deleteFolder.responseResult', {})
        if (result.succeeded) {
          this.deleteFolderDialog = false
          if (parent) {
            parent.children = parent.children.filter(folder => folder.id !== folderId)
            this.selectTreeFolder([parent.id])
            try {
              await this.fetchTreeFolders(parent)
            } catch (err) {
              // The local tree is already updated; a later refresh can retry.
            }
          }
          this.$store.commit('showNotification', {
            message: this.$t('editor:assets.deleteFolderSuccess'),
            style: 'success',
            icon: 'check'
          })
        } else {
          const errorKeys = {
            AssetFolderNotEmpty: 'editor:assets.deleteFolderNotEmpty',
            AssetFolderInvalid: 'editor:assets.deleteFolderInvalid',
            AssetDeleteForbidden: 'editor:assets.deleteFolderForbidden'
          }
          if (errorKeys[result.slug]) {
            this.deleteFolderDialog = false
            this.$store.commit('showNotification', {
              message: this.$t(errorKeys[result.slug]),
              style: 'warning',
              icon: 'warning'
            })
          } else {
            this.$store.commit('pushGraphError', new Error(result.message))
          }
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      } finally {
        this.deleteFolderLoading = false
      }
    },
    openPreviewDialog(asset) {
      if (!this.management || asset.kind !== 'IMAGE') {
        return
      }
      this.currentFileId = asset.id
      this.previewDialog = true
    },
    assetPublicUrl(asset) {
      const base = (typeof siteConfig !== 'undefined' && siteConfig.host) || window.location.origin
      const segments = this.folderTree.map(folder => folder.slug).concat(asset.filename)
      return `${base.replace(/\/+$/, '')}/${segments.map(segment => encodeURIComponent(segment)).join('/')}`
    },
    onAssetLinkCopied(event) {
      if (event && event.clearSelection) {
        event.clearSelection()
      }
      this.$store.commit('showNotification', {
        message: this.$t('editor:assets.copyLinkSuccess'),
        style: 'success',
        icon: 'check'
      })
    },
    onAssetLinkCopyError() {
      this.$store.commit('showNotification', {
        message: this.$t('editor:assets.copyLinkError'),
        style: 'red',
        icon: 'alert'
      })
    },
    openRenameDialog(asset = this.currentAsset) {
      if (asset.id !== undefined) {
        this.currentFileId = asset.id
      }
      this.renameAssetName = asset.filename
      this.renameDialog = true
    },
    openDeleteDialog(asset) {
      this.currentFileId = asset.id
      this.deleteDialog = true
    },
    async renameAsset() {
      if (this.management && !this.canManageAssets) {
        return
      }
      this.$store.commit(`loadingStart`, 'editor-media-renameasset')
      this.renameAssetLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: renameAssetMutation,
          variables: {
            id: this.currentFileId,
            filename: this.renameAssetName
          }
        })
        if (_.get(resp, 'data.assets.renameAsset.responseResult.succeeded', false)) {
          await this.$apollo.queries.assets.refetch()
          this.$store.commit('showNotification', {
            message: this.$t('editor:assets.renameSuccess'),
            style: 'success',
            icon: 'check'
          })
          this.renameDialog = false
          this.renameAssetName = ''
        } else {
          this.$store.commit('pushGraphError', new Error(_.get(resp, 'data.assets.renameAsset.responseResult.message')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.renameAssetLoading = false
      this.$store.commit(`loadingStop`, 'editor-media-renameasset')
    },
    async deleteAsset() {
      this.$store.commit(`loadingStart`, 'editor-media-deleteasset')
      this.deleteAssetLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: deleteAssetMutation,
          variables: {
            id: this.currentFileId
          }
        })
        if (_.get(resp, 'data.assets.deleteAsset.responseResult.succeeded', false)) {
          this.selectedAssets = this.selectedAssets.filter(asset => asset.id !== this.currentFileId)
          this.currentFileId = null
          await this.$apollo.queries.assets.refetch()
          this.$store.commit('showNotification', {
            message: this.$t('editor:assets.deleteSuccess'),
            style: 'success',
            icon: 'check'
          })
          this.deleteDialog = false
        } else {
          this.$store.commit('pushGraphError', new Error(_.get(resp, 'data.assets.deleteAsset.responseResult.message')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.deleteAssetLoading = false
      this.$store.commit(`loadingStop`, 'editor-media-deleteasset')
    },
    async deleteSelectedAssets() {
      if (!this.management || !this.canManageAssets || this.batchDeleteLoading || this.selectedAssets.length === 0) {
        return
      }

      const selected = [...this.selectedAssets]
      const deletedIds = []
      this.batchDeleteLoading = true
      this.$store.commit('loadingStart', 'editor-media-deleteasset')
      try {
        for (const asset of selected) {
          try {
            const resp = await this.$apollo.mutate({
              mutation: deleteAssetMutation,
              variables: { id: asset.id }
            })
            if (_.get(resp, 'data.assets.deleteAsset.responseResult.succeeded', false)) {
              deletedIds.push(asset.id)
            }
          } catch (err) {
            // Keep failed files selected so they can be retried.
          }
        }
        this.selectedAssets = this.selectedAssets.filter(asset => !deletedIds.includes(asset.id))
        if (deletedIds.includes(this.currentFileId)) {
          this.currentFileId = null
        }
        try {
          const response = await this.$apollo.queries.assets.refetch()
          const refreshedAssets = _.get(response, 'data.assets.list')
          if (Array.isArray(refreshedAssets)) {
            const availableIds = new Set(refreshedAssets.map(asset => asset.id))
            this.selectedAssets = this.selectedAssets.filter(asset => availableIds.has(asset.id))
          }
        } catch (err) {
          this.$store.commit('pushGraphError', err)
        }
        const failed = selected.length - deletedIds.length
        this.$store.commit('showNotification', {
          message: failed ?
            this.$t('editor:assets.deleteSelectedPartial', { deleted: deletedIds.length, failed }) :
            this.$t('editor:assets.deleteSelectedSuccess', { count: deletedIds.length }),
          style: failed ? 'warning' : 'success',
          icon: failed ? 'warning' : 'check'
        })
        this.batchDeleteDialog = false
      } finally {
        this.batchDeleteLoading = false
        this.$store.commit('loadingStop', 'editor-media-deleteasset')
      }
    },
    cancel () {
      this.activeModal = ''
      this.$emit('close')
    }
  },
  apollo: {
    folders: {
      query: listFolderAssetQuery,
      variables() {
        return {
          parentFolderId: this.currentFolderId
        }
      },
      fetchPolicy: 'network-only',
      update: (data) => data.assets.folders,
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'editor-media-folders-list-refresh')
      }
    },
    assets: {
      query: listAssetQuery,
      variables() {
        return {
          folderId: this.currentFolderId,
          kind: 'ALL'
        }
      },
      throttle: 1000,
      fetchPolicy: 'network-only',
      update: (data) => data.assets.list,
      watchLoading (isLoading) {
        this.loading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'editor-media-list-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.editor-media-rename-cancel.v-btn.v-btn--outlined.v-btn--text:not(:disabled) {
  border-color: #000;
}

.editor-media-preview-dialog .v-card__text {
  max-height: 75vh;
  overflow: auto;
  text-align: center;
}

.editor-media-preview-dialog img {
  max-width: 100%;
  height: auto;
}

.editor-media-folder-create {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;

  .editor-media-folder-create-path {
    display: flex;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 40%;
    padding-top: 16px;
    font-size: 16px;
    white-space: nowrap;
  }

  .editor-media-folder-create-path-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .v-text-field {
    flex: 1 1 0;
    min-width: 0;
  }
}

.editor-media-upload-dialog .dialog-header {
  height: auto;
  min-height: 52px;
  padding: 12px 16px;
  font-size: 1rem;
  color: #009688;
  background-color: transparent;
  background-image: none;
}

.editor-media-upload-dialog .editor-media-upload-title {
  font-size: 18px;
  font-weight: 700;
}

.editor-media-upload-dialog > .v-divider {
  box-shadow: 0 2px 3px -2px rgba(0, 0, 0, .24);
}

.editor-media-upload-dialog .filepond--root {
  margin-bottom: 0;
}

.editor-modal-media {
  position: fixed !important;
  top: 112px;
  left: 64px;
  z-index: 10;
  width: calc(100vw - 64px - 17px);
  height: calc(100vh - 112px - 24px);
  background-color: rgba(darken(mc('grey', '900'), 3%), .9) !important;
  overflow: auto;

  @include until($tablet) {
    left: 40px;
    width: calc(100vw - 40px);
    height: calc(100vh - 112px - 24px);
  }

  &.is-editor-ckeditor {
    top: 64px;
    left: 0;
    width: 100%;
    height: calc(100vh - 64px - 26px);

    @include until($tablet) {
      top: 56px;
      left: 0;
      width: 100%;
      height: calc(100vh - 56px - 24px);
    }
  }

  &.is-editor-code {
    top: 64px;
    height: calc(100vh - 64px - 26px);

    @include until($tablet) {
      top: 56px;
      height: calc(100vh - 56px - 24px);
    }
  }

  &.is-editor-common {
    top: 64px;
    left: 0;
    width: 100%;
    height: calc(100vh - 64px);

    @include until($tablet) {
      top: 56px;
      left: 0;
      width: 100%;
      height: calc(100vh - 56px);
    }
  }

  &.is-management {
    display: flex;
    flex-direction: column;

    > .container {
      flex: 0 0 auto;
      width: 100%;
      max-width: 1200px;
      margin-top: auto;
      margin-bottom: auto;
    }
  }

  .filepond--root {
    margin-bottom: 0;
  }

  .editor-media-layout {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-areas:
      'toolbar toolbar'
      'tree files'
      'tree pagination'
      'footer footer';
  }

  .editor-media-layout > .editor-media-toolbar {
    grid-area: toolbar;
  }

  .editor-media-layout .editor-media-heading {
    min-width: 0;
  }

  .editor-media-layout .editor-media-heading > .v-toolbar__content {
    min-width: 0;
    padding-left: 0;
  }

  .editor-media-title,
  .editor-media-heading-divider,
  .editor-media-heading-path {
    font-size: 18px;
    font-weight: 700;
  }

  .editor-media-title {
    flex-shrink: 0;
  }

  .editor-media-heading-divider {
    flex-shrink: 0;
    margin: 0 10px;
  }

  .editor-media-heading-path {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-media-layout::after {
    content: '';
    grid-area: tree;
    margin-top: 12px;
    margin-bottom: -12px;
    border-right: 1px solid #bdbdbd;
    box-shadow: 3px 0 3px -3px rgba(0, 0, 0, .24);
    pointer-events: none;
  }

  .editor-media-layout > .editor-media-folder-tree,
  .editor-media-layout > .editor-media-files {
    border-top: 1px solid #bdbdbd;
    box-shadow: inset 0 3px 3px -3px rgba(0, 0, 0, .24);
  }

  .editor-media-layout > .editor-media-folder-tree {
    grid-area: tree;
    margin-top: 12px;
    height: 50vh;
    max-height: 560px;
    min-height: 0;
    overflow: auto;
  }

  .editor-media-layout > .editor-media-files {
    grid-area: files;
    min-width: 0;
    margin-top: 12px;
    height: 50vh;
    max-height: 560px;
    overflow-y: auto;
  }

  .editor-media-layout > .editor-media-pagination {
    grid-area: pagination;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    margin-top: 16px;
  }

  .editor-media-page-size {
    flex: 0 0 112px;
    max-width: 112px;
    font-size: 14px;
  }

  .editor-media-page-size.v-text-field--outlined.v-input--dense > .v-input__control > .v-input__slot {
    min-height: 36px;
  }

  .editor-media-page-size .v-select__selections input {
    max-height: 28px;
  }

  .editor-media-page-size .v-input__append-inner {
    margin-top: 6px;
  }

  .editor-media-layout > .editor-media-footer {
    grid-area: footer;
    flex-wrap: wrap;
    row-gap: 12px;
    padding-top: 16px;
    border-top: 1px solid #bdbdbd;
    box-shadow: inset 0 3px 3px -3px rgba(0, 0, 0, .24);
  }

  .editor-media-alignment {
    flex: 0 1 200px;
    min-width: 150px;
    max-width: 200px;
  }

  &.is-editor-common .v-divider {
    box-shadow: 0 2px 3px -2px rgba(0, 0, 0, .24);
  }

  .editor-media-folder-tree .v-treeview-node__label {
    font-size: 13px;
  }

  .editor-media-layout .editor-media-files table {
    min-width: 600px;
    table-layout: fixed;
  }

  .editor-media-layout .editor-media-filename > div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-media-layout .editor-media-preview-button {
    max-width: 100%;
    overflow: hidden;
    color: inherit;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  }

  .editor-media-layout .editor-media-files .editor-media-actions {
    position: sticky;
    right: 0;
    z-index: 1;
    width: 80px;
    min-width: 80px;
    text-align: center;
    background-color: #fff;
  }

  .editor-media-layout .theme--dark.editor-media-files .editor-media-actions {
    background-color: #1e1e1e;
  }

  .editor-media-layout .editor-media-files tr.teal.lighten-5 .editor-media-actions {
    background-color: #e0f2f1;
  }

  .editor-media-layout .editor-media-files tr.grey.darken-3-d5 .editor-media-actions {
    background-color: #353535;
  }

  @media (max-width: 599px) {
    .editor-media-layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'toolbar'
        'tree'
        'files'
        'pagination'
        'footer';
    }

    .editor-media-layout > .editor-media-folder-tree {
      height: 180px;
      min-height: 0;
    }

    .editor-media-layout::after {
      display: none;
    }

    .editor-media-layout .editor-media-files table {
      min-width: 320px;
    }
  }

  .theme--dark .editor-media-layout > .editor-media-folder-tree,
  .theme--dark .editor-media-layout > .editor-media-files,
  .theme--dark .editor-media-layout > .editor-media-footer,
  .theme--dark .editor-media-layout::after {
    border-color: #616161;
  }

  .filepond--drop-label {
    cursor: pointer;

    > label {
      cursor: pointer;
    }
  }

  .filepond--file-action-button.filepond--action-process-item {
    display: none;
  }

  .v-btn--icon {
    padding: 0 20px;
  }
}
</style>
