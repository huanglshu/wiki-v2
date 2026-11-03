<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 {{ $t('admin:ui.utilities.content.title') }}
    v-card-text
      .subtitle-1.pb-3.primary--text {{ $t('admin:ui.utilities.content.rebuildTitle') }}
      .body-2 {{ $t('admin:ui.utilities.content.rebuildHint') }}
      v-btn(outlined, color='primary', @click='rebuildTree', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span {{ $t('common:actions.continue') }}

      v-divider.my-5

      .subtitle-1.pb-3.primary--text {{ $t('admin:ui.utilities.content.rerenderTitle') }}
      .body-2 {{ $t('admin:ui.utilities.content.rerenderHint') }}
      v-btn(outlined, color='primary', @click='rerenderPages', :disabled='loading', :loading='isRerendering').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span {{ $t('common:actions.continue') }}
      v-dialog(
        v-model='isRerendering'
        persistent
        max-width='450'
        )
        v-card(color='blue darken-2', dark)
          v-card-text.pa-10.text-center
            semipolar-spinner.animated.fadeIn(
              :animation-duration='1500'
              :size='65'
              color='#FFF'
              style='margin: 0 auto;'
            )
            .mt-5.body-1.white--text {{ $t('admin:ui.utilities.content.renderingAll') }}
            .caption(v-if='renderIndex > 0') {{ $t('admin:ui.utilities.content.renderingPath', { path: renderCurrentPath, current: renderIndex, total: renderTotal, progress: renderProgress }) }}
            .caption.mt-4 {{ $t('admin:ui.utilities.content.renderingStay') }}
            v-progress-linear.mt-5(
              color='white'
              :value='renderProgress'
              stream
              rounded
              :buffer-value='0'
            )

      v-divider.my-5

      .subtitle-1.pb-3.pl-0.primary--text {{ $t('admin:ui.utilities.content.migrateTitle') }}
      .body-2 {{ $t('admin:ui.utilities.content.migrateHint') }}
      .body-2.red--text: strong {{ $t('admin:ui.utilities.content.migrateWarning') }}
      v-toolbar.radius-7.mt-5(flat, :color='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-4`', height='80')
        v-select(
          :label='$t("admin:ui.utilities.content.sourceLocale")'
          outlined
          hide-details
          :items='locales'
          item-text='name'
          item-value='code'
          v-model='sourceLocale'
        )
        v-icon.mx-3(large) mdi-chevron-right-box-outline
        v-select(
          :label='$t("admin:ui.utilities.content.targetLocale")'
          outlined
          hide-details
          :items='locales'
          item-text='name'
          item-value='code'
          v-model='targetLocale'
        )
      .body-2.mt-5 {{ $t('admin:ui.utilities.content.migrateNotice') }}
      v-btn(outlined, color='primary', @click='migrateToLocale', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span {{ $t('common:actions.continue') }}

      v-divider.my-5

      .subtitle-1.pb-3.pl-0.primary--text {{ $t('admin:ui.utilities.content.purgeTitle') }}
      .body-2 {{ $t('admin:ui.utilities.content.purgeHint') }}
      .body-2 {{ $t('admin:ui.utilities.content.purgeNotice') }}
      v-toolbar.radius-7.mt-5(flat, :color='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-4`', height='80')
        v-select(
          :label='$t("admin:ui.utilities.content.purgeLabel")'
          outlined
          hide-details
          :items='purgeHistoryOptionsLocalized'
          item-text='title'
          item-value='key'
          v-model='purgeHistorySelection'
        )
      v-btn(outlined, color='primary', @click='purgeHistory', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span {{ $t('common:actions.continue') }}
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'
import utilityContentMigrateLocaleMutation from 'gql/admin/utilities/utilities-mutation-content-migratelocale.gql'
import utilityContentRebuildTreeMutation from 'gql/admin/utilities/utilities-mutation-content-rebuildtree.gql'

import { SemipolarSpinner } from 'epic-spinners'

/* global siteLangs, siteConfig */

export default {
  components: {
    SemipolarSpinner
  },
  data: () => {
    return {
      isRerendering: false,
      loading: false,
      renderProgress: 0,
      renderIndex: 0,
      renderTotal: 0,
      renderCurrentPath: '',
      sourceLocale: '',
      targetLocale: '',
      purgeHistorySelection: 'P1Y',
      purgeHistoryOptions: [
        { key: 'P1D', titleKey: 'admin:ui.utilities.content.periods.today' },
        { key: 'P1M', titleKey: 'admin:ui.utilities.content.periods.oneMonth' },
        { key: 'P3M', titleKey: 'admin:ui.utilities.content.periods.threeMonths' },
        { key: 'P6M', titleKey: 'admin:ui.utilities.content.periods.sixMonths' },
        { key: 'P1Y', titleKey: 'admin:ui.utilities.content.periods.oneYear' },
        { key: 'P2Y', titleKey: 'admin:ui.utilities.content.periods.twoYears' },
        { key: 'P3Y', titleKey: 'admin:ui.utilities.content.periods.threeYears' },
        { key: 'P5Y', titleKey: 'admin:ui.utilities.content.periods.fiveYears' }
      ]
    }
  },
  computed: {
    currentLocale () {
      return siteConfig.lang
    },
    locales () {
      return siteLangs
    },
    purgeHistoryOptionsLocalized () {
      return this.purgeHistoryOptions.map(option => ({
        ...option,
        title: this.$t(option.titleKey)
      }))
    }
  },
  methods: {
    async rebuildTree () {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-rebuildtree')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityContentRebuildTreeMutation
        })
        const resp = _.get(respRaw, 'data.pages.rebuildTree.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: this.$t('admin:ui.utilities.content.rebuildSuccess'),
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-rebuildtree')
      this.loading = false
    },
    async rerenderPages () {
      this.loading = true
      this.isRerendering = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-rerender')

      try {
        const pagesRaw = await this.$apollo.query({
          query: gql`
            {
              pages {
                list {
                  id
                  path
                  locale
                }
              }
            }
          `,
          fetchPolicy: 'network-only'
        })
        if (_.get(pagesRaw, 'data.pages.list', []).length < 1) {
          throw new Error(this.$t('admin:ui.utilities.content.noPages'))
        }

        this.renderIndex = 0
        this.renderTotal = pagesRaw.data.pages.list.length
        let failed = 0
        for (const page of pagesRaw.data.pages.list) {
          this.renderCurrentPath = `${page.locale}/${page.path}`
          this.renderIndex++
          this.renderProgress = Math.round(this.renderIndex / this.renderTotal * 100)
          const respRaw = await this.$apollo.mutate({
            mutation: gql`
              mutation($id: Int!) {
                pages {
                  render(id: $id) {
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
              id: page.id
            }
          })
          const resp = _.get(respRaw, 'data.pages.render.responseResult', {})
          if (!resp.succeeded) {
            failed++
          }
        }
        if (failed > 0) {
          this.$store.commit('showNotification', {
            message: this.$t('admin:ui.utilities.content.rerenderPartial', { failed }),
            style: 'error',
            icon: 'alert'
          })
        } else {
          this.$store.commit('showNotification', {
            message: this.$t('admin:ui.utilities.content.rerenderSuccess'),
            style: 'success',
            icon: 'check'
          })
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-rerender')
      this.isRerendering = false
      this.loading = false
    },
    async migrateToLocale () {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-migratelocale')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityContentMigrateLocaleMutation,
          variables: {
            sourceLocale: this.sourceLocale,
            targetLocale: this.targetLocale
          }
        })
        const resp = _.get(respRaw, 'data.pages.migrateToLocale.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: this.$t('admin:ui.utilities.content.migrateSuccess', { count: _.get(respRaw, 'data.pages.migrateToLocale.count', 0) }),
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-migratelocale')
      this.loading = false
    },
    async purgeHistory () {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-purgehistory')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: gql`
            mutation ($olderThan: String!) {
              pages {
                purgeHistory (
                  olderThan: $olderThan
                ) {
                  responseResult {
                    errorCode
                    message
                    slug
                    succeeded
                  }
                }
              }
            }
          `,
          variables: {
            olderThan: this.purgeHistorySelection
          }
        })
        const resp = _.get(respRaw, 'data.pages.purgeHistory.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: this.$t('admin:ui.utilities.content.purgeSuccess'),
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-purgehistory')
      this.loading = false
    }
  }
}
</script>

<style lang='scss'>

</style>
