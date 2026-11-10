<template lang="pug">
  v-app.page-view(:dark='$vuetify.theme.dark', :class='$vuetify.rtl ? `is-rtl` : `is-ltr`')
    nav-header(v-if='!printView', site-header)
    v-navigation-drawer.page-nav-drawer(
      v-if='navMode !== `NONE` && !printView'
      :class='$vuetify.theme.dark ? `grey darken-4-d4` : `page-nav-drawer--light`'
      :dark='$vuetify.theme.dark'
      app
      clipped
      mobile-breakpoint='600'
      :temporary='$vuetify.breakpoint.smAndDown'
      v-model='navShown'
      :right='$vuetify.rtl'
      )
      vue-scroll(:ops='scrollStyle')
        nav-sidebar(ref='navSidebar', :color='$vuetify.theme.dark ? `grey darken-4-d4` : ``', :dark='$vuetify.theme.dark', :items='sidebarDecoded', :nav-mode='navMode', @navigate='navigatePage')

    v-fab-transition(v-if='navMode !== `NONE`')
      v-btn(
        fab
        color='primary'
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        @click='navShown = !navShown'
        v-if='$vuetify.breakpoint.mdAndDown'
        v-show='!navShown'
        )
        v-icon mdi-menu

    v-main(ref='content')
      v-progress-linear(v-if='navigationLoading', indeterminate, absolute, color='primary', height='2')
      template(v-if='viewPage.path !== `home`')
        v-toolbar.page-breadcrumb-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `white`', flat, dense, v-if='$vuetify.breakpoint.smAndUp')
          //- v-btn.pl-0(v-if='$vuetify.breakpoint.xsOnly', flat, @click='toggleNavigation')
          //-   v-icon(color='grey darken-2', left) menu
          //-   span Navigation
          v-breadcrumbs.breadcrumbs-nav.pl-0(
            :items='breadcrumbs'
            divider='/'
            )
            template(slot='item', slot-scope='props')
              v-icon(v-if='props.item.path === "/"', size='20', @click='goHome') mdi-home
              template(v-else)
                v-btn.ma-0(:href='props.item.path', small, text, @click='navigateBreadcrumb($event, props.item)') {{props.item.name}}
                v-btn.page-breadcrumb-copy(
                  v-if='props.item.pagePath === viewPage.path'
                  icon
                  small
                  :aria-label='$t("common:page.copyCurrentPath")'
                  :title='$t("common:page.copyCurrentPath")'
                  v-clipboard='currentPagePathCopyText'
                  @success='onPagePathCopied'
                  @error='onPagePathCopyError'
                  )
                  v-icon(small) mdi-content-copy
          template(v-if='!viewPage.isPublished')
            v-spacer
            .caption.red--text {{$t('common:page.unpublished')}}
            status-indicator.ml-3(negative, pulse)
        v-divider.page-breadcrumb-divider
      .page-scroll-area(ref='scrollArea', @scroll='upBtnScroll')
        v-container.pl-5.pt-4(fluid, grid-list-xl)
          v-layout(row)
            v-flex.page-col-sd(
              v-if='tocPosition !== `off` && $vuetify.breakpoint.lgAndUp'
              :order-xs1='tocPosition !== `right`'
              :order-xs2='tocPosition === `right`'
              lg3
              xl2
              )
              v-card.page-toc-card.mb-5(v-if='tocDecoded.length')
                .overline.pa-5.pb-0(:class='$vuetify.theme.dark ? `blue--text text--lighten-2` : `primary--text`') {{$t('common:page.toc')}}
                v-list.pb-3(dense, nav, :class='$vuetify.theme.dark ? `darken-3-d3` : ``')
                  template(v-for='(tocItem, tocIdx) in tocDecoded')
                    v-list-item(@click='$vuetify.goTo(tocItem.anchor, scrollOpts)')
                      v-icon(color='grey', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                      v-list-item-title.px-3 {{tocItem.title}}
                    //- v-divider(v-if='tocIdx < toc.length - 1 || tocItem.children.length')
                    template(v-for='tocSubItem in tocItem.children')
                      v-list-item(@click='$vuetify.goTo(tocSubItem.anchor, scrollOpts)')
                        v-icon.px-3(color='grey lighten-1', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                        v-list-item-title.px-3.caption.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-1`') {{tocSubItem.title}}
                      //- v-divider(inset, v-if='tocIdx < toc.length - 1')

              v-card.page-tags-card.mb-5(v-if='viewPage.tags.length > 0')
                .pa-5
                  .overline.teal--text.pb-2(:class='$vuetify.theme.dark ? `text--lighten-3` : ``') {{$t('common:page.tags')}}
                  v-chip.mr-1.mb-1(
                    label
                    :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                    v-for='(tag, idx) in viewPage.tags'
                    :href='`/t/` + tag.tag'
                    :key='`tag-` + tag.tag'
                    )
                    v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', left, small) mdi-tag
                    span(:class='$vuetify.theme.dark ? `teal--text text--lighten-5` : `teal--text text--darken-2`') {{tag.title}}
                  v-chip.mr-1.mb-1(
                    label
                    :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                    :href='`/t/` + viewPage.tags.map(t => t.tag).join(`/`)'
                    :aria-label='$t(`common:page.tagsMatching`)'
                    )
                    v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', size='20') mdi-tag-multiple

              v-card.page-comments-card.mb-5(v-if='commentsEnabled && commentsPerms.read')
                .pa-5
                  .overline.pb-2.blue-grey--text.d-flex.align-center(:class='$vuetify.theme.dark ? `text--lighten-3` : `text--darken-2`')
                    span {{$t('common:comments.sdTitle')}}
                    //- v-spacer
                    //- v-chip.text-center(
                    //-   v-if='!commentsExternal'
                    //-   label
                    //-   x-small
                    //-   :color='$vuetify.theme.dark ? `blue-grey darken-3` : `blue-grey darken-2`'
                    //-   dark
                    //-   style='min-width: 50px; justify-content: center;'
                    //-   )
                    //-   span {{commentsCount}}
                  .d-flex
                    v-btn.text-none(
                      @click='goToComments()'
                      :color='$vuetify.theme.dark ? `blue-grey` : `blue-grey darken-2`'
                      outlined
                      style='flex: 1 1 100%;'
                      small
                      )
                      span.blue-grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`') {{$t('common:comments.viewDiscussion')}}
                    v-tooltip(right, v-if='commentsPerms.write')
                      template(v-slot:activator='{ on }')
                        v-btn.ml-2(
                          @click='goToComments(true)'
                          v-on='on'
                          outlined
                          small
                          :color='$vuetify.theme.dark ? `blue-grey` : `blue-grey darken-2`'
                          :aria-label='$t(`common:comments.newComment`)'
                          )
                          v-icon(:color='$vuetify.theme.dark ? `blue-grey lighten-1` : `blue-grey darken-2`', dense) mdi-comment-plus
                      span {{$t('common:comments.newComment')}}

              v-card.page-author-card.mb-5
                .pa-5
                  .overline.indigo--text.d-flex(:class='$vuetify.theme.dark ? `text--lighten-3` : ``')
                    span {{$t('common:page.lastEditedBy')}}
                    v-spacer
                    v-tooltip(right, v-if='isAuthenticated')
                      template(v-slot:activator='{ on }')
                        v-btn.btn-animate-edit(
                          icon
                          :href='"/h/" + viewPage.locale + "/" + viewPage.path'
                          v-on='on'
                          x-small
                          v-if='hasReadHistoryPermission'
                          :aria-label='$t(`common:header.history`)'
                          )
                          v-icon(color='indigo', dense) mdi-history
                      span {{$t('common:header.history')}}
                  .page-author-card-name.body-2.grey--text(:class='$vuetify.theme.dark ? `` : `text--darken-3`') {{ viewPage.authorName }}
                  .page-author-card-date.caption.grey--text.text--darken-1 {{ viewPage.updatedAt | moment('YYYY-MM-DD HH:mm:ss') }}

              //- v-card.mb-5
              //-   .pa-5
              //-     .overline.pb-2.yellow--text(:class='$vuetify.theme.dark ? `text--darken-3` : `text--darken-4`') Rating
              //-     .text-center
              //-       v-rating(
              //-         v-model='rating'
              //-         color='yellow darken-3'
              //-         background-color='grey lighten-1'
              //-         half-increments
              //-         hover
              //-       )
              //-       .caption.grey--text 5 votes

              v-card.page-shortcuts-card(flat)
                v-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-3`', flat, dense)
                  v-spacer
                  //- v-tooltip(bottom)
                  //-   template(v-slot:activator='{ on }')
                  //-     v-btn(icon, tile, v-on='on', :aria-label='$t(`common:page.bookmark`)'): v-icon(color='grey') mdi-bookmark
                  //-   span {{$t('common:page.bookmark')}}
                  v-menu(offset-y, bottom, min-width='300')
                    template(v-slot:activator='{ on: menu }')
                      v-tooltip(bottom)
                        template(v-slot:activator='{ on: tooltip }')
                          v-btn(icon, tile, v-on='{ ...menu, ...tooltip }', :aria-label='$t(`common:page.share`)'): v-icon(color='grey') mdi-share-variant
                        span {{$t('common:page.share')}}
                    social-sharing(
                      :url='pageUrl'
                      :title='viewPage.title'
                      :description='viewPage.description'
                    )
                  v-tooltip(bottom)
                    template(v-slot:activator='{ on }')
                      v-btn(icon, tile, v-on='on', @click='print', :aria-label='$t(`common:page.printFormat`)')
                        v-icon(:color='printView ? `primary` : `grey`') mdi-printer
                    span {{$t('common:page.printFormat')}}
                  v-spacer

            v-flex.page-col-content(
              xs12
              :lg9='tocPosition !== `off`'
              :xl10='tocPosition !== `off`'
              :order-xs1='tocPosition === `right`'
              :order-xs2='tocPosition !== `right`'
              )
              v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasNewPagePermission')
                template(v-slot:activator='{ on }')
                  v-btn.page-new-fab(
                    :class='{ "page-new-fab--with-delete": showPageDeleteFab }'
                    fab
                    fixed
                    bottom
                    :right='!$vuetify.rtl'
                    :left='$vuetify.rtl'
                    color='teal'
                    dark
                    v-on='on'
                    @click='pageNew'
                    :aria-label='$t(`common:header.newPage`)'
                    )
                    v-icon mdi-text-box-plus-outline
                span {{$t('common:page.newPageTooltip')}}
              v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasAnyPagePermissions && editShortcutsObj.editFab')
                template(v-slot:activator='{ on }')
                  v-btn.btn-animate-edit(
                    :class='{ "page-edit-fab--with-delete": showPageDeleteFab }'
                    fab
                    fixed
                    bottom
                    :right='!$vuetify.rtl'
                    :left='$vuetify.rtl'
                    color='primary'
                    dark
                    @click='pageEdit'
                    v-on='on'
                    :disabled='!hasWritePagesPermission'
                    :aria-label='$t(`common:page.editPage`)'
                    )
                    v-icon mdi-pencil
                span {{$t('common:page.editPage')}}
              v-menu(
                v-if='showPageActionsMenu'
                offset-x
                :left='!$vuetify.rtl'
                :right='$vuetify.rtl'
                min-width='180'
                max-height='320'
                )
                template(v-slot:activator='{ on: menu, attrs }')
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl')
                    template(v-slot:activator='{ on: tooltip }')
                      v-btn.page-more-actions-fab(
                        :class='{ "page-more-actions-fab--with-delete": showPageDeleteFab }'
                        fab
                        fixed
                        bottom
                        :right='!$vuetify.rtl'
                        :left='$vuetify.rtl'
                        small
                        v-bind='attrs'
                        v-on='{ ...menu, ...tooltip }'
                        :aria-label='$t(`common:page.moreActions`)'
                        )
                        v-icon mdi-dots-horizontal
                    span {{$t('common:page.moreActions')}}
                v-list(dense)
                  v-list-item(v-if='hasReadHistoryPermission', @click='pageHistory')
                    v-list-item-icon: v-icon mdi-history
                    v-list-item-content: v-list-item-title {{$t('common:header.history')}}
                  v-list-item(v-if='hasReadSourcePermission', @click='pageSource')
                    v-list-item-icon: v-icon mdi-code-tags
                    v-list-item-content: v-list-item-title {{$t('common:header.viewSource')}}
                  v-list-item(v-if='hasWritePagesPermission', @click='pageConvert')
                    v-list-item-icon: v-icon mdi-lightning-bolt
                    v-list-item-content: v-list-item-title {{$t('common:header.convert')}}
                  v-list-item(v-if='hasWritePagesPermission', @click='pageDuplicate')
                    v-list-item-icon: v-icon mdi-content-duplicate
                    v-list-item-content: v-list-item-title {{$t('common:header.duplicate')}}
                  v-list-item(v-if='hasManagePagesPermission', @click='pageMove')
                    v-list-item-icon: v-icon mdi-content-save-move-outline
                    v-list-item-content: v-list-item-title {{$t('common:header.move')}}
              v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='showPageDeleteFab')
                template(v-slot:activator='{ on }')
                  v-btn.page-delete-fab(
                    fab
                    fixed
                    bottom
                    :right='!$vuetify.rtl'
                    :left='$vuetify.rtl'
                    dark
                    color='red'
                    v-on='on'
                    @click='pageDelete'
                    :aria-label='$t(`common:header.delete`)'
                    )
                    v-icon mdi-trash-can-outline
                span {{$t('common:header.delete')}}
              .page-edit-shortcuts(v-if='editShortcutsObj.editMenuBar && (editShortcutsObj.editMenuBtn || editShortcutsObj.editMenuExternalBtn)')
                v-btn(
                  v-if='editShortcutsObj.editMenuBtn'
                  @click='pageEdit'
                  depressed
                  small
                  )
                  v-icon.mr-2(small) mdi-pencil
                  span.text-none {{$t(`common:actions.edit`)}}
                v-btn(
                  v-if='editShortcutsObj.editMenuExternalBtn'
                  :href='editMenuExternalUrl'
                  target='_blank'
                  depressed
                  small
                  )
                  v-icon.mr-2(small) {{ editShortcutsObj.editMenuExternalIcon }}
                  span.text-none {{$t(`common:page.editExternal`, { name: editShortcutsObj.editMenuExternalName })}}
              v-alert.mb-5(v-if='!viewPage.isPublished', color='red', outlined, icon='mdi-minus-circle', dense)
                .caption {{$t('common:page.unpublishedWarning')}}
              .contents(ref='container', data-toolbar-order='label,wikijs-copy', @click='handleContentClick')
                div(v-if='viewPage.render !== null', v-html='viewPage.render')
                slot(v-else, name='contents')
              .comments-container#discussion(v-if='commentsEnabled && commentsPerms.read && !printView')
                .comments-header
                  v-icon.mr-2(dark) mdi-comment-text-outline
                  span {{$t('common:comments.title')}}
                .comments-main
                  comments(v-if='viewPage.render !== null', :key='viewPage.id')
                  slot(v-else, name='comments')
        nav-footer
    notify
    search-results
    v-fab-transition
      v-btn(
        v-if='upBtnShown'
        fab
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        :depressed='this.$vuetify.breakpoint.mdAndUp'
        @click='$vuetify.goTo(0, scrollOpts)'
        color='primary'
        dark
        :style='upBtnPosition'
        :aria-label='$t(`common:actions.returnToTop`)'
        )
        v-icon mdi-arrow-up
</template>

<script>
import { StatusIndicator } from 'vue-status-indicator'
import Tabset from './tabset.vue'
import NavSidebar from './nav-sidebar.vue'
import Prism from 'prismjs'
import mermaid from 'mermaid'
import { get, sync } from 'vuex-pathify'
import _ from 'lodash'
import Vue from 'vue'
import { registerPrismCopyButton } from '../../../helpers/prism-copy'
import zhTranslations from '../../../../data/sideload/zh.json'
import enTranslations from '../../../../data/sideload/en.json'

/* global siteLangs, siteConfig */

Vue.component('Tabset', Tabset)

Prism.plugins.autoloader.languages_path = '/_assets/js/prism/'
Prism.plugins.NormalizeWhitespace.setDefaults({
  'remove-trailing': true,
  'remove-indent': true,
  'left-trim': true,
  'right-trim': true,
  'remove-initial-line-feed': true,
  'tabs-to-spaces': 2
})
registerPrismCopyButton(Prism)

export default {
  components: {
    NavSidebar,
    StatusIndicator
  },
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
    editor: {
      type: String,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    toc: {
      type: String,
      default: ''
    },
    sidebar: {
      type: String,
      default: ''
    },
    navMode: {
      type: String,
      default: 'MIXED'
    },
    commentsEnabled: {
      type: Boolean,
      default: false
    },
    effectivePermissions: {
      type: String,
      default: ''
    },
    commentsExternal: {
      type: Boolean,
      default: false
    },
    editShortcuts: {
      type: String,
      default: ''
    },
    filename: {
      type: String,
      default: ''
    },
    softNavigation: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      locales: siteLangs,
      viewPage: {
        id: this.pageId,
        locale: this.locale,
        path: this.path,
        title: this.title,
        description: this.description,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        tags: this.tags || [],
        authorName: this.authorName,
        authorId: this.authorId,
        editor: this.editor,
        isPublished: this.isPublished,
        toc: this.toc ? JSON.parse(Buffer.from(this.toc, 'base64').toString()) : [],
        filename: this.filename,
        render: null
      },
      navigationLoading: false,
      navigationSequence: 0,
      navigationController: null,
      currentViewUrl: '',
      scrollPositions: {},
      navShown: false,
      navExpanded: false,
      upBtnShown: false,
      scrollOpts: {
        duration: 1500,
        offset: 0,
        easing: 'easeInOutCubic',
        appOffset: false
      },
      scrollStyle: {
        vuescroll: {},
        scrollPanel: {
          initialScrollX: 0.01, // fix scrollbar not disappearing on load
          scrollingX: false,
          speed: 50
        },
        rail: {
          gutterOfEnds: '2px'
        },
        bar: {
          onlyShowBarOnScroll: false,
          background: '#42A5F5',
          hoverStyle: {
            background: '#64B5F6'
          }
        }
      },
      winWidth: 0
    }
  },
  computed: {
    isAuthenticated: get('user/authenticated'),
    commentsCount: get('page/commentsCount'),
    commentsPerms: get('page/effectivePermissions@comments'),
    editShortcutsObj: get('page/editShortcuts'),
    rating: {
      get () {
        return 3.5
      },
      set (val) {

      }
    },
    breadcrumbs() {
      const localePath = this.locales.length > 0 ? `/${this.viewPage.locale}` : ''
      let pagePath = ''
      return [{ path: '/', name: 'Home' }].concat(
        _.reduce(this.viewPage.path.split('/'), (result, value) => {
          pagePath = pagePath ? `${pagePath}/${value}` : value
          result.push({
            path: `${localePath}/${pagePath}`,
            pagePath,
            name: value
          })
          return result
        }, []))
    },
    pageUrl () {
      return this.currentViewUrl || window.location.href
    },
    currentPagePath () {
      return this.decodePathSegments(window.location.pathname)
    },
    currentPagePathCopyText () {
      return `/${this.viewPage.path}`
    },
    upBtnPosition () {
      if (this.$vuetify.breakpoint.mdAndUp) {
        return this.$vuetify.rtl ? `right: 235px;` : `left: 235px;`
      } else {
        return this.$vuetify.rtl ? `right: 65px;` : `left: 65px;`
      }
    },
    sidebarDecoded () {
      return JSON.parse(Buffer.from(this.sidebar, 'base64').toString())
    },
    tocDecoded () {
      return this.viewPage.toc
    },
    tocPosition: get('site/tocPosition'),
    hasAdminPermission: get('page/effectivePermissions@system.manage'),
    hasWritePagesPermission: get('page/effectivePermissions@pages.write'),
    hasManagePagesPermission: get('page/effectivePermissions@pages.manage'),
    hasDeletePagesPermission: get('page/effectivePermissions@pages.delete'),
    hasReadSourcePermission: get('page/effectivePermissions@source.read'),
    hasReadHistoryPermission: get('page/effectivePermissions@history.read'),
    hasNewPagePermission () {
      return this.hasAdminPermission || this.hasWritePagesPermission
    },
    showPageDeleteFab () {
      return this.hasDeletePagesPermission && this.editShortcutsObj.editFab
    },
    showPageActionsMenu () {
      return this.editShortcutsObj.editFab && (this.hasReadHistoryPermission || this.hasReadSourcePermission ||
        this.hasWritePagesPermission || this.hasManagePagesPermission)
    },
    hasAnyPagePermissions () {
      return this.hasAdminPermission || this.hasWritePagesPermission || this.hasManagePagesPermission ||
        this.hasDeletePagesPermission || this.hasReadSourcePermission || this.hasReadHistoryPermission
    },
    printView: sync('site/printView'),
    editMenuExternalUrl () {
      if (this.editShortcutsObj.editMenuBar && this.editShortcutsObj.editMenuExternalBtn) {
        return this.editShortcutsObj.editMenuExternalUrl.replace('{filename}', this.viewPage.filename)
      } else {
        return ''
      }
    }
  },
  created() {
    if (this.$i18n && this.$i18n.i18next) {
      for (const [locale, translations] of Object.entries({ zh: zhTranslations, en: enTranslations })) {
        for (const key of ['page.moreActions', 'page.newPageTooltip', 'page.copyCurrentPath', 'page.currentPathCopied', 'page.currentPathCopyFailed']) {
          this.$i18n.i18next.addResource(locale, 'common', key, translations[`common:${key}`])
        }
      }
    }
    this.$store.set('page/authorId', this.authorId)
    this.$store.set('page/authorName', this.authorName)
    this.$store.set('page/createdAt', this.createdAt)
    this.$store.set('page/description', this.description)
    this.$store.set('page/isPublished', this.isPublished)
    this.$store.set('page/id', this.pageId)
    this.$store.set('page/locale', this.locale)
    this.$store.set('page/path', this.path)
    this.$store.set('page/tags', this.tags)
    this.$store.set('page/title', this.title)
    this.$store.set('page/editor', this.editor)
    this.$store.set('page/updatedAt', this.updatedAt)
    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
    if (this.editShortcuts) {
      this.$store.set('page/editShortcuts', JSON.parse(Buffer.from(this.editShortcuts, 'base64').toString()))
    }

    this.$store.set('page/mode', 'view')
  },
  mounted () {
    document.documentElement.classList.toggle('page-view-scroll', !this.printView)
    this.scrollOpts.container = this.$refs.scrollArea
    this.currentViewUrl = window.location.href
    this.$root.$on('page-deleted', this.handlePageDeleted)
    this._onPagePopState = () => {
      const url = new URL(window.location.href)
      const current = new URL(this.currentViewUrl)
      if (url.pathname === current.pathname && url.search === current.search) {
        this.currentViewUrl = url.href
        if (url.hash) {
          this.$vuetify.goTo(decodeURIComponent(url.hash), this.scrollOpts)
        } else {
          this.$refs.scrollArea.scrollTop = this.scrollPositions[url.href] || 0
        }
      } else {
        this.loadPage(url, true)
      }
    }
    window.addEventListener('popstate', this._onPagePopState)

    if (this.$vuetify.theme.dark) {
      this.scrollStyle.bar.background = '#424242'
    }

    // -> Check side navigation visibility
    this.handleSideNavVisibility()
    window.addEventListener('resize', _.debounce(() => {
      this.handleSideNavVisibility()
    }, 500))

    // -> Highlight Code Blocks
    Prism.highlightAllUnder(this.$refs.container)

    // -> Render Mermaid diagrams
    mermaid.mermaidAPI.initialize({
      startOnLoad: true,
      theme: this.$vuetify.theme.dark ? `dark` : `default`
    })

    // -> Handle anchor scrolling
    if (window.location.hash && window.location.hash.length > 1) {
      if (document.readyState === 'complete') {
        this.$nextTick(() => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      } else {
        window.addEventListener('load', () => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      }
    }

    // -> Handle anchor links within the page contents
    this.$nextTick(() => {
      this.$refs.container.querySelectorAll(`a[href^="#"], a[href^="${window.location.href.replace(window.location.hash, '')}#"]`).forEach(el => {
        el.onclick = ev => {
          ev.preventDefault()
          ev.stopPropagation()
          this.$vuetify.goTo(decodeURIComponent(ev.currentTarget.hash), this.scrollOpts)
        }
      })

      window.boot.notify('page-ready')
    })
  },
  beforeDestroy () {
    document.documentElement.classList.remove('page-view-scroll')
    this.$root.$off('page-deleted', this.handlePageDeleted)
    if (this._onPagePopState) {
      window.removeEventListener('popstate', this._onPagePopState)
    }
    if (this.navigationController) {
      this.navigationController.abort()
    }
  },
  watch: {
    printView (value) {
      document.documentElement.classList.toggle('page-view-scroll', !value)
    }
  },
  methods: {
    decodePathSegments (path) {
      return path.split('/').map(segment => {
        try {
          return decodeURIComponent(segment)
        } catch (error) {
          return segment
        }
      }).join('/')
    },
    handlePageDeleted (navigation) {
      const sidebar = this.$refs.navSidebar
      if (sidebar && sidebar.currentMode === 'browse') {
        sidebar.currentItems = sidebar.currentItems.filter(item => item.pageId !== navigation.pageId)
      }
      if (this.viewPage.id !== navigation.pageId) {
        navigation.handled = true
        return
      }
      if (!this.softNavigation || navigation.destination === '/') {
        return
      }
      navigation.handled = true
      this.loadPage(new URL(navigation.destination, window.location.href), false, {
        replaceHistory: true,
        refreshSidebar: true
      })
    },
    navigatePage (event, href) {
      if (!this.softNavigation || event.defaultPrevented || event.button > 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      const link = event.target && event.target.closest ? event.target.closest('a') : null
      if (link && ((link.target && link.target !== '_self') || link.hasAttribute('download'))) {
        return
      }
      let url
      try {
        url = new URL(href, window.location.href)
      } catch (err) {
        return
      }
      if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol) ||
        /^\/(?:a|d|e|h|i|p|s|t|u|login|logout)(?:\/|$)/i.test(url.pathname) ||
        /\.[^/]+$/.test(url.pathname) ||
        (url.pathname === window.location.pathname && url.search === window.location.search)) {
        return
      }
      event.preventDefault()
      this.loadPage(url, false)
    },
    handleContentClick (event) {
      const link = event.target && event.target.closest ? event.target.closest('a[href]') : null
      if (!link || !this.$refs.container.contains(link)) {
        return
      }
      const url = new URL(link.href, window.location.href)
      if (url.origin === window.location.origin && url.pathname === window.location.pathname &&
        url.search === window.location.search && url.hash && !event.defaultPrevented &&
        (!link.target || link.target === '_self') && !link.hasAttribute('download') &&
        !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
        event.preventDefault()
        this.$vuetify.goTo(decodeURIComponent(url.hash), this.scrollOpts)
        return
      }
      this.navigatePage(event, link.href)
    },
    async loadPage (url, fromHistory, options = {}) {
      if (!this.softNavigation || url.origin !== window.location.origin) {
        window.location.assign(url.href)
        return
      }
      const sequence = ++this.navigationSequence
      if (this.navigationController) {
        this.navigationController.abort()
      }
      const controller = new AbortController()
      this.navigationController = controller
      this.navigationLoading = true
      try {
        const response = await fetch(url.href, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'X-Wiki-Page-Navigation': '1' },
          signal: controller.signal
        })
        if (sequence !== this.navigationSequence) {
          return
        }
        if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) {
          window.location.assign(url.href)
          return
        }
        const data = await response.json()
        if (sequence !== this.navigationSequence) {
          return
        }
        const finalUrl = new URL(response.url || url.href)
        if (!data.softNavigation || !data.page || !data.effectivePermissions ||
          data.page.locale !== this.viewPage.locale || finalUrl.origin !== window.location.origin) {
          window.location.assign(url.href)
          return
        }
        if (!fromHistory) {
          finalUrl.hash = url.hash
          if (options.replaceHistory) {
            window.history.replaceState(null, '', finalUrl.href)
          } else {
            window.history.pushState(null, '', finalUrl.href)
          }
        }
        this.applyPage(data.page, data.effectivePermissions)
        this.currentViewUrl = window.location.href
        await this.$nextTick()
        if (sequence !== this.navigationSequence) {
          return
        }
        Prism.highlightAllUnder(this.$refs.container)
        const diagrams = this.$refs.container.querySelectorAll('.mermaid')
        if (diagrams.length) {
          mermaid.init(undefined, diagrams)
        }
        if (window.location.hash) {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        } else {
          this.$refs.scrollArea.scrollTop = fromHistory ? (this.scrollPositions[this.currentViewUrl] || 0) : 0
        }
        const sidebar = this.$refs.navSidebar
        if (sidebar && sidebar.currentMode === 'browse' &&
          (options.refreshSidebar || (!sidebar.currentItems.some(item => item.pageId === data.page.id) &&
          sidebar.currentParent.pageId !== data.page.id))) {
          sidebar.loadFromCurrentPath(Boolean(options.refreshSidebar)).catch(err => console.warn(err))
        }
        if (this.$vuetify.breakpoint.smAndDown) {
          this.navShown = false
        }
      } catch (err) {
        if (err.name !== 'AbortError' && sequence === this.navigationSequence) {
          window.location.assign(url.href)
        }
      } finally {
        if (sequence === this.navigationSequence) {
          this.navigationLoading = false
          this.navigationController = null
        }
      }
    },
    applyPage (page, effectivePermissions) {
      const toc = typeof page.toc === 'string' ? JSON.parse(page.toc) : page.toc
      const viewPage = { ...page, tags: page.tags || [], toc: toc || [] }
      const storeFields = {
        id: viewPage.id,
        locale: viewPage.locale,
        path: viewPage.path,
        title: viewPage.title,
        description: viewPage.description,
        createdAt: viewPage.createdAt,
        updatedAt: viewPage.updatedAt,
        tags: viewPage.tags,
        authorName: viewPage.authorName,
        authorId: viewPage.authorId,
        editor: viewPage.editor,
        isPublished: viewPage.isPublished,
        effectivePermissions,
        commentsCount: 0
      }
      Object.entries(storeFields).forEach(([key, value]) => this.$store.set(`page/${key}`, value))
      this.viewPage = viewPage
      const siteTitle = typeof siteConfig !== 'undefined' ? siteConfig.title : ''
      document.title = siteTitle ? `${viewPage.title} | ${siteTitle}` : viewPage.title
      const description = document.querySelector('meta[name="description"]')
      if (description) {
        description.setAttribute('content', viewPage.description || '')
      }
      for (const [property, value] of [
        ['og:title', viewPage.title],
        ['og:description', viewPage.description || ''],
        ['og:url', window.location.href]
      ]) {
        const meta = document.querySelector(`meta[property="${property}"]`)
        if (meta) {
          meta.setAttribute('content', value)
        }
      }
    },
    goHome (event) {
      const href = this.locales && this.locales.length > 0 ? `/${this.viewPage.locale}/home` : '/'
      this.navigatePage(event, href)
      if (!event.defaultPrevented) {
        window.location.assign(href)
      }
    },
    onPagePathCopied (event) {
      if (event && event.clearSelection) {
        event.clearSelection()
      }
      this.$store.commit('showNotification', {
        style: 'success',
        message: this.$t('common:page.currentPathCopied'),
        icon: 'check'
      })
    },
    onPagePathCopyError () {
      this.$store.commit('showNotification', {
        style: 'red',
        message: this.$t('common:page.currentPathCopyFailed'),
        icon: 'alert'
      })
    },
    async navigateBreadcrumb (event, item) {
      if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      event.preventDefault()

      const isDirectory = this.$refs.navSidebar && await this.$refs.navSidebar.navigateToDirectory(item.pagePath)
      if (isDirectory) {
        if (this.$vuetify.breakpoint.smAndDown) {
          this.navShown = true
        }
      } else {
        this.loadPage(new URL(item.path, window.location.href), false)
      }
    },
    toggleNavigation () {
      this.navOpen = !this.navOpen
    },
    upBtnScroll () {
      const scrollArea = this.$refs.scrollArea
      this.upBtnShown = scrollArea.scrollTop > scrollArea.clientHeight * 0.33
      if (this.currentViewUrl) {
        this.$set(this.scrollPositions, this.currentViewUrl, scrollArea.scrollTop)
      }
    },
    print () {
      if (this.printView) {
        this.printView = false
      } else {
        this.printView = true
        this.$nextTick(() => {
          window.print()
        })
      }
    },
    pageEdit () {
      this.$root.$emit('pageEdit')
    },
    pageNew () {
      this.$root.$emit('pageNew')
    },
    pageHistory () {
      this.$root.$emit('pageHistory')
    },
    pageSource () {
      this.$root.$emit('pageSource')
    },
    pageConvert () {
      this.$root.$emit('pageConvert')
    },
    pageDuplicate () {
      this.$root.$emit('pageDuplicate')
    },
    pageMove () {
      this.$root.$emit('pageMove')
    },
    pageDelete () {
      this.$root.$emit('pageDelete')
    },
    handleSideNavVisibility () {
      if (window.innerWidth === this.winWidth) { return }
      this.winWidth = window.innerWidth
      if (this.$vuetify.breakpoint.mdAndUp) {
        this.navShown = true
      } else {
        this.navShown = false
      }
    },
    goToComments (focusNewComment = false) {
      this.$vuetify.goTo('#discussion', this.scrollOpts)
      if (focusNewComment) {
        document.querySelector('#discussion-new').focus()
      }
    }
  }
}
</script>

<style lang="scss">

@media screen {
  html.page-view-scroll {
    overflow-y: hidden !important;

    body, #root, .page-view, .page-view > .v-application--wrap {
      height: 100%;
    }

    .page-view > .v-application--wrap {
      min-height: 0;
    }

    .page-view .v-main {
      flex: 1 1 auto;
      min-height: 0;
    }

    .page-view .v-main__wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;

      > .page-breadcrumb-toolbar {
        flex: 0 0 auto;
      }
    }

    .page-scroll-area {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-height: 0;
      overflow-y: auto;

      > .v-footer {
        margin-top: auto;
        padding-left: 16px !important;
      }
    }

    .page-col-sd {
      top: 0;
      max-height: calc(100vh - 113px);
    }
  }
}

.page-nav-drawer {
  box-shadow: 2px 0 6px rgba(0, 0, 0, .16);

  &.v-navigation-drawer--right {
    box-shadow: -2px 0 6px rgba(0, 0, 0, .16);
  }
}

.page-nav-drawer--light {
  background-color: #fff !important;

  .v-list {
    background-color: transparent !important;
    padding-left: 8px;
    padding-right: 8px;
  }

  .v-list-item {
    border-radius: 4px;
  }
}

.theme--light.v-divider.page-breadcrumb-divider {
  position: relative;
  z-index: 1;
  border-color: #d0d7de;
  box-shadow: 0 3px 1px -2px rgba(0, 0, 0, .2), 0 2px 2px 0 rgba(0, 0, 0, .14), 0 1px 5px 0 rgba(0, 0, 0, .12);
}

.breadcrumbs-nav {
  flex: 1 1 auto;
  flex-wrap: nowrap;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-top: 0;
  padding-bottom: 0;
}

.page-breadcrumb-toolbar {
  .v-btn {
    min-width: 0;

    &.v-size--small {
      font-size: 15px;
      letter-spacing: 0;
      min-width: 0;
      padding: 0 0.388889rem;
      text-indent: 0;
    }

    &.page-breadcrumb-copy {
      flex: 0 0 32px;
      height: 32px;
      width: 32px;
    }

    &__content {
      text-transform: none;
    }
  }

  .v-breadcrumbs__divider {
    font-size: 17.5px;
    line-height: 1;
  }

  .v-breadcrumbs__divider:nth-child(2n) {
    padding: 0 3px;
  }

  .v-breadcrumbs__divider:nth-child(2) {
    padding: 0 3px 0 6px;
  }
}

.page-col-sd {
  margin-top: -90px;
  align-self: flex-start;
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  -ms-overflow-style: none;
}

.page-col-sd::-webkit-scrollbar {
  display: none;
}

.page-toc-card .v-list--nav.v-list--dense {
  .v-list-item {
    min-height: 32px;
  }

  .v-list-item:not(:last-child):not(:only-child) {
    margin-bottom: 2px;
  }
}

.page-new-fab {
  margin-bottom: 72px;

  &--with-delete {
    margin-bottom: 144px;
  }
}

.page-edit-fab--with-delete {
  margin-bottom: 72px;
}

.page-more-actions-fab {
  margin-bottom: 8px;

  &--with-delete {
    margin-bottom: 80px;
  }

  &.v-btn--right {
    margin-right: 72px;
  }

  &.v-btn--left {
    margin-left: 72px;
  }
}

.page-edit-shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-bottom: 8px;

  .v-btn {
    border-right: 1px solid #DDD !important;
    border-bottom: 1px solid #DDD !important;
    border-radius: 0;
    color: #777;
    background-color: #FFF !important;

    @at-root .theme--dark & {
      background-color: #222 !important;
      border-right-color: #444 !important;
      border-bottom-color: #444 !important;
      color: #CCC;
    }

    .v-icon {
      color: mc('blue', '700');
    }

    &:first-child {
      border-top-left-radius: 5px;
      border-bottom-left-radius: 5px;
    }

    &:last-child {
      border-top-right-radius: 5px;
      border-bottom-right-radius: 5px;
    }
  }
}

</style>
