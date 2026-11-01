<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-categorize.svg', alt='常规', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft 常规
            .subtitle-1.grey--text.animated.fadeInLeft 管理站点设置
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span 应用
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg6 xs12)
              v-form
                v-card.animated.fadeInUp
                  v-toolbar(color='primary', dark, dense, flat)
                    v-toolbar-title.subtitle-1 站点信息
                  .overline.grey--text.pa-4 基本信息
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      label='站点地址'
                      required
                      :counter='255'
                      v-model='config.host'
                      prepend-icon='mdi-label-variant-outline'
                      hint='用户访问 Wiki 的完整地址，包含协议和域名。'
                      persistent-hint
                      )
                    v-text-field.mt-3(
                      outlined
                      label='系统名称'
                      required
                      :counter='50'
                      v-model='config.title'
                      prepend-icon='mdi-earth'
                      hint='显示在浏览器标题栏及顶部导航中的站点名称。'
                      persistent-hint
                      )
                  v-divider
                  .overline.grey--text.pa-4 站点标志
                  .pt-2.pb-7.pl-10.pr-3
                    .d-flex.align-center
                      v-avatar(size='100', tile)
                        v-img(
                          :src='config.logoUrl'
                          lazy-src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNcWQ8AAdcBKrJda2oAAAAASUVORK5CYII='
                          aspect-ratio='1'
                          )
                      .ml-4(style='flex: 1 1 auto;')
                        v-text-field(
                          outlined
                          label='标志图片地址'
                          v-model='config.logoUrl'
                          hint='站点标志图片的 URL 或资源路径。'
                          persistent-hint
                          append-icon='mdi-folder-image'
                          @click:append='browseLogo'
                          @keyup.enter='refreshLogo'
                        )
                  v-divider
                  .overline.grey--text.pa-4 页脚与版权
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      label='公司名称'
                      v-model='config.company'
                      :counter='255'
                      prepend-icon='mdi-domain'
                      persistent-hint
                      hint='显示在页脚版权信息中的公司或组织名称。'
                      )
                    v-select.mt-3(
                      outlined
                      label='内容许可协议'
                      :items='contentLicenses'
                      v-model='config.contentLicense'
                      prepend-icon='mdi-creative-commons'
                      :return-object='false'
                      hint='选择站点内容使用的版权许可协议。'
                      persistent-hint
                    )
                    v-text-field.mt-3(
                      outlined
                      label='自定义页脚'
                      v-model='config.footerOverride'
                      prepend-icon='mdi-page-layout-footer'
                      append-icon='mdi-language-markdown'
                      persistent-hint
                      hint='使用 Markdown 自定义站点页脚内容。'
                      )
                  v-divider
                  .overline.grey--text.pa-4 搜索引擎优化
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      label='站点描述'
                      :counter='255'
                      v-model='config.description'
                      prepend-icon='mdi-compass'
                      hint='用于搜索引擎和社交分享的站点简介。'
                      persistent-hint
                      )
                    v-select.mt-3(
                      outlined
                      label='搜索引擎索引规则'
                      multiple
                      :items='metaRobots'
                      v-model='config.robots'
                      prepend-icon='mdi-compass'
                      :return-object='false'
                      hint='控制搜索引擎如何索引和跟踪站点。'
                      persistent-hint
                      )

            v-flex(lg6 xs12)
              v-card.animated.fadeInUp.wait-p4s
                v-toolbar(color='indigo', dark, dense, flat)
                  v-toolbar-title.subtitle-1 功能
                v-card-text
                  //- v-switch(
                  //-   inset
                  //-   label='Asset Image Optimization'
                  //-   color='indigo'
                  //-   v-model='config.featureTinyPNG'
                  //-   persistent-hint
                  //-   hint='Image optimization tool to reduce filesize and bandwidth costs.'
                  //-   disabled
                  //-   )
                  //- v-text-field.mt-3(
                  //-   outlined
                  //-   label='TinyPNG API Key'
                  //-   :counter='255'
                  //-   v-model='config.description'
                  //-   prepend-icon='mdi-subdirectory-arrow-right'
                  //-   hint='Get your API key at https://tinypng.com/developers'
                  //-   persistent-hint
                  //-   disabled
                  //-   )

                  //- v-divider.mt-3
                  //- v-switch(
                  //-   inset
                  //-   label='Page Ratings'
                  //-   color='indigo'
                  //-   v-model='config.featurePageRatings'
                  //-   persistent-hint
                  //-   hint='Allow users to rate pages.'
                  //-   disabled
                  //-   )

                  //- v-divider.mt-3
                  v-switch.mt-0(
                    inset
                    label='评论'
                    color='indigo'
                    v-model='config.featurePageComments'
                    persistent-hint
                    hint='允许用户在页面上发表评论。'
                    )

                  //- v-divider.mt-3
                  //- v-switch(
                  //-   inset
                  //-   label='Personal Wikis'
                  //-   color='indigo'
                  //-   v-model='config.featurePersonalWikis'
                  //-   persistent-hint
                  //-   hint='Allow users to have their own personal wiki.'
                  //-   disabled
                  //-   )

              v-card.mt-5.animated.fadeInUp.wait-p6s
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 URL 处理
                v-card-text
                  v-text-field(
                    outlined
                    label='页面扩展名'
                    v-model='config.pageExtensions'
                    prepend-icon='mdi-format-text-wrapping-overflow'
                    hint='可选的页面 URL 扩展名，使用逗号分隔。'
                    persistent-hint
                    )

              v-card.mt-5.animated.fadeInUp.wait-p7s
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 编辑快捷方式
                v-card-text
                  v-switch.mt-0(
                    inset
                    label='显示悬浮编辑按钮'
                    color='primary'
                    v-model='config.editFab'
                    persistent-hint
                    hint='在页面角落显示可快速进入编辑模式的按钮。'
                    )
                v-divider
                .overline.grey--text.pa-4 编辑菜单栏
                .px-3.pb-3
                  v-switch.mt-0.ml-1(
                    inset
                    label='显示编辑菜单栏'
                    color='primary'
                    v-model='config.editMenuBar'
                    persistent-hint
                    hint='在页面顶部显示编辑操作菜单。'
                    )
                  v-switch.mt-4.ml-1(
                    v-if='config.editMenuBar'
                    inset
                    label='显示编辑按钮'
                    color='primary'
                    v-model='config.editMenuBtn'
                    persistent-hint
                    hint='在编辑菜单栏中显示“编辑”按钮。'
                    )
                  v-switch.mt-4.ml-1(
                    v-if='config.editMenuBar'
                    inset
                    label='显示外部编辑按钮'
                    color='primary'
                    v-model='config.editMenuExternalBtn'
                    persistent-hint
                    hint='在编辑菜单栏中显示跳转到外部编辑器或服务的按钮。'
                    )
                template(v-if='config.editMenuBar && config.editMenuExternalBtn')
                  v-divider
                  .overline.grey--text.pa-4 外部编辑按钮
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      label='外部编辑按钮名称'
                      v-model='config.editMenuExternalName'
                      prepend-icon='mdi-format-title'
                      hint='外部编辑按钮上显示的名称。'
                      persistent-hint
                      )
                    v-text-field.mt-3(
                      outlined
                      label='外部编辑按钮图标'
                      v-model='config.editMenuExternalIcon'
                      prepend-icon='mdi-dice-5'
                      hint='外部编辑按钮使用的 Material Design 图标名称。'
                      persistent-hint
                      )
                    v-text-field.mt-3(
                      outlined
                      label='外部编辑网址'
                      v-model='config.editMenuExternalUrl'
                      prepend-icon='mdi-near-me'
                      hint='点击外部编辑按钮后打开的网址模板。'
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

const titleRegex = /[<>"]/i

WIKI.$store.registerModule('editor', editorStore)

export default {
  i18nOptions: { namespaces: 'editor' },
  components: {
    editorModalMedia: () => import(/* webpackChunkName: "editor", webpackMode: "lazy" */ '../editor/editor-modal-media.vue')
  },
  data() {
    return {
      config: {
        host: '',
        title: '',
        description: '',
        robots: [],
        analyticsService: '',
        analyticsId: '',
        company: '',
        contentLicense: '',
        footerOverride: '',
        logoUrl: '',
        featureAnalytics: false,
        featurePageRatings: false,
        featurePageComments: false,
        featurePersonalWikis: false,
        featureTinyPNG: false,
        pageExtensions: '',
        editFab: false,
        editMenuBar: false,
        editMenuBtn: false,
        editMenuExternalBtn: false,
        editMenuExternalName: '',
        editMenuExternalIcon: '',
        editMenuExternalUrl: ''
      },
      metaRobots: [
        { text: '允许索引', value: 'index' },
        { text: '跟踪链接', value: 'follow' },
        { text: '禁止索引', value: 'noindex' },
        { text: '不跟踪链接', value: 'nofollow' }
      ]
    }
  },
  computed: {
    siteTitle: sync('site/title'),
    logoUrl: sync('site/logoUrl'),
    company: sync('site/company'),
    contentLicense: sync('site/contentLicense'),
    footerOverride: sync('site/footerOverride'),
    activeModal: sync('editor/activeModal'),
    contentLicenses () {
      return [
        { value: '', text: '无' },
        { value: 'alr', text: '保留所有权利' },
        { value: 'cc0', text: 'CC0 1.0 公共领域贡献' },
        { value: 'ccby', text: 'CC BY 4.0 署名' },
        { value: 'ccbysa', text: 'CC BY-SA 4.0 署名-相同方式共享' },
        { value: 'ccbynd', text: 'CC BY-ND 4.0 署名-禁止演绎' },
        { value: 'ccbync', text: 'CC BY-NC 4.0 署名-非商业性使用' },
        { value: 'ccbyncsa', text: 'CC BY-NC-SA 4.0 署名-非商业性使用-相同方式共享' },
        { value: 'ccbyncnd', text: 'CC BY-NC-ND 4.0 署名-非商业性使用-禁止演绎' }
      ]
    }
  },
  methods: {
    async save () {
      const title = _.get(this.config, 'title', '')
      if (titleRegex.test(title)) {
        this.$store.commit('showNotification', {
          style: 'error',
          message: '系统名称不能包含字符 <、> 或 "。',
          icon: 'alert'
        })
        return
      }
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $host: String
              $title: String
              $description: String
              $robots: [String]
              $analyticsService: String
              $analyticsId: String
              $company: String
              $contentLicense: String
              $footerOverride: String
              $logoUrl: String
              $pageExtensions: String
              $featurePageRatings: Boolean
              $featurePageComments: Boolean
              $featurePersonalWikis: Boolean
              $editFab: Boolean
              $editMenuBar: Boolean
              $editMenuBtn: Boolean
              $editMenuExternalBtn: Boolean
              $editMenuExternalName: String
              $editMenuExternalIcon: String
              $editMenuExternalUrl: String
            ) {
              site {
                updateConfig(
                  host: $host
                  title: $title
                  description: $description
                  robots: $robots
                  analyticsService: $analyticsService
                  analyticsId: $analyticsId
                  company: $company
                  contentLicense: $contentLicense
                  footerOverride: $footerOverride
                  logoUrl: $logoUrl
                  pageExtensions: $pageExtensions
                  featurePageRatings: $featurePageRatings
                  featurePageComments: $featurePageComments
                  featurePersonalWikis: $featurePersonalWikis
                  editFab: $editFab
                  editMenuBar: $editMenuBar
                  editMenuBtn: $editMenuBtn
                  editMenuExternalBtn: $editMenuExternalBtn
                  editMenuExternalName: $editMenuExternalName
                  editMenuExternalIcon: $editMenuExternalIcon
                  editMenuExternalUrl: $editMenuExternalUrl
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
            host: _.get(this.config, 'host', ''),
            title: _.get(this.config, 'title', ''),
            description: _.get(this.config, 'description', ''),
            robots: _.get(this.config, 'robots', []),
            analyticsService: _.get(this.config, 'analyticsService', ''),
            analyticsId: _.get(this.config, 'analyticsId', ''),
            company: _.get(this.config, 'company', ''),
            contentLicense: _.get(this.config, 'contentLicense', ''),
            footerOverride: _.get(this.config, 'footerOverride', ''),
            logoUrl: _.get(this.config, 'logoUrl', ''),
            pageExtensions: _.get(this.config, 'pageExtensions', ''),
            featurePageRatings: _.get(this.config, 'featurePageRatings', false),
            featurePageComments: _.get(this.config, 'featurePageComments', false),
            featurePersonalWikis: _.get(this.config, 'featurePersonalWikis', false),
            editFab: _.get(this.config, 'editFab', false),
            editMenuBar: _.get(this.config, 'editMenuBar', false),
            editMenuBtn: _.get(this.config, 'editMenuBtn', false),
            editMenuExternalBtn: _.get(this.config, 'editMenuExternalBtn', false),
            editMenuExternalName: _.get(this.config, 'editMenuExternalName', ''),
            editMenuExternalIcon: _.get(this.config, 'editMenuExternalIcon', ''),
            editMenuExternalUrl: _.get(this.config, 'editMenuExternalUrl', '')
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-site-update')
          }
        })
        this.$store.commit('showNotification', {
          style: 'success',
          message: '站点配置保存成功。',
          icon: 'check'
        })
        this.siteTitle = this.config.title
        this.company = this.config.company
        this.contentLicense = this.config.contentLicense
        this.footerOverride = this.config.footerOverride
        this.logoUrl = this.config.logoUrl
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    },
    browseLogo () {
      this.$store.set('editor/editorKey', 'common')
      this.activeModal = 'editorModalMedia'
    },
    refreshLogo () {
      this.$forceUpdate()
    }
  },
  mounted () {
    this.$root.$on('editorInsert', opts => {
      this.config.logoUrl = opts.path
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
              host
              title
              description
              robots
              analyticsService
              analyticsId
              company
              contentLicense
              footerOverride
              logoUrl
              pageExtensions
              featurePageRatings
              featurePageComments
              featurePersonalWikis
              editFab
              editMenuBar
              editMenuBtn
              editMenuExternalBtn
              editMenuExternalName
              editMenuExternalIcon
              editMenuExternalUrl
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => _.cloneDeep(data.site.config),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-site-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
