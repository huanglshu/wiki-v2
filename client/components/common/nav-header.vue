<template lang='pug'>
  v-app-bar.nav-header(:color='headerColor', :class='{ "nav-header--site": siteHeader }', dark, app, :clipped-left='!$vuetify.rtl', :clipped-right='$vuetify.rtl', fixed, flat, :extended='searchIsShown && $vuetify.breakpoint.smAndDown')
    v-toolbar(:color='mobileSearchColor', flat, slot='extension', v-if='searchIsShown && $vuetify.breakpoint.smAndDown')
      .nav-header-search
        v-select.nav-header-search-scope(
          v-model='searchScope'
          :items='searchScopes'
          :aria-label='$t(`common:header.searchScope`, { defaultValue: `Search scope` })'
          :menu-props='{ bottom: true, offsetY: true, minWidth: `92`, zIndex: 101, contentClass: `nav-header-search-scope-menu` }'
          solo
          flat
          dense
          hide-details
        )
        v-text-field.nav-header-search-input(
          ref='searchFieldMobile'
          v-model='search'
          clearable
          color='white'
          :label='$t(`common:header.search`)'
          single-line
          solo
          flat
          dense
          hide-details
          prepend-inner-icon='mdi-magnify'
          :loading='searchIsLoading'
          @keyup.enter='searchEnter'
          autocomplete='off'
        )
    v-layout(row)
      v-flex(xs5, md4)
        v-toolbar.nav-header-inner(:color='headerColor', dark, flat, :class='$vuetify.rtl ? `pr-3` : `pl-3`')
          v-avatar(tile, size='34', @click='goHome')
            v-img.org-logo(:src='logoUrl')
          //- v-menu(open-on-hover, offset-y, bottom, left, min-width='250', transition='slide-y-transition')
          //-   template(v-slot:activator='{ on }')
          //-     v-app-bar-nav-icon.btn-animate-app(v-on='on', :class='$vuetify.rtl ? `mx-0` : ``')
          //-       v-icon mdi-menu
          //-   v-list(nav, :light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark', :class='$vuetify.theme.dark ? `grey darken-4` : ``')
          //-     v-list-item.pl-4(href='/')
          //-       v-list-item-avatar(size='24'): v-icon(color='blue') mdi-home
          //-       v-list-item-title.body-2 {{$t('common:header.home')}}
          //-     v-list-item.pl-4(@click='')
          //-       v-list-item-avatar(size='24'): v-icon(color='grey lighten-2') mdi-file-tree
          //-       v-list-item-content
          //-         v-list-item-title.body-2.grey--text.text--ligten-2 {{$t('common:header.siteMap')}}
          //-         v-list-item-subtitle.overline.grey--text.text--lighten-2 Coming soon
          //-     v-list-item.pl-4(href='/t')
          //-       v-list-item-avatar(size='24'): v-icon(color='teal') mdi-tag-multiple
          //-       v-list-item-title.body-2 {{$t('common:header.browseTags')}}
          //-     v-list-item.pl-4(@click='assets')
          //-       v-list-item-avatar(size='24'): v-icon(color='grey lighten-2') mdi-folder-multiple-image
          //-       v-list-item-content
          //-         v-list-item-title.body-2.grey--text.text--ligten-2 {{$t('common:header.imagesFiles')}}
          //-         v-list-item-subtitle.overline.grey--text.text--lighten-2 Coming soon
          v-toolbar-title(:class='{ "mx-3": $vuetify.breakpoint.mdAndUp, "mx-1": $vuetify.breakpoint.smAndDown }')
            span.subheading {{title}}
      v-flex(md4, v-if='$vuetify.breakpoint.mdAndUp')
        v-toolbar.nav-header-inner(:color='headerColor', dark, flat)
          slot(name='mid')
            transition(name='navHeaderSearch', v-if='searchIsShown')
              .nav-header-search(v-if='searchIsShown && $vuetify.breakpoint.mdAndUp')
                v-select.nav-header-search-scope(
                  v-model='searchScope'
                  :items='searchScopes'
                  :aria-label='$t(`common:header.searchScope`, { defaultValue: `Search scope` })'
                  :menu-props='{ bottom: true, offsetY: true, minWidth: `92`, zIndex: 101, contentClass: `nav-header-search-scope-menu` }'
                  solo
                  flat
                  dense
                  hide-details
                )
                v-text-field.nav-header-search-input(
                  ref='searchField',
                  v-model='search',
                  color='white',
                  :label='$t(`common:header.search`)',
                  single-line,
                  solo
                  flat
                  dense
                  hide-details,
                  :loading='searchIsLoading',
                  @keyup.enter='searchEnter'
                  @keyup.esc='searchClose'
                  @focus='searchFocus'
                  @blur='searchBlur'
                  @keyup.down='searchMove(`down`)'
                  @keyup.up='searchMove(`up`)'
                  autocomplete='off'
                )
      v-flex(xs7, md4)
        v-toolbar.nav-header-inner.pr-4(:color='headerColor', dark, flat)
          v-spacer
          .navHeaderLoading.mr-3
            v-progress-circular(indeterminate, color='blue', :size='22', :width='2' v-show='isLoading')

          slot(name='actions')

          //- (mobile) SEARCH TOGGLE

          v-btn(
            v-if='!hideSearch && $vuetify.breakpoint.smAndDown'
            @click='searchToggle'
            icon
            )
            v-icon(color='grey') mdi-magnify

          //- LANGUAGES

          template(v-if='mode === `view` && locales.length > 0')
            v-menu(offset-y, bottom, transition='slide-y-transition', max-height='320px', min-width='210px', left)
              template(v-slot:activator='{ on: menu, attrs }')
                v-btn(
                  icon
                  v-bind='attrs'
                  v-on='menu'
                  :class='$vuetify.rtl ? `ml-3` : ``'
                  tile
                  height='64'
                  :aria-label='$t(`common:header.language`)'
                  )
                  v-icon(color='grey') mdi-web
              v-list(nav)
                template(v-for='(lc, idx) of locales')
                  v-list-item(@click='changeLocale(lc)')
                    v-list-item-action(style='min-width:auto;'): v-chip(:color='lc.code === locale ? `blue` : `grey`', small, label, dark) {{lc.code.toUpperCase()}}
                    v-list-item-title {{lc.name}}
            v-divider(vertical)

          //- PAGE ACTIONS

          template(v-if='false')
            v-menu(offset-y, bottom, transition='slide-y-transition', left)
              template(v-slot:activator='{ on: menu, attrs }')
                v-btn(
                  icon
                  v-bind='attrs'
                  v-on='menu'
                  :class='$vuetify.rtl ? `ml-3` : ``'
                  tile
                  height='64'
                  :aria-label='$t(`common:header.pageActions`)'
                  )
                  v-icon(color='grey') mdi-file-document-edit-outline
              v-list(nav, :light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark', :class='$vuetify.theme.dark ? `grey darken-4` : ``')
                .overline.pa-4.grey--text {{$t('common:header.currentPage')}}
                v-list-item.pl-4(@click='pageView', v-if='mode !== `view`')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-file-document-outline
                  v-list-item-title.body-2 {{$t('common:header.view')}}
                v-list-item.pl-4(@click='pageEdit', v-if='mode !== `edit` && hasWritePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-file-document-edit-outline
                  v-list-item-title.body-2 {{$t('common:header.edit')}}
                v-list-item.pl-4(@click='pageHistory', v-if='mode !== `history` && hasReadHistoryPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-history
                  v-list-item-content
                    v-list-item-title.body-2 {{$t('common:header.history')}}
                v-list-item.pl-4(@click='pageSource', v-if='mode !== `source` && hasReadSourcePermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-code-tags
                  v-list-item-title.body-2 {{$t('common:header.viewSource')}}
                v-list-item.pl-4(@click='pageConvert', v-if='hasWritePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-lightning-bolt
                  v-list-item-title.body-2 {{$t('common:header.convert')}}
                v-list-item.pl-4(@click='pageDuplicate', v-if='hasWritePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-content-duplicate
                  v-list-item-title.body-2 {{$t('common:header.duplicate')}}
                v-list-item.pl-4(@click='pageMove', v-if='hasManagePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-content-save-move-outline
                  v-list-item-content
                    v-list-item-title.body-2 {{$t('common:header.move')}}
                v-list-item.pl-4(@click='pageDelete', v-if='hasDeletePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='red darken-2') mdi-trash-can-outline
                  v-list-item-title.body-2 {{$t('common:header.delete')}}
            v-divider(vertical)

          //- NEW PAGE

          template(v-if='false')
            v-btn(icon, tile, height='64', @click='pageNew', :aria-label='$t(`common:header.newPage`)')
              v-icon(color='grey') mdi-text-box-plus-outline
            v-divider(vertical)

          //- ADMIN

          template(v-if='isAuthenticated && isAdmin')
            v-btn(v-if='mode !== `admin`', icon, tile, height='64', href='/a', :aria-label='$t(`common:header.admin`)')
              v-icon(color='grey') mdi-cog
            v-btn.nav-header-back-to-site(v-else, text, tile, height='64', href='/', :aria-label='$t(`common:header.backToSite`)')
              v-icon(left, color='grey') mdi-exit-to-app
              span.nav-header-back-to-site__label {{$t('common:header.backToSite')}}
            v-divider(vertical)

          //- ACCOUNT

          v-menu(v-if='isAuthenticated', offset-y, bottom, min-width='300', transition='slide-y-transition', left)
            template(v-slot:activator='{ on: menu, attrs }')
              v-btn(
                icon
                v-bind='attrs'
                v-on='menu'
                :class='$vuetify.rtl ? `ml-0` : ``'
                tile
                height='64'
                :aria-label='$t(`common:header.account`)'
                )
                v-icon(v-if='picture.kind === `initials`', color='grey') mdi-account-circle
                v-avatar(v-else-if='picture.kind === `image`', :size='34')
                  v-img(:src='picture.url')
            v-list(nav)
              v-list-item.py-3.grey(:class='$vuetify.theme.dark ? `darken-4-l5` : `lighten-5`')
                v-list-item-avatar
                  v-avatar.blue(v-if='picture.kind === `initials`', :size='40')
                    span.white--text.subheading {{picture.initials}}
                  v-avatar(v-else-if='picture.kind === `image`', :size='40')
                    v-img(:src='picture.url')
                v-list-item-content
                  v-list-item-title {{name}}
                  v-list-item-subtitle {{email}}
              //- v-list-item(href='/w', disabled)
              //-   v-list-item-action: v-icon(color='blue') mdi-view-compact-outline
              //-   v-list-item-content
              //-     v-list-item-title {{$t('common:header.myWiki')}}
              //-     v-list-item-subtitle.overline Coming soon
              v-list-item(href='/p')
                v-list-item-action: v-icon(color='blue-grey') mdi-face-profile
                v-list-item-content
                  v-list-item-title(:class='$vuetify.theme.dark ? `blue-grey--text text--lighten-3` : `blue-grey--text`') {{$t('common:header.profile')}}
              v-list-item(@click='logout')
                v-list-item-action: v-icon(color='red') mdi-logout
                v-list-item-title.red--text {{$t('common:header.logout')}}

          v-btn(v-else, icon, color='grey darken-3', href='/login', :aria-label='$t(`common:header.login`)')
            v-icon(color='grey') mdi-account-circle

    page-selector(mode='create', v-model='newPageModal', :open-handler='pageNewCreate', :locale='locale')
    page-selector(mode='move', v-model='movePageModal', :open-handler='pageMoveRename', :path='path', :locale='locale')
    page-selector(mode='create', v-model='duplicateOpts.modal', :open-handler='pageDuplicateHandle', :path='duplicateOpts.path', :locale='duplicateOpts.locale')
    page-delete(v-model='deletePageModal', v-if='path && path.length')
    page-convert(v-model='convertPageModal', v-if='path && path.length')

    .nav-header-dev(v-if='isDevMode')
      div
        .overline {{$t('common:header.developmentVersion', { defaultValue: 'DEVELOPMENT VERSION' })}}
</template>

<script>
import { get, sync } from 'vuex-pathify'
import _ from 'lodash'

import movePageMutation from 'gql/common/common-pages-mutation-move.gql'
import clearClientCache from '../../helpers/client-cache'
import zhTranslations from '../../../data/sideload/zh.json'
import enTranslations from '../../../data/sideload/en.json'

/* global siteConfig, siteLangs */

export default {
  components: {
    PageDelete: () => import('./page-delete.vue'),
    PageConvert: () => import('./page-convert.vue')
  },
  props: {
    dense: {
      type: Boolean,
      default: false
    },
    hideSearch: {
      type: Boolean,
      default: false
    },
    siteHeader: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      menuIsShown: true,
      searchIsShown: true,
      searchAdvMenuShown: false,
      newPageModal: false,
      movePageModal: false,
      convertPageModal: false,
      deletePageModal: false,
      locales: siteLangs,
      isDevMode: false,
      duplicateOpts: {
        locale: 'en',
        path: 'new-page',
        modal: false
      }
    }
  },
  computed: {
    headerColor () {
      return this.siteHeader ? '#3360a0' : 'black'
    },
    mobileSearchColor () {
      return this.siteHeader ? this.headerColor : 'deep-purple'
    },
    search: sync('site/search'),
    searchScope: sync('site/searchScope'),
    searchScopes () {
      return [
        { text: this.$t('common:header.searchScopeGlobal', { defaultValue: 'Global search' }), value: 'global' },
        { text: this.$t('common:header.searchScopeFolder', { defaultValue: 'Current folder' }), value: 'folder', disabled: !this.path }
      ]
    },
    searchIsFocused: sync('site/searchIsFocused'),
    searchIsLoading: sync('site/searchIsLoading'),
    searchRestrictLocale: sync('site/searchRestrictLocale'),
    searchRestrictPath: sync('site/searchRestrictPath'),
    isLoading: get('isLoading'),
    title: get('site/title'),
    logoUrl: get('site/logoUrl'),
    path: get('page/path'),
    locale: get('page/locale'),
    mode: get('page/mode'),
    name: get('user/name'),
    email: get('user/email'),
    pictureUrl: get('user/pictureUrl'),
    isAuthenticated: get('user/authenticated'),
    permissions: get('user/permissions'),
    picture () {
      if (this.pictureUrl && this.pictureUrl.length > 1) {
        return {
          kind: 'image',
          url: (this.pictureUrl === 'internal') ? `/_userav/${this.$store.get('user/id')}` : this.pictureUrl
        }
      } else {
        const nameParts = this.name.toUpperCase().split(' ')
        let initials = _.head(nameParts).charAt(0)
        if (nameParts.length > 1) {
          initials += _.last(nameParts).charAt(0)
        }
        return {
          kind: 'initials',
          initials
        }
      }
    },
    isAdmin () {
      return _.intersection(this.permissions, ['manage:system', 'write:users', 'manage:users', 'write:groups', 'manage:groups', 'manage:navigation', 'manage:theme', 'manage:api']).length > 0
    },
    hasNewPagePermission () {
      return this.hasAdminPermission || _.intersection(this.permissions, ['write:pages']).length > 0
    },
    hasAdminPermission: get('page/effectivePermissions@system.manage'),
    hasWritePagesPermission: get('page/effectivePermissions@pages.write'),
    hasManagePagesPermission: get('page/effectivePermissions@pages.manage'),
    hasDeletePagesPermission: get('page/effectivePermissions@pages.delete'),
    hasReadSourcePermission: get('page/effectivePermissions@source.read'),
    hasReadHistoryPermission: get('page/effectivePermissions@history.read'),
    hasAnyPagePermissions () {
      return this.hasAdminPermission || this.hasWritePagesPermission || this.hasManagePagesPermission ||
        this.hasDeletePagesPermission || this.hasReadSourcePermission || this.hasReadHistoryPermission
    }
  },
  created () {
    if (this.$i18n && this.$i18n.i18next) {
      for (const [locale, translations] of Object.entries({ zh: zhTranslations, en: enTranslations })) {
        for (const key of ['header.searchScope', 'header.searchScopeGlobal', 'header.searchScopeFolder']) {
          this.$i18n.i18next.addResource(locale, 'common', key, translations[`common:${key}`])
        }
      }
      this.$i18n.i18next.addResource('zh', 'common', 'header.developmentVersion', zhTranslations['common:header.developmentVersion'])
    }
    if (this.searchScope === 'page') {
      this.searchScope = 'global'
    }
    if (this.hideSearch || this.dense || this.$vuetify.breakpoint.smAndDown) {
      this.searchIsShown = false
    }
  },
  mounted () {
    this.$root.$on('pageEdit', () => {
      this.pageEdit()
    })
    this.$root.$on('pageNew', () => {
      this.pageNew()
    })
    this.$root.$on('pageHistory', () => {
      this.pageHistory()
    })
    this.$root.$on('pageSource', () => {
      this.pageSource()
    })
    this.$root.$on('pageMove', () => {
      this.pageMove()
    })
    this.$root.$on('pageConvert', () => {
      this.pageConvert()
    })
    this.$root.$on('pageDuplicate', () => {
      this.pageDuplicate()
    })
    this.$root.$on('pageDelete', () => {
      this.pageDelete()
    })
    this.isDevMode = siteConfig.devMode === true
  },
  methods: {
    searchFocus () {
      this.searchIsFocused = true
    },
    searchBlur () {
      this.searchIsFocused = false
    },
    searchClose () {
      this.search = ''
      this.searchBlur()
    },
    searchToggle () {
      this.searchIsShown = !this.searchIsShown
      if (this.searchIsShown) {
        _.delay(() => {
          this.$refs.searchFieldMobile.focus()
        }, 200)
      }
    },
    searchEnter () {
      this.$root.$emit('searchEnter', true)
    },
    searchMove(dir) {
      this.$root.$emit('searchMove', dir)
    },
    pageNew () {
      this.newPageModal = true
    },
    pageNewCreate ({ path, locale }) {
      window.location.assign(`/e/${locale}/${path}`)
    },
    pageView () {
      window.location.assign(`/${this.locale}/${this.path}`)
    },
    pageEdit () {
      window.location.assign(`/e/${this.locale}/${this.path}`)
    },
    pageHistory () {
      window.location.assign(`/h/${this.locale}/${this.path}`)
    },
    pageSource () {
      window.location.assign(`/s/${this.locale}/${this.path}`)
    },
    pageDuplicate () {
      const pathParts = this.path.split('/')
      this.duplicateOpts = {
        locale: this.locale,
        path: (pathParts.length > 1) ? _.initial(pathParts).join('/') + `/new-page` : `new-page`,
        modal: true
      }
    },
    pageDuplicateHandle ({ locale, path }) {
      window.location.assign(`/e/${locale}/${path}?from=${this.$store.get('page/id')}`)
    },
    pageConvert () {
      this.convertPageModal = true
    },
    pageMove () {
      this.movePageModal = true
    },
    async pageMoveRename ({ path, locale }) {
      this.$store.commit(`loadingStart`, 'page-move')
      try {
        const resp = await this.$apollo.mutate({
          mutation: movePageMutation,
          variables: {
            id: this.$store.get('page/id'),
            destinationLocale: locale,
            destinationPath: path
          }
        })
        if (_.get(resp, 'data.pages.move.responseResult.succeeded', false)) {
          window.location.replace(`/${locale}/${path}`)
        } else {
          throw new Error(_.get(resp, 'data.pages.move.responseResult.message', this.$t('common:error.unexpected')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
        this.$store.commit(`loadingStop`, 'page-move')
      }
    },
    pageDelete () {
      this.deletePageModal = true
    },
    assets () {
      // window.location.assign(`/f`)
      this.$store.commit('showNotification', {
        style: 'indigo',
        message: `Coming soon...`,
        icon: 'ferry'
      })
    },
    async changeLocale (locale) {
      await this.$i18n.i18next.changeLanguage(locale.code)
      switch (this.mode) {
        case 'view':
        case 'history':
          window.location.assign(`/${locale.code}/${this.path}`)
          break
      }
    },
    async logout () {
      await clearClientCache()
      window.location.assign('/logout')
    },
    goHome () {
      if (this.locales && this.locales.length > 0) {
        window.location.assign(`/${this.locale}/home`)
      } else {
        window.location.assign('/')
      }
    }
  }
}
</script>

<style lang='scss'>

.nav-header-search-scope-menu {
  width: max-content;

  .v-list {
    padding: 0;
  }

  .v-list-item {
    min-height: 32px;
    padding-inline: 10px;
  }

  .v-list-item__content {
    padding: 6px 0;
  }

  .v-list-item .v-list-item__title {
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    text-align: center;
  }
}

.nav-header-search {
  display: flex;
  align-items: center;
  width: calc(62.5% + 130px);
  max-width: 100%;
  min-width: 0;
  margin-inline: auto;
  border-radius: 6px;
  background-color: #1e1e1e;
}

.nav-header-search-scope.v-input {
  flex: 0 0 120px;
  min-width: 0;
  font-size: 14px;

  &::after {
    content: '';
    position: absolute;
    inset-inline-end: 0;
    top: 50%;
    height: 20px;
    border-inline-end: 1px solid rgba(255, 255, 255, .25);
    transform: translateY(-50%);
    pointer-events: none;
  }
}

.nav-header-search-scope.v-text-field.v-text-field--enclosed > .v-input__control > .v-input__slot {
  padding: 0 6px;
}

.nav-header-search-scope .v-select__selection {
  max-width: 100%;
  margin-inline: 0;
}

.nav-header-search-scope .v-select__selections {
  justify-content: center;
}

.nav-header-search-scope .v-select__selections input {
  flex: 0 0 0;
  width: 0;
}

.nav-header-search-input.v-input {
  flex: 1 1 0;
  min-width: 80px;
}

.nav-header-search-input.v-text-field.v-text-field--enclosed > .v-input__control > .v-input__slot {
  padding-inline-start: 8px;
}

.nav-header-search-scope .v-input__slot,
.nav-header-search-input .v-input__slot {
  background-color: transparent !important;
  border-radius: 0;
}

.nav-header {
  //z-index: 1000;

  &--site {
    .nav-header-inner .v-btn .v-icon.grey--text {
      color: #e3ebf7 !important;
    }

    .nav-header-inner .v-divider {
      border-color: rgba(255, 255, 255, .2);
    }

    .nav-header-search {
      background-color: rgba(255, 255, 255, .14) !important;
    }
  }

  .v-toolbar__extension {
    padding: 0;

    .v-toolbar__content {
      padding: 0;
    }
    .v-text-field .v-input__prepend-inner {
      padding: 0 14px 0 5px;
      padding-right: 14px;
    }
  }

  .org-logo {
    cursor: pointer;
  }

  &-inner {
    .v-toolbar__content {
      padding: 0;
    }
  }

  &-back-to-site {
    .v-btn__content {
      align-items: center;
    }

    .v-icon,
    &__label {
      line-height: 1;
    }
  }

  &-search-adv {
    position: absolute;
    top: 7px;
    right: 12px;
    border-radius: 4px !important;

    @at-root .v-application--is-rtl & {
      right: initial;
      left: 12px;
    }

    &::before {
      border-radius: 4px !important;
    }

    &:hover, &:focus {
      position: absolute !important;

      &::before {
        border-radius: 4px;
      }
    }
  }

  &-dev {
    background-color: mc('red', '600');
    position: absolute;
    top: 50%;
    left: 255px;
    padding: 5px 10px;
    border-radius: 999px;
    display: flex;
    transform: translateY(-50%);
  }
}

.navHeaderSearch {
  &-enter-active, &-leave-active {
    transition: opacity .25s ease, transform .25s ease;
    opacity: 1;
  }
  &-enter-active {
    transition-delay: .25s;
  }
  &-enter, &-leave-to {
    opacity: 0;
    transform: scale(.7, .7);
  }
}
.navHeaderLoading { // To avoid search bar jumping
  width: 22px;
}

</style>
