<template lang='pug'>
  v-container(fluid, grid-list-lg, :class='{ "admin-pages-manager-open": assetManagerShown }')
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header.admin-pages-header
          img.animated.fadeInUp(src='/_assets/svg/icon-file.svg', :alt='$t("admin:ui.pages.title")', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft {{ $t('admin:ui.pages.title') }}
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s {{ $t('admin:ui.pages.subtitle') }}
          v-spacer
          v-btn.animated.fadeInDown.wait-p1s(icon, color='grey', outlined, @click='refresh')
            v-icon.grey--text mdi-refresh
          v-btn.ml-3.animated.fadeInDown(
            v-if='canBrowseAssets'
            ref='assetManagerButton'
            :color='$vuetify.theme.dark ? `white` : `teal`'
            outlined
            large
            :aria-label='$t("admin:ui.pages.assets")'
            :title='$t("admin:ui.pages.assets")'
            @click='openAssetManager'
          )
            v-icon(:left='$vuetify.breakpoint.smAndUp') mdi-folder-multiple-outline
            span.hidden-xs-only {{ $t('admin:ui.pages.assets') }}
          //- v-btn.animated.fadeInDown.mx-3(color='primary', outlined, @click='recyclebin', disabled)
          //-   v-icon(left) mdi-delete-outline
          //-   span Recycle Bin
          v-btn.ml-3.animated.fadeInDown(color='primary', depressed, large, to='pages/visualize')
            v-icon(left) mdi-graph
            span {{ $t('admin:ui.pages.visualize') }}
        v-card.mt-3.animated.fadeInUp
          .admin-pages-filters.pa-2.d-flex.align-center(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-3`')
            v-text-field.admin-pages-filter-search(
              solo
              flat
              v-model='search'
              prepend-inner-icon='mdi-file-search-outline'
              :label='$t("admin:ui.pages.search")'
              hide-details
              dense
              )
          v-divider
          v-data-table(
            :items='filteredPages'
            :headers='headers'
            :search='search'
            :page.sync='pagination'
            :items-per-page='itemsPerPage'
            :loading='loading'
            must-sort,
            sort-by='updatedAt',
            sort-desc,
            hide-default-footer
            @page-count="pageTotal = $event"
            @pagination='filteredPageCount = $event.itemsLength'
          )
            template(slot='item', slot-scope='props')
              tr.is-clickable(:active='props.selected', @click='$router.push(`/pages/` + props.item.id)')
                td.text-center {{ (pagination - 1) * itemsPerPage + props.index + 1 }}
                td
                  .body-2: strong {{ props.item.title }}
                  .caption {{ props.item.description }}
                td.admin-pages-path
                  v-chip(label, small, :color='$vuetify.theme.dark ? `grey darken-4` : `grey lighten-4`') {{ getLocaleName(props.item.locale) }}
                  span.ml-2.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`') / {{ props.item.path }}
                td {{ formatPageListDate(props.item.createdAt) }}
                td {{ formatPageListDate(props.item.updatedAt) }}
            template(slot='loading')
              span {{ $t('common:dataIterator.loadingText') }}
            template(slot='no-data')
              v-alert.ma-3(icon='mdi-alert', :value='true', outlined) {{ $t('admin:ui.pages.empty') }}
          .admin-pages-pagination.pa-2.animated.fadeInDown
            span.caption {{ $t('admin:ui.pages.countTotal', { count: filteredPageCount }) }}
            v-pagination(v-model='pagination', :length='Math.max(1, pageTotal)', :disabled='filteredPageCount === 0', :total-visible='5', color='primary')
            v-select.admin-pages-page-size(
              v-model='itemsPerPage'
              :items='pageSizeOptions'
              :aria-label='$t("admin:ui.pages.itemsPerPage")'
              dense
              hide-details
              outlined
            )
        editor-modal-media(v-if='assetManagerShown', management, @close='closeAssetManager')
</template>

<script>
import _ from 'lodash'
import pagesQuery from 'gql/admin/pages/pages-query-list.gql'
import zhTranslations from '../../../data/sideload/zh.json'
import enTranslations from '../../../data/sideload/en.json'

/* global siteLangs */

export default {
  i18nOptions: { namespaces: ['admin', 'editor', 'common'] },
  components: {
    editorModalMedia: () => import(/* webpackChunkName: "editor", webpackMode: "lazy" */ '../editor/editor-modal-media.vue')
  },
  data() {
    return {
      assetManagerShown: false,
      selectedPage: {},
      pagination: 1,
      itemsPerPage: 20,
      pages: [],
      pageTotal: 0,
      filteredPageCount: 0,
      search: '',
      selectedLang: null,
      selectedState: null,
      states: [
        { text: this.$t('admin:ui.pages.states.all'), value: null },
        { text: this.$t('admin:ui.pages.states.published'), value: true },
        { text: this.$t('admin:ui.pages.states.unpublished'), value: false }
      ],
      loading: false
    }
  },
  computed: {
    headers () {
      return [
        { text: this.$t('admin:ui.pages.columns.number'), value: 'id', width: 80, sortable: false, align: 'center' },
        { text: this.$t('admin:ui.pages.columns.title'), value: 'title' },
        { text: this.$t('admin:ui.pages.columns.path'), value: 'path' },
        { text: this.$t('admin:ui.pages.columns.created'), value: 'createdAt', width: 250 },
        { text: this.$t('admin:ui.pages.columns.updated'), value: 'updatedAt', width: 250 }
      ]
    },
    pageSizeOptions () {
      return [20, 50, 100].map(value => ({
        text: this.$t('admin:ui.pages.pageSizeOption', { count: value }),
        value
      }))
    },
    canBrowseAssets () {
      return _.some(_.get(this.$store, 'state.user.permissions', []), permission => ['manage:system', 'read:assets'].includes(permission))
    },
    filteredPages () {
      return _.filter(this.pages, pg => {
        if (this.selectedLang !== null && this.selectedLang !== pg.locale) {
          return false
        }
        if (this.selectedState !== null && this.selectedState !== pg.isPublished) {
          return false
        }
        return true
      })
    },
    langs () {
      const pageLocales = _.uniqBy(this.pages, 'locale').map(pg => {
        const locale = _.find(siteLangs, ['code', pg.locale])
        return {
          text: locale ? locale.name : pg.locale,
          value: pg.locale
        }
      })
      return _.concat({ text: this.$t('admin:ui.pages.allLocales'), value: null }, pageLocales)
    }
  },
  watch: {
    itemsPerPage () {
      this.pagination = 1
    }
  },
  created() {
    if (this.$i18n && this.$i18n.i18next) {
      for (const [locale, translations] of Object.entries({ zh: zhTranslations, en: enTranslations })) {
        if (this.$i18n.i18next.getResource(locale, 'common', 'dataIterator.loadingText') === undefined) {
          this.$i18n.i18next.addResource(locale, 'common', 'dataIterator.loadingText', translations['common:dataIterator.loadingText'])
        }
        for (const key of ['assets', 'columns.number', 'countTotal', 'itemsPerPage', 'pageSizeOption']) {
          this.$i18n.i18next.addResource(locale, 'admin', `ui.pages.${key}`, translations[`admin:ui.pages.${key}`])
        }
      }
    }
  },
  methods: {
    async openAssetManager () {
      if (!this.$store.state.editor) {
        const { default: editorStore } = await import('../../store/editor')
        if (!this.$store.state.editor) {
          this.$store.registerModule('editor', editorStore)
        }
      }
      this.$store.set('editor/editorKey', 'common')
      this.assetManagerShown = true
    },
    closeAssetManager () {
      this.assetManagerShown = false
      this.$nextTick(() => {
        if (this.$refs.assetManagerButton) {
          this.$refs.assetManagerButton.$el.focus()
        }
      })
    },
    formatPageListDate(date) {
      if (!date) {
        return date
      }
      const value = this.$moment(date)
      if (!value.isValid()) {
        return date
      }
      return value.locale('en').format('YYYY-MM-DD HH:mm:ss')
    },
    getLocaleName (code) {
      return _.get(_.find(siteLangs, ['code', code]), 'name', code)
    },
    async refresh() {
      await this.$apollo.queries.pages.refetch()
      this.$store.commit('showNotification', {
        message: this.$t('admin:ui.pages.refreshSuccess'),
        style: 'success',
        icon: 'cached'
      })
    },
    newpage() {
      this.pageSelectorShown = true
    },
    recyclebin () { }
  },
  apollo: {
    pages: {
      query: pagesQuery,
      fetchPolicy: 'network-only',
      update: (data) => data.pages.list,
      watchLoading (isLoading) {
        this.loading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-pages-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.admin-pages-manager-open {
  position: relative;
  z-index: 5;
}

.admin-pages-header {
  flex-wrap: wrap;
  row-gap: 8px;
}

.admin-pages-filters {
  flex-wrap: wrap;
  gap: 8px;

  .admin-pages-filter-search {
    flex: 0 1 247px;
    max-width: 247px;
  }
}

.admin-pages-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;

  .admin-pages-page-size {
    flex: 0 0 112px;
    max-width: 112px;
    font-size: 14px;
  }

  .admin-pages-page-size.v-text-field--outlined.v-input--dense > .v-input__control > .v-input__slot {
    min-height: 36px;
  }

  .admin-pages-page-size .v-select__selections input {
    max-height: 28px;
  }

  .admin-pages-page-size .v-input__append-inner {
    margin-top: 6px;
  }
}

.admin-pages-path {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-family: 'Roboto Mono', monospace;
}
</style>
