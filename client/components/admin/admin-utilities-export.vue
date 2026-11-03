<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 {{ $t('admin:ui.utilities.export.title') }}
    v-card-text
      .text-center
        img.animated.fadeInUp.wait-p1s(src='/_assets/svg/icon-big-parcel.svg')
        .body-2 {{ $t('admin:ui.utilities.export.intro') }}
      v-divider.my-4
      .body-2 {{ $t('admin:ui.utilities.export.choose') }}
      v-checkbox(
        v-for='choice of entityChoices'
        :key='choice.key'
        :label='choice.label'
        :value='choice.key'
        color='deep-orange darken-2'
        hide-details
        v-model='entities'
        )
        template(v-slot:label)
          div
            strong.deep-orange--text.text--darken-2 {{choice.label}}
            .text-caption {{choice.hint}}
      v-text-field.mt-7(
        outlined
        :label='$t("admin:ui.utilities.export.pathLabel")'
        :hint='$t("admin:ui.utilities.export.pathHint")'
        persistent-hint
        v-model='filePath'
      )

      v-alert.mt-3(color='deep-orange', outlined, icon='mdi-alert', prominent)
        .body-2 {{ $t('admin:ui.utilities.export.warning') }}
        .body-2 {{ $t('admin:ui.utilities.export.encryptHint') }}

    v-card-chin
      v-btn.px-3(depressed, color='deep-orange darken-2', :disabled='entities.length < 1', @click='startExport').ml-0
        v-icon(left, color='white') mdi-database-export
        span.white--text {{ $t('admin:ui.utilities.export.start') }}
    v-dialog(
      v-model='isLoading'
      persistent
      max-width='350'
      )
      v-card(color='deep-orange darken-2', dark)
        v-card-text.pa-10.text-center
          self-building-square-spinner.animated.fadeIn(
            :animation-duration='4500'
            :size='40'
            color='#FFF'
            style='margin: 0 auto;'
          )
          .mt-5.body-1.white--text {{ $t('admin:ui.utilities.export.running') }}
          .caption {{ $t('admin:ui.utilities.export.wait') }}
          v-progress-linear.mt-5(
            color='white'
            :value='progress'
            stream
            rounded
            :buffer-value='0'
          )
    v-dialog(
      v-model='isSuccess'
      persistent
      max-width='350'
      )
      v-card(color='green darken-2', dark)
        v-card-text.pa-10.text-center
          v-icon(size='60') mdi-check-circle-outline
          .my-5.body-1.white--text {{ $t('admin:ui.utilities.export.success') }}
        v-card-actions.green.darken-1
          v-spacer
          v-btn.px-5(
            color='white'
            outlined
            @click='isSuccess = false'
          ) {{ $t('common:actions.close') }}
          v-spacer
    v-dialog(
      v-model='isFailed'
      persistent
      max-width='800'
      )
      v-card(color='red darken-2', dark)
        v-toolbar(color='red darken-2', dense)
          v-icon mdi-alert
          .body-2.pl-3 {{ $t('admin:ui.utilities.export.failed') }}
          v-spacer
          v-btn.px-5(
            color='white'
            text
            @click='isFailed = false'
            ) {{ $t('common:actions.close') }}
        v-card-text.pa-5.red.darken-4.white--text
          span {{errorMessage}}
</template>

<script>
import { SelfBuildingSquareSpinner } from 'epic-spinners'

import gql from 'graphql-tag'
import _get from 'lodash/get'

export default {
  components: {
    SelfBuildingSquareSpinner
  },
  data() {
    return {
      entities: [],
      filePath: './data/export',
      isLoading: false,
      isSuccess: false,
      isFailed: false,
      errorMessage: '',
      progress: 0
    }
  },
  computed: {
    entityChoices () {
      return [
        {
          key: 'assets',
          labelKey: 'admin:ui.utilities.export.entities.assets',
          hintKey: 'admin:ui.utilities.export.entities.assetsHint'
        },
        {
          key: 'comments',
          labelKey: 'admin:ui.utilities.export.entities.comments',
          hintKey: 'admin:ui.utilities.export.entities.commentsHint'
        },
        {
          key: 'navigation',
          labelKey: 'admin:ui.utilities.export.entities.navigation',
          hintKey: 'admin:ui.utilities.export.entities.navigationHint'
        },
        {
          key: 'pages',
          labelKey: 'admin:ui.utilities.export.entities.pages',
          hintKey: 'admin:ui.utilities.export.entities.pagesHint'
        },
        {
          key: 'history',
          labelKey: 'admin:ui.utilities.export.entities.history',
          hintKey: 'admin:ui.utilities.export.entities.historyHint'
        },
        {
          key: 'settings',
          labelKey: 'admin:ui.utilities.export.entities.settings',
          hintKey: 'admin:ui.utilities.export.entities.settingsHint'
        },
        {
          key: 'groups',
          labelKey: 'admin:ui.utilities.export.entities.groups',
          hintKey: 'admin:ui.utilities.export.entities.groupsHint'
        },
        {
          key: 'users',
          labelKey: 'admin:ui.utilities.export.entities.users',
          hintKey: 'admin:ui.utilities.export.entities.usersHint'
        }
      ].map(item => ({
        ...item,
        label: this.$t(item.labelKey),
        hint: this.$t(item.hintKey)
      }))
    }
  },
  methods: {
    async checkProgress () {
      try {
        const respStatus = await this.$apollo.query({
          query: gql`
            {
              system {
                exportStatus {
                  status
                  progress
                  message
                  startedAt
                }
              }
            }
          `,
          fetchPolicy: 'network-only'
        })
        const respStatusObj = _get(respStatus, 'data.system.exportStatus', {})
        if (!respStatusObj) {
          throw new Error(this.$t('common:error.unexpected'))
        } else {
          switch (respStatusObj.status) {
            case 'error': {
              throw new Error(respStatusObj.message || this.$t('common:error.unexpected'))
            }
            case 'running': {
              this.progress = respStatusObj.progress || 0
              window.requestAnimationFrame(() => {
                setTimeout(() => {
                  this.checkProgress()
                }, 5000)
              })
              break
            }
            case 'success': {
              this.isLoading = false
              this.isSuccess = true
              break
            }
            default: {
              throw new Error(this.$t('admin:ui.utilities.export.invalidStatus'))
            }
          }
        }
      } catch (err) {
        this.errorMessage = err.message
        this.isLoading = false
        this.isFailed = true
      }
    },
    async startExport () {
      this.isFailed = false
      this.isSuccess = false
      this.isLoading = true
      this.progress = 0

      setTimeout(async () => {
        try {
          // -> Initiate export
          const respExport = await this.$apollo.mutate({
            mutation: gql`
              mutation (
                $entities: [String]!
                $path: String!
              ) {
                system {
                  export (
                    entities: $entities
                    path: $path
                  ) {
                    responseResult {
                      succeeded
                      message
                    }
                  }
                }
              }
            `,
            variables: {
              entities: this.entities,
              path: this.filePath
            }
          })

          const respExportObj = _get(respExport, 'data.system.export', {})
          if (!_get(respExportObj, 'responseResult.succeeded', false)) {
            this.errorMessage = _get(respExportObj, 'responseResult.message', this.$t('common:error.unexpected'))
            this.isLoading = false
            this.isFailed = true
            return
          }

          // -> Check for progress
          this.checkProgress()
        } catch (err) {
          this.$store.commit('pushGraphError', err)
          this.isLoading = false
        }
      }, 1500)
    }
  }
}
</script>

<style lang='scss'>

</style>
