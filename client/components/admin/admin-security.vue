<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-private.svg', :alt='$t("admin:ui.security.title")', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{ $t('admin:ui.security.title') }}
            .subtitle-1.grey--text.animated.fadeInLeft {{ $t('admin:ui.security.subtitle') }}
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{ $t('common:actions.apply') }}
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg6 xs12)
              v-card.animated.fadeInUp
                v-toolbar(color='red darken-2', dark, dense, flat)
                  v-toolbar-title.subtitle-1 {{ $t('admin:ui.security.settings') }}
                v-card-info(color='red')
                  span {{ $t('admin:ui.security.notice') }}
                v-card-text
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.openRedirect.label")'
                    color='red darken-2'
                    v-model='config.securityOpenRedirect'
                    persistent-hint
                    :hint='$t("admin:ui.security.openRedirect.hint")'
                    )

                  v-divider.mt-3
                  v-switch.mt-3(
                    inset
                    :label='$t("admin:ui.security.iframe.label")'
                    color='red darken-2'
                    v-model='config.securityIframe'
                    persistent-hint
                    :hint='$t("admin:ui.security.iframe.hint")'
                    )

                  v-divider.mt-3
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.referrer.label")'
                    color='red darken-2'
                    v-model='config.securityReferrerPolicy'
                    persistent-hint
                    :hint='$t("admin:ui.security.referrer.hint")'
                    )

                  v-divider.mt-3
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.trustProxy.label")'
                    color='red darken-2'
                    v-model='config.securityTrustProxy'
                    persistent-hint
                    :hint='$t("admin:ui.security.trustProxy.hint")'
                    )

                  //- v-divider.mt-3
                  //- v-switch(
                  //-   inset
                  //-   label='Subresource Integrity (SRI)'
                  //-   color='red darken-2'
                  //-   v-model='config.securitySRI'
                  //-   persistent-hint
                  //-   hint='This ensure that resources such as CSS and JS files are not altered during delivery.'
                  //-   disabled
                  //-   )

                  v-divider.mt-3
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.hsts.label")'
                    color='red darken-2'
                    v-model='config.securityHSTS'
                    persistent-hint
                    :hint='$t("admin:ui.security.hsts.hint")'
                    )
                  v-select.mt-5(
                    outlined
                    :label='$t("admin:ui.security.hsts.duration")'
                    :items='hstsDurations'
                    v-model='config.securityHSTSDuration'
                    prepend-icon='mdi-subdirectory-arrow-right'
                    :disabled='!config.securityHSTS'
                    hide-details
                    style='max-width: 450px;'
                    )
                  .pl-11.mt-3
                    .caption {{ $t('admin:ui.security.hsts.durationHint') }}
                    .caption {{ $t('admin:ui.security.hsts.durationHint2') }}

                  //- v-divider.mt-3
                  //- v-switch(
                  //-   inset
                  //-   label='Enforce CSP'
                  //-   color='red darken-2'
                  //-   v-model='config.securityCSP'
                  //-   persistent-hint
                  //-   hint='Restricts scripts to pre-approved content sources.'
                  //-   disabled
                  //-   )
                  //- v-textarea.mt-5(
                  //-   label='CSP Directives'
                  //-   outlined
                  //-   v-model='config.securityCSPDirectives'
                  //-   prepend-icon='mdi-subdirectory-arrow-right'
                  //-   persistent-hint
                  //-   hint='One directive per line.'
                  //-   disabled
                  //- )

            v-flex(lg6 xs12)
              v-card.animated.fadeInUp.wait-p2s
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 {{ $t('admin:ui.security.uploads.title') }}
                v-card-info(color='blue')
                  span {{ $t('admin:ui.security.uploads.info') }}
                v-card-text
                  v-text-field.mt-3(
                    outlined
                    :label='$t("admin:ui.security.uploads.maxSize")'
                    required
                    v-model='config.uploadMaxFileSize'
                    prepend-icon='mdi-progress-upload'
                    :hint='$t("admin:ui.security.uploads.maxSizeHint")'
                    persistent-hint
                    suffix='KB'
                    style='max-width: 450px;'
                    )
                  v-text-field.mt-3(
                    outlined
                    :label='$t("admin:ui.security.uploads.maxBatch")'
                    required
                    v-model='config.uploadMaxFiles'
                    prepend-icon='mdi-upload-lock'
                    :hint='$t("admin:ui.security.uploads.maxBatchHint")'
                    persistent-hint
                    :suffix='$t("admin:ui.security.uploads.fileSuffix")'
                    style='max-width: 450px;'
                    )
                  v-divider.mt-3
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.uploads.scanSvg")'
                    color='primary'
                    v-model='config.uploadScanSVG'
                    persistent-hint
                    :hint='$t("admin:ui.security.uploads.scanSvgHint")'
                    )
                  v-divider.mt-3
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.uploads.forceDownload")'
                    color='primary'
                    v-model='config.uploadForceDownload'
                    persistent-hint
                    :hint='$t("admin:ui.security.uploads.forceDownloadHint")'
                    )

              v-card.mt-3.animated.fadeInUp.wait-p2s
                v-toolbar(flat, color='primary', dark, dense)
                  .subtitle-1 {{ $t('admin:ui.security.login.title') }}
                //- v-card-info(color='blue')
                //-   span {{$t('admin:security.loginInfo')}}
                .overline.grey--text.pa-4 {{ $t('admin:ui.security.login.page') }}
                .px-4.pb-3
                  v-text-field(
                    outlined
                    :label='$t("admin:ui.security.login.background")'
                    v-model='config.authLoginBgUrl'
                    :hint='$t("admin:ui.security.login.backgroundHint")'
                    persistent-hint
                    prepend-icon='mdi-image-area'
                    append-icon='mdi-folder-image'
                    @click:append='browseLoginBg'
                  )
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.login.bypass")'
                    color='primary'
                    v-model='config.authAutoLogin'
                    prepend-icon='mdi-fast-forward'
                    persistent-hint
                    :hint='$t("admin:ui.security.login.bypassHint")'
                    )
                  v-switch(
                    inset
                    :label='$t("admin:ui.security.login.hideLocal")'
                    color='primary'
                    v-model='config.authHideLocal'
                    prepend-icon='mdi-eye-off-outline'
                    persistent-hint
                    :hint='$t("admin:ui.security.login.hideLocalHint")'
                    )
                v-divider.mt-3
                .overline.grey--text.pa-4 {{ $t('admin:ui.security.login.security') }}
                .px-4.pb-3
                  v-switch.mt-0(
                    inset
                    :label='$t("admin:ui.security.login.enforce2fa")'
                    color='primary'
                    v-model='config.authEnforce2FA'
                    prepend-icon='mdi-two-factor-authentication'
                    :hint='$t("admin:ui.security.login.enforce2faHint")'
                    persistent-hint
                  )
                v-divider.mt-3
                .overline.grey--text.pa-4 JWT
                .px-4.pb-3
                  v-text-field(
                    v-model='config.authJwtAudience'
                    outlined
                    prepend-icon='mdi-account-group-outline'
                    :label='$t("admin:ui.security.jwt.audience")'
                    :hint='$t("admin:ui.security.jwt.audienceHint")'
                    persistent-hint
                  )
                  v-text-field.mt-3(
                    v-model='config.authJwtExpiration'
                    outlined
                    prepend-icon='mdi-clock-outline'
                    :label='$t("admin:ui.security.jwt.expiration")'
                    :hint='$t("admin:ui.security.jwt.expirationHint")'
                    persistent-hint
                  )
                  v-text-field.mt-3(
                    v-model='config.authJwtRenewablePeriod'
                    outlined
                    prepend-icon='mdi-update'
                    :label='$t("admin:ui.security.jwt.renewal")'
                    :hint='$t("admin:ui.security.jwt.renewalHint")'
                    persistent-hint
                  )

    component(:is='activeModal')
</template>

<script>
import _ from 'lodash'
import { sync } from 'vuex-pathify'
import gql from 'graphql-tag'

import editorStore from '../../store/editor'

/* global WIKI */

WIKI.$store.registerModule('editor', editorStore)

export default {
  i18nOptions: { namespaces: 'editor' },
  components: {
    editorModalMedia: () => import(/* webpackChunkName: "editor", webpackMode: "lazy" */ '../editor/editor-modal-media.vue')
  },
  data() {
    return {
      config: {
        uploadMaxFileSize: 0,
        uploadMaxFiles: 0,
        uploadScanSVG: true,
        uploadForceDownload: true,
        securityOpenRedirect: true,
        securityIframe: true,
        securityReferrerPolicy: true,
        securityTrustProxy: false,
        securitySRI: true,
        securityHSTS: false,
        securityHSTSDuration: 0,
        securityCSP: false,
        securityCSPDirectives: '',
        authAutoLogin: false,
        authHideLocal: false,
        authLoginBgUrl: '',
        authJwtAudience: 'urn:wiki.js',
        authJwtExpiration: '30m',
        authJwtRenewablePeriod: '14d'
      },
      hstsDurations: [
        { value: 300, text: this.$t('admin:ui.security.hsts.durations.5m') },
        { value: 86400, text: this.$t('admin:ui.security.hsts.durations.1d') },
        { value: 604800, text: this.$t('admin:ui.security.hsts.durations.1w') },
        { value: 2592000, text: this.$t('admin:ui.security.hsts.durations.1mo') },
        { value: 31536000, text: this.$t('admin:ui.security.hsts.durations.1y') },
        { value: 63072000, text: this.$t('admin:ui.security.hsts.durations.2y') }
      ]
    }
  },
  computed: {
    activeModal: sync('editor/activeModal')
  },
  methods: {
    async save () {
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $authAutoLogin: Boolean
              $authEnforce2FA: Boolean
              $authHideLocal: Boolean
              $authLoginBgUrl: String
              $authJwtAudience: String
              $authJwtExpiration: String
              $authJwtRenewablePeriod: String
              $uploadMaxFileSize: Int
              $uploadMaxFiles: Int
              $uploadScanSVG: Boolean
              $uploadForceDownload: Boolean
              $securityOpenRedirect: Boolean
              $securityIframe: Boolean
              $securityReferrerPolicy: Boolean
              $securityTrustProxy: Boolean
              $securitySRI: Boolean
              $securityHSTS: Boolean
              $securityHSTSDuration: Int
              $securityCSP: Boolean
              $securityCSPDirectives: String
            ) {
              site {
                updateConfig(
                  authAutoLogin: $authAutoLogin,
                  authEnforce2FA: $authEnforce2FA,
                  authHideLocal: $authHideLocal,
                  authLoginBgUrl: $authLoginBgUrl,
                  authJwtAudience: $authJwtAudience,
                  authJwtExpiration: $authJwtExpiration,
                  authJwtRenewablePeriod: $authJwtRenewablePeriod,
                  uploadMaxFileSize: $uploadMaxFileSize,
                  uploadMaxFiles: $uploadMaxFiles,
                  uploadScanSVG: $uploadScanSVG
                  uploadForceDownload: $uploadForceDownload,
                  securityOpenRedirect: $securityOpenRedirect,
                  securityIframe: $securityIframe,
                  securityReferrerPolicy: $securityReferrerPolicy,
                  securityTrustProxy: $securityTrustProxy,
                  securitySRI: $securitySRI,
                  securityHSTS: $securityHSTS,
                  securityHSTSDuration: $securityHSTSDuration,
                  securityCSP: $securityCSP,
                  securityCSPDirectives: $securityCSPDirectives
                ) {
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
            authAutoLogin: _.get(this.config, 'authAutoLogin', false),
            authEnforce2FA: _.get(this.config, 'authEnforce2FA', false),
            authHideLocal: _.get(this.config, 'authHideLocal', false),
            authLoginBgUrl: _.get(this.config, 'authLoginBgUrl', ''),
            authJwtAudience: _.get(this.config, 'authJwtAudience', ''),
            authJwtExpiration: _.get(this.config, 'authJwtExpiration', ''),
            authJwtRenewablePeriod: _.get(this.config, 'authJwtRenewablePeriod', ''),
            uploadMaxFileSize: _.toSafeInteger(_.get(this.config, 'uploadMaxFileSize', 0)),
            uploadMaxFiles: _.toSafeInteger(_.get(this.config, 'uploadMaxFiles', 0)),
            uploadScanSVG: _.get(this.config, 'uploadScanSVG', false),
            uploadForceDownload: _.get(this.config, 'uploadForceDownload', false),
            securityOpenRedirect: _.get(this.config, 'securityOpenRedirect', false),
            securityIframe: _.get(this.config, 'securityIframe', false),
            securityReferrerPolicy: _.get(this.config, 'securityReferrerPolicy', false),
            securityTrustProxy: _.get(this.config, 'securityTrustProxy', false),
            securitySRI: _.get(this.config, 'securitySRI', false),
            securityHSTS: _.get(this.config, 'securityHSTS', false),
            securityHSTSDuration: _.get(this.config, 'securityHSTSDuration', 0),
            securityCSP: _.get(this.config, 'securityCSP', false),
            securityCSPDirectives: _.get(this.config, 'securityCSPDirectives', '')
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-site-update')
          }
        })
        this.$store.commit('showNotification', {
          style: 'success',
          message: this.$t('admin:ui.security.saveSuccess'),
          icon: 'check'
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    },
    browseLoginBg () {
      this.$store.set('editor/editorKey', 'common')
      this.activeModal = 'editorModalMedia'
    }
  },
  mounted () {
    this.$root.$on('editorInsert', opts => {
      this.config.authLoginBgUrl = opts.path
    })
  },
  beforeDestroy() {
    this.$root.$off('editorInsert')
  },
  apollo: {
    config: {
      query: gql`
        {
          site {
            config {
              authAutoLogin
              authEnforce2FA
              authHideLocal
              authLoginBgUrl
              authJwtAudience
              authJwtExpiration
              authJwtRenewablePeriod
              uploadMaxFileSize
              uploadMaxFiles
              uploadScanSVG
              uploadForceDownload
              securityOpenRedirect
              securityIframe
              securityReferrerPolicy
              securityTrustProxy
              securitySRI
              securityHSTS
              securityHSTSDuration
              securityCSP
              securityCSPDirectives
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => _.cloneDeep(data.site.config),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-security-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
