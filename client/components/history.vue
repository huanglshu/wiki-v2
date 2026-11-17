<template lang='pug'>
  v-app(:dark='$vuetify.theme.dark').history
    nav-header(site-header)
    v-content
      v-toolbar.history-toolbar(color='white', light)
        i18next.subheading.history-title.text-truncate(path='history:ui.viewing', tag='div', :options='{ defaultValue: `Viewing history of {{path}}` }')
          strong(place='path') /{{path}}
        template(v-if='$vuetify.breakpoint.mdAndUp')
          v-spacer
          i18next.caption.grey--text.text--darken-2.mr-4(path='history:ui.trailLength', tag='div', :options='{ defaultValue: `Trail Length: {{total}}` }')
            span.history-meta-value(place='total') {{ total }}
          i18next.caption.grey--text.text--darken-2(path='history:ui.pageId', tag='div', :options='{ defaultValue: `ID: {{id}}` }')
            span.history-meta-value(place='id') {{ pageId }}
          v-btn.ml-4.history-return(outlined, color='blue darken-1', @click='goLive') {{ $t('history:ui.returnLive', { defaultValue: 'Return to Live Version' }) }}
      v-container.history-body(fluid, grid-list-xl)
        v-layout.history-layout(row, wrap)
          v-flex.history-trail(xs12, md4, tabindex='0')
            v-chip.my-0.ml-6(
              label
              small
              :color='$vuetify.theme.dark ? `grey darken-2` : `grey lighten-2`'
              :class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-2`'
              )
              span {{ $t('history:ui.live', { defaultValue: 'Live' }) }}
            v-timeline(
              dense
              )
              v-timeline-item.pb-2(
                v-for='(ph, idx) in fullTrail'
                :key='ph.versionId'
                :small='ph.actionType === `edit`'
                :color='trailColor(ph.actionType)'
                :icon='trailIcon(ph.actionType)'
                )
                v-card.radius-7(flat, :class='trailBgColor(ph.actionType)')
                  v-toolbar(flat, :color='trailBgColor(ph.actionType)', height='40')
                    .caption(:title='formatHistoryDate(ph.versionDate, `LLL`)') {{ formatHistoryDate(ph.versionDate, 'll') }}
                    v-divider.mx-3(vertical)
                    i18next.caption.history-action.text-truncate(v-if='ph.actionType === `edit`', path='history:ui.editedBy', tag='div', :options='{ defaultValue: `Edited by {{author}}` }')
                      strong(place='author') {{ ph.authorName }}
                    i18next.caption.history-action.text-truncate(v-else-if='ph.actionType === `move`', path='history:ui.movedBy', tag='div', :options='{ defaultValue: `Moved from {{before}} to {{after}} by {{author}}` }')
                      strong(place='before') {{ ph.valueBefore }}
                      strong(place='after') {{ ph.valueAfter }}
                      strong(place='author') {{ ph.authorName }}
                    i18next.caption.history-action.text-truncate(v-else-if='ph.actionType === `initial`', path='history:ui.createdBy', tag='div', :options='{ defaultValue: `Created by {{author}}` }')
                      strong(place='author') {{ ph.authorName }}
                    i18next.caption.history-action.text-truncate(v-else-if='ph.actionType === `live`', path='history:ui.lastEditedBy', tag='div', :options='{ defaultValue: `Last Edited by {{author}}` }')
                      strong(place='author') {{ ph.authorName }}
                    i18next.caption.history-action.text-truncate(v-else, path='history:ui.unknownBy', tag='div', :options='{ defaultValue: `Unknown Action by {{author}}` }')
                      strong(place='author') {{ ph.authorName }}
                    v-spacer
                    v-menu(offset-x, left)
                      template(v-slot:activator='{ on }')
                        v-btn.mr-2.radius-4(icon, v-on='on', small, tile): v-icon mdi-dots-horizontal
                      v-list(dense, nav).history-promptmenu
                        v-list-item(@click='setDiffSource(ph.versionId)', :disabled='(ph.versionId >= diffTarget && diffTarget !== 0) || ph.versionId === 0')
                          v-list-item-avatar(size='24'): v-avatar A
                          v-list-item-title {{ $t('history:ui.setSource', { defaultValue: 'Set as Differencing Source' }) }}
                        v-list-item(@click='setDiffTarget(ph.versionId)', :disabled='ph.versionId <= diffSource && ph.versionId !== 0')
                          v-list-item-avatar(size='24'): v-avatar B
                          v-list-item-title {{ $t('history:ui.setTarget', { defaultValue: 'Set as Differencing Target' }) }}
                        v-list-item(@click='viewSource(ph.versionId)')
                          v-list-item-avatar(size='24'): v-icon mdi-code-tags
                          v-list-item-title {{ $t('history:ui.viewSource', { defaultValue: 'View Source' }) }}
                        v-list-item(@click='download(ph.versionId)')
                          v-list-item-avatar(size='24'): v-icon mdi-cloud-download-outline
                          v-list-item-title {{ $t('history:ui.download', { defaultValue: 'Download Version' }) }}
                        v-list-item(@click='restore(ph.versionId, ph.versionDate)', :disabled='ph.versionId === 0')
                          v-list-item-avatar(size='24'): v-icon(:disabled='ph.versionId === 0') mdi-history
                          v-list-item-title {{ $t('history:restore.confirmButton', { defaultValue: 'Restore' }) }}
                        v-list-item(@click='branchOff(ph.versionId)')
                          v-list-item-avatar(size='24'): v-icon mdi-source-branch
                          v-list-item-title {{ $t('history:ui.branch', { defaultValue: 'Branch off from here' }) }}
                    v-btn.mr-2.radius-4(
                      @click='setDiffSource(ph.versionId)'
                      icon
                      small
                      depressed
                      tile
                      :class='diffSource === ph.versionId ? `pink white--text` : ($vuetify.theme.dark ? `grey darken-2` : `grey lighten-2`)'
                      :disabled='(ph.versionId >= diffTarget && diffTarget !== 0) || ph.versionId === 0'
                      ): strong A
                    v-btn.mr-0.radius-4(
                      @click='setDiffTarget(ph.versionId)'
                      icon
                      small
                      depressed
                      tile
                      :class='diffTarget === ph.versionId ? `pink white--text` : ($vuetify.theme.dark ? `grey darken-2` : `grey lighten-2`)'
                      :disabled='ph.versionId <= diffSource && ph.versionId !== 0'
                      ): strong B

            v-btn.ma-0.radius-7(
              v-if='total > trail.length'
              block
              color='primary'
              @click='loadMore'
              )
              .caption.white--text {{ $t('history:ui.loadMore', { defaultValue: 'Load More...' }) }}

            v-chip.ma-0(
              v-else
              label
              small
              :color='$vuetify.theme.dark ? `grey darken-2` : `grey lighten-2`'
              :class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-2`'
              ) {{ $t('history:ui.endOfTrail', { defaultValue: 'End of history trail' }) }}

          v-flex.history-diff(xs12, md8)
            v-card.history-diff-card.radius-7(:class='$vuetify.breakpoint.mdAndUp ? `mt-8` : ``')
              v-card-text.history-diff-card__body
                .history-target-summary
                  .history-target-summary__identity
                    .history-target-summary__title {{target.title}}
                    .history-target-summary__description {{target.description}}
                  v-btn.history-target-summary__view(
                    v-if='$vuetify.breakpoint.mdAndUp'
                    color='blue darken-1'
                    small
                    outlined
                    @click='toggleViewMode'
                    )
                    v-icon(left, small) mdi-eye
                    span {{ $t('history:ui.viewMode', { defaultValue: 'View Mode' }) }}
                v-card.history-diff-content.mt-3(light, v-html='diffHTML', flat, tabindex='0')

    v-dialog(v-model='isRestoreConfirmDialogShown', max-width='650', persistent)
      v-card
        .dialog-header.is-orange {{$t('history:restore.confirmTitle')}}
        v-card-text.pa-4
          i18next(tag='span', path='history:restore.confirmText')
            strong(place='date') {{ formatHistoryDate(restoreTarget.versionDate, 'LLL') }}
        v-card-actions
          v-spacer
          v-btn(text, @click='isRestoreConfirmDialogShown = false', :disabled='restoreLoading') {{$t('common:actions.cancel')}}
          v-btn(color='orange darken-2', dark, @click='restoreConfirm', :loading='restoreLoading') {{$t('history:restore.confirmButton')}}

    page-selector(mode='create', v-model='branchOffOpts.modal', :open-handler='branchOffHandle', :path='branchOffOpts.path', :locale='branchOffOpts.locale')

    nav-footer
    notify
    search-results
</template>

<script>
import * as Diff2Html from 'diff2html'
import { createPatch } from 'diff'
import _ from 'lodash'
import gql from 'graphql-tag'

export default {
  i18nOptions: { namespaces: 'history' },
  props: {
    pageId: {
      type: Number,
      default: 0
    },
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: 'home'
    },
    title: {
      type: String,
      default: 'Untitled Page'
    },
    description: {
      type: String,
      default: ''
    },
    createdAt: {
      type: String,
      default: ''
    },
    updatedAt: {
      type: String,
      default: ''
    },
    tags: {
      type: Array,
      default: () => ([])
    },
    authorName: {
      type: String,
      default: 'Unknown'
    },
    authorId: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    liveContent: {
      type: String,
      default: ''
    },
    effectivePermissions: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      source: {
        versionId: 0,
        content: '',
        title: '',
        description: ''
      },
      target: {
        versionId: 0,
        content: '',
        title: '',
        description: ''
      },
      trail: [],
      diffSource: 0,
      diffTarget: 0,
      offsetPage: 0,
      total: 0,
      viewMode: 'line-by-line',
      cache: [],
      restoreTarget: {
        versionId: 0,
        versionDate: ''
      },
      branchOffOpts: {
        versionId: 0,
        locale: 'en',
        path: 'new-page',
        modal: false
      },
      isRestoreConfirmDialogShown: false,
      restoreLoading: false
    }
  },
  computed: {
    fullTrail () {
      const liveTrailItem = {
        versionId: 0,
        authorId: this.authorId,
        authorName: this.authorName,
        actionType: 'live',
        valueBefore: null,
        valueAfter: null,
        versionDate: this.updatedAt
      }
      // -> Check for move between latest and live
      const prevPage = _.find(this.cache, ['versionId', _.get(this.trail, '[0].versionId', -1)])
      if (prevPage && this.path !== prevPage.path) {
        liveTrailItem.actionType = 'move'
        liveTrailItem.valueBefore = prevPage.path
        liveTrailItem.valueAfter = this.path
      }
      // -> Combine trail with live
      return [
        liveTrailItem,
        ...this.trail
      ]
    },
    diffs () {
      return createPatch(`/${this.path}`, this.source.content, this.target.content)
    },
    diffHTML () {
      return Diff2Html.html(this.diffs, {
        inputFormat: 'diff',
        drawFileList: false,
        matching: 'lines',
        outputFormat: this.viewMode,
        compiledTemplates: {
          'generic-empty-diff': {
            render: ({ contentClass, CSSLineClass }) => {
              const text = _.escape(this.$t('history:ui.noChanges', { defaultValue: 'File without changes' }))
              return `<tr><td class="${CSSLineClass.INFO}"><div class="${contentClass} ${CSSLineClass.INFO}">${text}</div></td></tr>`
            }
          }
        }
      })
    }
  },
  watch: {
    trail (newValue, oldValue) {
      if (newValue && newValue.length > 0) {
        this.diffTarget = 0
        this.diffSource = _.get(_.head(newValue), 'versionId', 0)
      }
    },
    async diffSource (newValue, oldValue) {
      if (this.diffSource !== this.source.versionId) {
        const page = _.find(this.cache, { versionId: newValue })
        if (page) {
          this.source = page
        } else {
          this.source = await this.loadVersion(newValue)
        }
      }
    },
    async diffTarget (newValue, oldValue) {
      if (this.diffTarget !== this.target.versionId) {
        const page = _.find(this.cache, { versionId: newValue })
        if (page) {
          this.target = page
        } else {
          this.target = await this.loadVersion(newValue)
        }
      }
    }
  },
  created () {
    this.$store.commit('page/SET_ID', this.id)
    this.$store.commit('page/SET_LOCALE', this.locale)
    this.$store.commit('page/SET_PATH', this.path)

    this.$store.commit('page/SET_MODE', 'history')

    this.cache.push({
      action: 'live',
      authorId: this.authorId,
      authorName: this.authorName,
      content: this.liveContent,
      contentType: '',
      createdAt: this.createdAt,
      description: this.description,
      editor: '',
      isPrivate: false,
      isPublished: this.isPublished,
      locale: this.locale,
      pageId: this.pageId,
      path: this.path,
      publishEndDate: '',
      publishStartDate: '',
      tags: this.tags,
      title: this.title,
      versionId: 0,
      versionDate: this.updatedAt
    })

    this.target = this.cache[0]

    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
  },
  methods: {
    formatHistoryDate (date, format) {
      const language = this.$i18n.i18next.language || this.$moment.locale()
      return this.$moment(date).locale(language === 'zh' ? 'zh-cn' : language).format(format)
    },
    async loadVersion (versionId) {
      this.$store.commit(`loadingStart`, 'history-version-' + versionId)
      const resp = await this.$apollo.query({
        query: gql`
          query ($pageId: Int!, $versionId: Int!) {
            pages {
              version (pageId: $pageId, versionId: $versionId) {
                action
                authorId
                authorName
                content
                contentType
                createdAt
                versionDate
                description
                editor
                isPrivate
                isPublished
                locale
                pageId
                path
                publishEndDate
                publishStartDate
                tags
                title
                versionId
              }
            }
          }
        `,
        variables: {
          versionId,
          pageId: this.pageId
        }
      })
      this.$store.commit(`loadingStop`, 'history-version-' + versionId)
      const page = _.get(resp, 'data.pages.version', null)
      if (page) {
        this.cache.push(page)
        return page
      } else {
        return { content: '' }
      }
    },
    viewSource (versionId) {
      window.location.assign(`/s/${this.locale}/${this.path}?v=${versionId}`)
    },
    download (versionId) {
      window.location.assign(`/d/${this.locale}/${this.path}?v=${versionId}`)
    },
    restore (versionId, versionDate) {
      this.restoreTarget = {
        versionId,
        versionDate
      }
      this.isRestoreConfirmDialogShown = true
    },
    async restoreConfirm () {
      this.restoreLoading = true
      this.$store.commit(`loadingStart`, 'history-restore')
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($pageId: Int!, $versionId: Int!) {
              pages {
                restore (pageId: $pageId, versionId: $versionId) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                }
              }
            }
          `,
          variables: {
            versionId: this.restoreTarget.versionId,
            pageId: this.pageId
          }
        })
        if (_.get(resp, 'data.pages.restore.responseResult.succeeded', false) === true) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('history:restore.success'),
            icon: 'check'
          })
          this.isRestoreConfirmDialogShown = false
          setTimeout(() => {
            window.location.assign(`/${this.locale}/${this.path}`)
          }, 1000)
        } else {
          throw new Error(_.get(resp, 'data.pages.restore.responseResult.message', this.$t('common:error.unexpected')))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.$store.commit(`loadingStop`, 'history-restore')
      this.restoreLoading = false
    },
    branchOff (versionId) {
      const pathParts = this.path.split('/')
      this.branchOffOpts = {
        versionId: versionId,
        locale: this.locale,
        path: (pathParts.length > 1) ? _.initial(pathParts).join('/') + `/new-page` : `new-page`,
        modal: true
      }
    },
    branchOffHandle ({ locale, path }) {
      window.location.assign(`/e/${locale}/${path}?from=${this.pageId},${this.branchOffOpts.versionId}`)
    },
    toggleViewMode () {
      this.viewMode = (this.viewMode === 'line-by-line') ? 'side-by-side' : 'line-by-line'
    },
    goLive () {
      window.location.assign(`/${this.path}`)
    },
    setDiffSource (versionId) {
      this.diffSource = versionId
    },
    setDiffTarget (versionId) {
      this.diffTarget = versionId
    },
    loadMore () {
      this.offsetPage++
      this.$apollo.queries.trail.fetchMore({
        variables: {
          id: this.pageId,
          offsetPage: this.offsetPage,
          offsetSize: this.$vuetify.breakpoint.mdAndUp ? 25 : 5
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          return {
            pages: {
              history: {
                total: previousResult.pages.history.total,
                trail: [...previousResult.pages.history.trail, ...fetchMoreResult.pages.history.trail],
                __typename: previousResult.pages.history.__typename
              },
              __typename: previousResult.pages.__typename
            }
          }
        }
      })
    },
    trailColor (actionType) {
      switch (actionType) {
        case 'edit':
          return 'primary'
        case 'move':
          return 'purple'
        case 'initial':
          return 'teal'
        case 'live':
          return 'orange'
        default:
          return 'grey'
      }
    },
    trailIcon (actionType) {
      switch (actionType) {
        case 'edit':
          return '' // 'mdi-pencil'
        case 'move':
          return 'mdi-forward'
        case 'initial':
          return 'mdi-plus'
        case 'live':
          return 'mdi-atom-variant'
        default:
          return 'mdi-alert'
      }
    },
    trailBgColor (actionType) {
      switch (actionType) {
        case 'move':
          return this.$vuetify.theme.dark ? 'purple' : 'purple lighten-5'
        case 'initial':
          return this.$vuetify.theme.dark ? 'teal darken-3' : 'teal lighten-5'
        case 'live':
          return this.$vuetify.theme.dark ? 'orange darken-3' : 'orange lighten-5'
        default:
          return this.$vuetify.theme.dark ? 'grey darken-3' : 'grey lighten-4'
      }
    }
  },
  apollo: {
    trail: {
      query: gql`
        query($id: Int!, $offsetPage: Int, $offsetSize: Int) {
          pages {
            history(id:$id, offsetPage:$offsetPage, offsetSize:$offsetSize) {
              trail {
                versionId
                authorId
                authorName
                actionType
                valueBefore
                valueAfter
                versionDate
              }
              total
            }
          }
        }
      `,
      variables () {
        return {
          id: this.pageId,
          offsetPage: 0,
          offsetSize: this.$vuetify.breakpoint.mdAndUp ? 25 : 5
        }
      },
      manual: true,
      result ({ data, loading, networkStatus }) {
        this.total = data.pages.history.total
        this.trail = data.pages.history.trail
      },
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'history-trail-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

.history {
  > .v-application--wrap {
    height: 100vh;
    height: 100dvh;
    min-height: 0;
  }

  .v-main {
    flex: 1 1 0%;
    min-height: 0;
  }

  .v-main__wrap {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .history-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .history-diff-content {
    max-height: 50vh;
    max-height: 50dvh;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .v-card.history-diff-content {
    border: 1px solid #ddd;
  }

  @media (min-width: 960px) {
    .history-body {
      overflow: hidden;
    }

    .layout.history-layout {
      height: 100%;
      flex-wrap: nowrap;
    }

    .history-trail {
      min-height: 0;
      overflow-y: auto;
    }

    .history-diff,
    .history-diff-card,
    .history-diff-card__body {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .history-diff-card,
    .history-diff-card__body {
      flex: 0 1 auto;
    }

    .history-diff-content {
      flex: 0 1 auto;
      min-height: 0;
      max-height: none;
    }
  }

  .history-toolbar {
    flex: 0 0 auto;
    background-color: #fff !important;
    color: rgba(0, 0, 0, .87) !important;

    .history-title strong {
      color: #1976d2;
    }

    i18next .caption,
    .history-meta-value {
      color: #1976d2 !important;
    }

    .history-meta-value {
      display: inline-block;
      padding: 0 6px;
      border: 1px solid #90caf9;
      border-radius: 3px;
      background-color: #fff;
      line-height: 18px;
    }

    .history-return {
      background-color: #fff !important;
      border-color: #1976d2 !important;
      color: #1976d2 !important;

      .v-btn__content {
        color: #1976d2 !important;
      }
    }
  }

  &-title,
  &-action {
    min-width: 0;
  }

  &-target-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    border-radius: 7px;
    background-color: mc('grey', '200');

    @at-root .theme--dark & {
      background-color: mc('grey', '800');
    }

    @media (max-width: 599px) {
      align-items: stretch;
      flex-direction: column;
    }

    &__identity {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__title {
      font-size: 16px;
      font-weight: 500;
      line-height: 24px;
      overflow-wrap: anywhere;
    }

    &__description {
      font-size: 12px;
      line-height: 18px;
      color: mc('grey', '700');
      overflow-wrap: anywhere;

      @at-root .theme--dark & {
        color: mc('grey', '400');
      }
    }

    &__view {
      flex: 0 0 auto;
      align-self: flex-end;
      background-color: #fff !important;
      border-color: #1976d2 !important;
      color: #1976d2 !important;

      .v-btn__content {
        text-transform: none;
        letter-spacing: 0;
      }
    }
  }

  &-promptmenu {
    border-top: 5px solid mc('blue', '700');
  }

  .d2h-file-wrapper {
    border: 1px solid #EEE;
    border-left: none;
  }

  .d2h-file-header {
    display: none;
  }
}

</style>
