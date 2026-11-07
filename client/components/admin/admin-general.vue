<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-categorize.svg', :alt='$t("admin:general.title")', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{ $t('admin:general.title') }}
            .subtitle-1.grey--text.animated.fadeInLeft {{ $t('admin:ui.general.subtitle') }}
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{ $t('common:actions.apply') }}
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg6 xs12)
              v-form
                v-card.animated.fadeInUp
                  v-toolbar(color='primary', dark, dense, flat)
                    v-toolbar-title.subtitle-1 {{ $t('admin:ui.general.siteInfo') }}
                  .overline.grey--text.pa-4 {{ $t('admin:ui.general.basicInfo') }}
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      :label='$t("admin:ui.general.host.label")'
                      required
                      :counter='255'
                      v-model='config.host'
                      prepend-icon='mdi-label-variant-outline'
                      :hint='$t("admin:ui.general.host.hint")'
                      persistent-hint
                      )
                    v-text-field.mt-3(
                      outlined
                      :label='$t("admin:ui.general.title.label")'
                      required
                      :counter='50'
                      v-model='config.title'
                      prepend-icon='mdi-earth'
                      :hint='$t("admin:ui.general.title.hint")'
                      persistent-hint
                      )
                  v-divider
                  .overline.grey--text.pa-4 {{ $t('admin:ui.general.siteLogo') }}
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
                          :label='$t("admin:ui.general.logoUrl.label")'
                          v-model='config.logoUrl'
                          :hint='$t("admin:ui.general.logoUrl.hint")'
                          persistent-hint
                          append-icon='mdi-folder-image'
                          @click:append='browseLogo'
                          @keyup.enter='refreshLogo'
                        )
                  v-divider
                  .overline.grey--text.pa-4 {{ $t('admin:ui.general.footerCopyright') }}
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      :label='$t("admin:ui.general.company.label")'
                      v-model='config.company'
                      :counter='255'
                      prepend-icon='mdi-domain'
                      persistent-hint
                      :hint='$t("admin:ui.general.company.hint")'
                      )
                    v-select.mt-3(
                      outlined
                      :label='$t("admin:ui.general.contentLicense.label")'
                      :items='contentLicenses'
                      v-model='config.contentLicense'
                      prepend-icon='mdi-creative-commons'
                      :return-object='false'
                      :hint='$t("admin:ui.general.contentLicense.hint")'
                      persistent-hint
                    )
                    v-text-field.mt-3(
                      outlined
                      :label='$t("admin:ui.general.footerOverride.label")'
                      v-model='config.footerOverride'
                      prepend-icon='mdi-page-layout-footer'
                      append-icon='mdi-language-markdown'
                      persistent-hint
                      :hint='$t("admin:ui.general.footerOverride.hint")'
                      )
                  v-divider
                  .overline.grey--text.pa-4 {{ $t('admin:ui.general.seo') }}
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      :label='$t("admin:ui.general.description.label")'
                      :counter='255'
                      v-model='config.description'
                      prepend-icon='mdi-compass'
                      :hint='$t("admin:ui.general.description.hint")'
                      persistent-hint
                      )
                    v-select.mt-3(
                      outlined
                      :label='$t("admin:ui.general.robots.label")'
                      multiple
                      :items='metaRobots'
                      v-model='config.robots'
                      prepend-icon='mdi-compass'
                      :return-object='false'
                      :hint='$t("admin:ui.general.robots.hint")'
                      persistent-hint
                      )

            v-flex(lg6 xs12)
              v-card.animated.fadeInUp.wait-p4s
                v-toolbar(color='indigo', dark, dense, flat)
                  v-toolbar-title.subtitle-1 {{ $t('admin:ui.general.features') }}
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
                    :label='$t("admin:ui.general.comments.label")'
                    color='indigo'
                    v-model='config.featurePageComments'
                    persistent-hint
                    :hint='$t("admin:ui.general.comments.hint")'
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
                  v-toolbar-title.subtitle-1 {{ $t('admin:ui.general.urlHandling') }}
                v-card-text
                  v-text-field(
                    outlined
                    :label='$t("admin:ui.general.pageExtensions.label")'
                    v-model='config.pageExtensions'
                    prepend-icon='mdi-format-text-wrapping-overflow'
                    :hint='$t("admin:ui.general.pageExtensions.hint")'
                    persistent-hint
                    )

              v-card.mt-5.animated.fadeInUp.wait-p7s
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 {{ $t('admin:ui.general.editShortcuts') }}
                v-card-text
                  v-switch.mt-0(
                    inset
                    :label='$t("admin:ui.general.editFab.label")'
                    color='primary'
                    v-model='config.editFab'
                    persistent-hint
                    :hint='$t("admin:ui.general.editFab.hint")'
                    )
                v-divider
                .overline.grey--text.pa-4 {{ $t('admin:ui.general.editMenuBar') }}
                .px-3.pb-3
                  v-switch.mt-0.ml-1(
                    inset
                    :label='$t("admin:ui.general.showEditMenuBar.label")'
                    color='primary'
                    v-model='config.editMenuBar'
                    persistent-hint
                    :hint='$t("admin:ui.general.showEditMenuBar.hint")'
                    )
                  v-switch.mt-4.ml-1(
                    v-if='config.editMenuBar'
                    inset
                    :label='$t("admin:ui.general.showEditButton.label")'
                    color='primary'
                    v-model='config.editMenuBtn'
                    persistent-hint
                    :hint='$t("admin:ui.general.showEditButton.hint")'
                    )
                  v-switch.mt-4.ml-1(
                    v-if='config.editMenuBar'
                    inset
                    :label='$t("admin:ui.general.showExternalEditButton.label")'
                    color='primary'
                    v-model='config.editMenuExternalBtn'
                    persistent-hint
                    :hint='$t("admin:ui.general.showExternalEditButton.hint")'
                    )
                template(v-if='config.editMenuBar && config.editMenuExternalBtn')
                  v-divider
                  .overline.grey--text.pa-4 {{ $t('admin:ui.general.externalEditButton') }}
                  .px-3.pb-3
                    v-text-field(
                      outlined
                      :label='$t("admin:ui.general.externalEditName.label")'
                      v-model='config.editMenuExternalName'
                      prepend-icon='mdi-format-title'
                      :hint='$t("admin:ui.general.externalEditName.hint")'
                      persistent-hint
                      )
                    v-text-field.mt-3(
                      outlined
                      :label='$t("admin:ui.general.externalEditIcon.label")'
                      v-model='config.editMenuExternalIcon'
                      prepend-icon='mdi-dice-5'
                      :hint='$t("admin:ui.general.externalEditIcon.hint")'
                      persistent-hint
                      )
                    v-text-field.mt-3(
                      outlined
                      :label='$t("admin:ui.general.externalEditUrl.label")'
                      v-model='config.editMenuExternalUrl'
                      prepend-icon='mdi-near-me'
                      :hint='$t("admin:ui.general.externalEditUrl.hint")'
                      persistent-hint
                      )

    component(:is='activeModal', management, selection)

</template>

<script>
import _ from 'lodash'
import { sync } from 'vuex-pathify'
import gql from 'graphql-tag'

import editorStore from '../../store/editor'

/* global WIKI */

const titleRegex = /[<>"]/i

if (!WIKI.$store.state.editor) {
  WIKI.$store.registerModule('editor', editorStore)
}

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
      }
    }
  },
  computed: {
    siteTitle: sync('site/title'),
    logoUrl: sync('site/logoUrl'),
    company: sync('site/company'),
    contentLicense: sync('site/contentLicense'),
    footerOverride: sync('site/footerOverride'),
    activeModal: sync('editor/activeModal'),
    metaRobots () {
      return [
        { textKey: 'admin:ui.general.robots.index', value: 'index' },
        { textKey: 'admin:ui.general.robots.follow', value: 'follow' },
        { textKey: 'admin:ui.general.robots.noindex', value: 'noindex' },
        { textKey: 'admin:ui.general.robots.nofollow', value: 'nofollow' }
      ].map(item => ({
        ...item,
        text: this.$t(item.textKey)
      }))
    },
    contentLicenses () {
      return [
        { value: '', textKey: 'admin:ui.general.licenses.none' },
        { value: 'alr', textKey: 'admin:ui.general.licenses.allRightsReserved' },
        { value: 'cc0', textKey: 'admin:ui.general.licenses.cc0' },
        { value: 'ccby', textKey: 'admin:ui.general.licenses.ccby' },
        { value: 'ccbysa', textKey: 'admin:ui.general.licenses.ccbysa' },
        { value: 'ccbynd', textKey: 'admin:ui.general.licenses.ccbynd' },
        { value: 'ccbync', textKey: 'admin:ui.general.licenses.ccbync' },
        { value: 'ccbyncsa', textKey: 'admin:ui.general.licenses.ccbyncsa' },
        { value: 'ccbyncnd', textKey: 'admin:ui.general.licenses.ccbyncnd' }
      ].map(item => ({
        ...item,
        text: this.$t(item.textKey)
      }))
    }
  },
  methods: {
    async save () {
      const title = _.get(this.config, 'title', '')
      if (titleRegex.test(title)) {
        this.$store.commit('showNotification', {
          style: 'error',
          message: this.$t('admin:ui.general.titleInvalid'),
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
          message: this.$t('admin:ui.general.saveSuccess'),
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
