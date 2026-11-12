<template lang="pug">
  div
    .pa-3.d-flex(v-if='navMode === `MIXED`', :class='$vuetify.theme.dark ? `grey darken-5` : ``')
      v-btn(
        depressed
        :color='$vuetify.theme.dark ? `grey darken-4` : `white`'
        style='min-width:0;'
        @click='goHome'
        :aria-label='$t(`common:header.home`)'
        )
        v-icon(size='20') mdi-home
      v-btn.ml-3(
        v-if='currentMode === `custom`'
        depressed
        :color='$vuetify.theme.dark ? `grey darken-4` : `white`'
        style='flex: 1 1 100%;'
        @click='switchMode(`browse`)'
        )
        v-icon(left) mdi-file-tree
        .body-2.text-none {{$t('common:sidebar.browse')}}
      v-btn.ml-3(
        v-else-if='currentMode === `browse`'
        depressed
        :color='$vuetify.theme.dark ? `grey darken-4` : `white`'
        style='flex: 1 1 100%;'
        @click='switchMode(`custom`)'
        )
        v-icon(left) mdi-navigation
        .body-2.text-none {{$t('common:sidebar.mainMenu')}}
    v-divider
    //-> Custom Navigation
    v-list.py-2(v-if='currentMode === `custom`', dense, :class='color', :dark='dark')
      template(v-for='item of items')
        v-list-item(
          v-if='item.k === `link`'
          :href='item.t'
          :title='item.l'
          :target='item.y === `externalblank` ? `_blank` : `_self`'
          :rel='item.y === `externalblank` ? `noopener` : ``'
          @click='navigateLink($event, item.t)'
          )
          v-list-item-avatar(size='24', tile)
            v-icon(v-if='item.c.match(/fa[a-z] fa-/)', size='19') {{ item.c }}
            v-icon(v-else) {{ item.c }}
          v-list-item-title {{ item.l }}
        v-divider.my-2(v-else-if='item.k === `divider`')
        v-subheader.pl-4(v-else-if='item.k === `header`') {{ item.l }}
    //-> Browse
    v-list.py-2(v-else-if='currentMode === `browse`', dense, :class='color', :dark='dark')
      template(v-if='currentParent.id > 0')
        v-list-item(
          v-for='(item, idx) of parents'
          :key='`parent-` + item.id'
          :title='item.id === 0 ? `/ ` + $t(`common:sidebar.root`) : item.title'
          @click='fetchBrowseItems(item)'
          :input-value='item.id === currentParent.id'
          :color='dark ? undefined : `primary`'
          style='min-height: 30px;'
          )
          v-list-item-avatar(size='18', :style='`padding-left: ` + (idx * 8) + `px; width: auto; margin: 0 5px 0 0;`')
            v-icon(small) mdi-folder-open
          v-list-item-title {{ item.id === 0 ? '/ ' + $t('common:sidebar.root') : item.title }}
          v-spacer(v-if='item.id === currentParent.id')
          v-btn.nav-sidebar-directory-copy(
            v-if='item.id === currentParent.id'
            icon
            x-small
            :aria-label='$t("common:sidebar.copyDirectoryPath", { defaultValue: "Copy directory path" })'
            :title='$t("common:sidebar.copyDirectoryPath", { defaultValue: "Copy directory path" })'
            v-clipboard='directoryPathForCopy(item.path)'
            @click.stop='stopDirectoryNavigation'
            @success='onDirectoryPathCopied'
            @error='onDirectoryPathCopyError'
            )
            v-icon(small) mdi-content-copy
        v-divider.mt-2
        v-list-item.mt-2(v-if='currentParent.pageId > 0', :key='`directorypage-` + currentParent.id', :href='`/` + currentParent.locale + `/` + currentParent.path', :title='currentParent.title', :input-value='path === currentParent.path', :color='dark ? undefined : `primary`', @click='navigateLink($event, `/` + currentParent.locale + `/` + currentParent.path)')
          v-list-item-avatar(size='24')
            v-icon mdi-text-box
          v-list-item-title {{ currentParent.title }}
      v-text-field.directory-search.mx-2.mt-1.mb-2(
        v-model='directorySearch'
        dense
        outlined
        clearable
        hide-details
        prepend-inner-icon='mdi-magnify'
        :placeholder='$t("common:sidebar.searchDirectory")'
        :aria-label='$t("common:sidebar.searchDirectory")'
        @click:clear='clearDirectorySearch'
        )
      v-subheader.pl-4(v-if='directorySearch && filteredCurrentItems.length < 1')
        em {{ $t('common:sidebar.noDirectoryResults') }}
      template(v-for='item of filteredCurrentItems')
        v-list-item(v-if='item.isFolder', :key='`childfolder-` + item.id', :title='item.title', @click='fetchBrowseItems(item)')
          v-list-item-avatar(size='24')
            v-icon mdi-folder
          v-list-item-title {{ item.title }}
        v-list-item(v-else, :key='`childpage-` + item.id', :href='`/` + item.locale + `/` + item.path', :title='item.title', :input-value='path === item.path', :color='dark ? undefined : `primary`', @click='navigateLink($event, `/` + item.locale + `/` + item.path)')
          v-list-item-avatar(size='24')
            v-icon mdi-text-box
          v-list-item-title {{ item.title }}
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'
import { get } from 'vuex-pathify'
import { VMenu } from 'vuetify/lib/components/VMenu'
import zhTranslations from '../../../../data/sideload/zh.json'

/* global siteLangs */

export default {
  components: {
    VMenu
  },
  props: {
    color: {
      type: String,
      default: 'primary'
    },
    dark: {
      type: Boolean,
      default: true
    },
    items: {
      type: Array,
      default: () => []
    },
    navMode: {
      type: String,
      default: 'MIXED'
    }
  },
  data() {
    return {
      currentMode: 'custom',
      currentItems: [],
      directorySearch: '',
      currentDirectoryReady: false,
      currentParent: {
        id: 0,
        title: '/ (root)'
      },
      parents: [],
      loadedCache: []
    }
  },
  computed: {
    path: get('page/path'),
    locale: get('page/locale'),
    selectedDirectoryPath () {
      if (this.currentMode !== 'browse' || !this.currentDirectoryReady || !this.currentParent) {
        return null
      }
      if (this.currentParent.id === 0) {
        return ''
      }
      return typeof this.currentParent.path === 'string' ? this.currentParent.path : null
    },
    filteredCurrentItems () {
      const query = _.toLower(_.trim(this.directorySearch))
      if (!query) {
        return this.currentItems
      }
      return _.filter(this.currentItems, item => _.toLower(item.title || '').includes(query))
    }
  },
  watch: {
    selectedDirectoryPath: {
      immediate: true,
      handler (path) {
        if (this.$store && typeof this.$store.set === 'function') {
          this.$store.set('site/searchFolderPath', path)
        }
      }
    },
    currentParent (newParent, oldParent) {
      const newId = newParent && newParent.id
      const oldId = oldParent && oldParent.id
      if (newId !== oldId) {
        this.clearDirectorySearch()
      }
    }
  },
  created () {
    const i18next = this.$i18n && this.$i18n.i18next
    if (i18next) {
      for (const key of ['sidebar.copyDirectoryPath', 'sidebar.directoryPathCopied', 'sidebar.directoryPathCopyFailed']) {
        i18next.addResource('zh', 'common', key, zhTranslations[`common:${key}`])
      }
    }
  },
  methods: {
    navigateLink (event, href) {
      this.$emit('navigate', event, href)
    },
    directoryPathForCopy (path) {
      const normalizedPath = _.trim(path || '', '/')
      return normalizedPath ? `/${normalizedPath}/` : '/'
    },
    stopDirectoryNavigation () {},
    onDirectoryPathCopied (event) {
      if (event && event.clearSelection) {
        event.clearSelection()
      }
      this.$store.commit('showNotification', {
        style: 'success',
        message: this.$t('common:sidebar.directoryPathCopied', { defaultValue: 'Directory path copied.' }),
        icon: 'check'
      })
    },
    onDirectoryPathCopyError () {
      this.$store.commit('showNotification', {
        style: 'red',
        message: this.$t('common:sidebar.directoryPathCopyFailed', { defaultValue: 'Failed to copy directory path.' }),
        icon: 'alert'
      })
    },
    clearDirectorySearch () {
      this.directorySearch = ''
    },
    switchMode (mode) {
      if (mode !== this.currentMode) {
        this.clearDirectorySearch()
      }
      this.currentMode = mode
      window.localStorage.setItem('navPref', mode)
      if (mode === `browse` && this.loadedCache.length < 1) {
        this.loadFromCurrentPath()
      }
    },
    async navigateToDirectory (path) {
      const resp = await this.$apollo.query({
        query: gql`
          query ($path: String, $locale: String!) {
            pages {
              tree(path: $path, mode: ALL, locale: $locale, includeAncestors: true) {
                id
                path
                title
                isFolder
                pageId
                parent
                locale
              }
            }
          }
        `,
        fetchPolicy: 'cache-first',
        variables: {
          path,
          locale: this.locale
        }
      })
      const items = _.get(resp, 'data.pages.tree', [])
      const directory = _.find(items, ['path', path])
      if (!directory || !directory.isFolder || directory.pageId) {
        return false
      }

      const ancestors = []
      let parentId = directory.parent
      while (parentId) {
        const parent = _.find(items, ['id', parentId])
        if (!parent) {
          break
        }
        ancestors.push(parent)
        parentId = parent.parent
      }

      this.parents = [{ id: 0, title: '/ (root)' }, ...ancestors.reverse()]
      this.currentParent = _.last(this.parents)
      this.currentMode = 'browse'
      window.localStorage.setItem('navPref', 'browse')
      await this.fetchBrowseItems(directory)
      return true
    },
    async fetchBrowseItems (item) {
      this.$store.commit(`loadingStart`, 'browse-load')
      if (!item) {
        item = this.currentParent
      }

      if (this.loadedCache.indexOf(item.id) < 0) {
        this.currentItems = []
      }

      if (item.id === 0) {
        this.parents = []
      } else {
        const flushRightIndex = _.findIndex(this.parents, ['id', item.id])
        if (flushRightIndex >= 0) {
          this.parents = _.take(this.parents, flushRightIndex)
        }
        if (this.parents.length < 1) {
          this.parents.push(this.currentParent)
        }
        this.parents.push(item)
      }

      this.currentParent = item
      this.currentDirectoryReady = true

      const resp = await this.$apollo.query({
        query: gql`
          query ($parent: Int, $locale: String!) {
            pages {
              tree(parent: $parent, mode: ALL, locale: $locale) {
                id
                path
                title
                isFolder
                pageId
                parent
                locale
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          parent: item.id,
          locale: this.locale
        }
      })
      this.loadedCache = _.union(this.loadedCache, [item.id])
      this.currentItems = _.get(resp, 'data.pages.tree', [])
      this.$store.commit(`loadingStop`, 'browse-load')
    },
    async loadFromCurrentPath(forceRefresh = false) {
      this.$store.commit(`loadingStart`, 'browse-load')
      try {
        const resp = await this.$apollo.query({
          query: gql`
            query ($path: String, $locale: String!) {
              pages {
                tree(path: $path, mode: ALL, locale: $locale, includeAncestors: true) {
                  id
                  path
                  title
                  isFolder
                  pageId
                  parent
                  locale
                }
              }
            }
          `,
          fetchPolicy: forceRefresh ? 'network-only' : 'cache-first',
          variables: {
            path: this.path,
            locale: this.locale
          }
        })
        const items = _.get(resp, 'data.pages.tree', [])
        const curPage = _.find(items, ['pageId', this.$store.get('page/id')])
        if (!curPage) {
          console.warn('Could not find current page in page tree listing!')
          return
        }

        let curParentId = curPage.parent
        let invertedAncestors = []
        while (curParentId) {
          const curParent = _.find(items, ['id', curParentId])
          if (!curParent) {
            break
          }
          invertedAncestors.push(curParent)
          curParentId = curParent.parent
        }

        this.parents = [{ id: 0, title: '/ (root)' }, ...invertedAncestors.reverse()]
        this.currentParent = _.last(this.parents)
        this.currentDirectoryReady = true

        this.loadedCache = [curPage.parent]
        this.currentItems = _.filter(items, ['parent', curPage.parent])
      } finally {
        this.$store.commit(`loadingStop`, 'browse-load')
      }
    },
    goHome (event) {
      const href = siteLangs.length > 0 ? `/${this.locale}/home` : '/'
      this.$emit('navigate', event, href)
      if (!event.defaultPrevented) {
        window.location.assign(href)
      }
    }
  },
  mounted () {
    if (this.navMode === 'TREE') {
      this.currentMode = 'browse'
    } else if (this.navMode === 'STATIC') {
      this.currentMode = 'custom'
    } else {
      this.currentMode = window.localStorage.getItem('navPref') || 'custom'
    }
    if (this.currentMode === 'browse') {
      this.loadFromCurrentPath()
    }
  },
  beforeDestroy () {
    if (this.$store && typeof this.$store.set === 'function') {
      this.$store.set('site/searchFolderPath', null)
    }
  }
}
</script>

<style lang='scss'>
.nav-sidebar-directory-copy {
  flex: 0 0 28px;
  height: 28px;
  margin-right: -8px;
  width: 28px;
}

.directory-search.v-text-field.v-text-field--enclosed.v-text-field--outlined.v-input--dense {
  font-size: 13px;

  > .v-input__control > .v-input__slot {
    min-height: 32px;
    padding: 0 8px;
  }

  .v-input__prepend-inner,
  .v-input__append-inner {
    align-self: center;
    margin-top: 0;
  }

  .v-icon {
    font-size: 18px;
  }
}
</style>
