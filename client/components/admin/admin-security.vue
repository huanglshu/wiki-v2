<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-private.svg', alt='安全', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft 安全
            .subtitle-1.grey--text.animated.fadeInLeft 管理站点安全与上传设置
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span 应用
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg6 xs12)
              v-card.animated.fadeInUp
                v-toolbar(color='red darken-2', dark, dense, flat)
                  v-toolbar-title.subtitle-1 安全设置
                v-card-info(color='red')
                  span 开启或关闭安全功能前，请确认已了解相关影响。
                v-card-text
                  v-switch(
                    inset
                    label='阻止开放重定向'
                    color='red darken-2'
                    v-model='config.securityOpenRedirect'
                    persistent-hint
                    hint='阻止用户控制的 URL 跳转到 Wiki 以外的网站，以防止开放重定向攻击。'
                    )

                  v-divider.mt-3
                  v-switch.mt-3(
                    inset
                    label='阻止 iframe 嵌入'
                    color='red darken-2'
                    v-model='config.securityIframe'
                    persistent-hint
                    hint='阻止其他网站通过 iframe 嵌入 Wiki，以防止点击劫持攻击。'
                    )

                  v-divider.mt-3
                  v-switch(
                    inset
                    label='同源 Referrer 策略'
                    color='red darken-2'
                    v-model='config.securityReferrerPolicy'
                    persistent-hint
                    hint='将 Referrer 请求头限制为同源。'
                    )

                  v-divider.mt-3
                  v-switch(
                    inset
                    label='信任 X-Forwarded-* 代理头'
                    color='red darken-2'
                    v-model='config.securityTrustProxy'
                    persistent-hint
                    hint='当 Wiki.js 前方使用 nginx、Apache 或 Cloudflare 等反向代理时启用，否则请关闭。'
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
                    label='强制使用 HSTS'
                    color='red darken-2'
                    v-model='config.securityHSTS'
                    persistent-hint
                    hint='确保无法通过不安全的 HTTP 连接访问站点。'
                    )
                  v-select.mt-5(
                    outlined
                    label='HSTS 最长有效期'
                    :items='hstsDurations'
                    v-model='config.securityHSTSDuration'
                    prepend-icon='mdi-subdirectory-arrow-right'
                    :disabled='!config.securityHSTS'
                    hide-details
                    style='max-width: 450px;'
                    )
                  .pl-11.mt-3
                    .caption 设置服务器仅通过 HTTPS 提供内容的时间。
                    .caption 建议先从小值开始，确认 Wiki 运行正常后再逐步延长。

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
                  v-toolbar-title.subtitle-1 上传
                v-card-info(color='blue')
                  span 配置文件上传的大小、批量数量及安全检查。
                v-card-text
                  v-text-field.mt-3(
                    outlined
                    label='最大上传文件大小'
                    required
                    v-model='config.uploadMaxFileSize'
                    prepend-icon='mdi-progress-upload'
                    hint='单个文件允许上传的最大大小。'
                    persistent-hint
                    suffix='KB'
                    style='max-width: 450px;'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='单次最大上传数量'
                    required
                    v-model='config.uploadMaxFiles'
                    prepend-icon='mdi-upload-lock'
                    hint='单次允许同时上传的文件数量。'
                    persistent-hint
                    suffix='个文件'
                    style='max-width: 450px;'
                    )
                  v-divider.mt-3
                  v-switch(
                    inset
                    label='扫描并净化 SVG 上传文件'
                    color='primary'
                    v-model='config.uploadScanSVG'
                    persistent-hint
                    hint='扫描上传的 SVG 文件中的安全漏洞，并移除可能存在危险的内容。'
                    )
                  v-divider.mt-3
                  v-switch(
                    inset
                    label='强制下载不安全扩展名的文件'
                    color='primary'
                    v-model='config.uploadForceDownload'
                    persistent-hint
                    hint='直接访问非图片文件时强制下载，防止通过不安全文件扩展名触发 XSS 攻击。'
                    )

              v-card.mt-3.animated.fadeInUp.wait-p2s
                v-toolbar(flat, color='primary', dark, dense)
                  .subtitle-1 登录
                //- v-card-info(color='blue')
                //-   span {{$t('admin:security.loginInfo')}}
                .overline.grey--text.pa-4 登录页面
                .px-4.pb-3
                  v-text-field(
                    outlined
                    label='登录背景图片地址'
                    v-model='config.authLoginBgUrl'
                    hint='登录页背景图片的 URL 或资源路径。'
                    persistent-hint
                    prepend-icon='mdi-image-area'
                    append-icon='mdi-folder-image'
                    @click:append='browseLoginBg'
                  )
                  v-switch(
                    inset
                    label='跳过登录页面'
                    color='primary'
                    v-model='config.authAutoLogin'
                    prepend-icon='mdi-fast-forward'
                    persistent-hint
                    hint='用户已通过身份验证提供方登录时，可直接跳转。'
                    )
                  v-switch(
                    inset
                    label='隐藏本地登录'
                    color='primary'
                    v-model='config.authHideLocal'
                    prepend-icon='mdi-eye-off-outline'
                    persistent-hint
                    hint='隐藏登录页中的本地账户登录选项。'
                    )
                v-divider.mt-3
                .overline.grey--text.pa-4 登录安全
                .px-4.pb-3
                  v-switch.mt-0(
                    inset
                    label='强制使用双重验证'
                    color='primary'
                    v-model='config.authEnforce2FA'
                    prepend-icon='mdi-two-factor-authentication'
                    hint='要求使用双重验证的用户才能登录。'
                    persistent-hint
                  )
                v-divider.mt-3
                .overline.grey--text.pa-4 JWT
                .px-4.pb-3
                  v-text-field(
                    v-model='config.authJwtAudience'
                    outlined
                    prepend-icon='mdi-account-group-outline'
                    label='JWT 受众'
                    hint='JWT 令牌中使用的受众标识。'
                    persistent-hint
                  )
                  v-text-field.mt-3(
                    v-model='config.authJwtExpiration'
                    outlined
                    prepend-icon='mdi-clock-outline'
                    label='令牌有效期'
                    hint='JWT 令牌的有效时长，例如 30m 或 24h。'
                    persistent-hint
                  )
                  v-text-field.mt-3(
                    v-model='config.authJwtRenewablePeriod'
                    outlined
                    prepend-icon='mdi-update'
                    label='令牌续期周期'
                    hint='令牌到期前允许续期的时间窗口，例如 14d。'
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
        { value: 300, text: '5 分钟' },
        { value: 86400, text: '1 天' },
        { value: 604800, text: '1 周' },
        { value: 2592000, text: '1 个月' },
        { value: 31536000, text: '1 年' },
        { value: 63072000, text: '2 年' }
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
          message: '配置保存成功。',
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
