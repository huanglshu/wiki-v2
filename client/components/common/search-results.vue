<template lang="pug">
  .search-results(v-if='searchIsFocused || (search && search.length > 1)', @click.self='closeSearch')
    .search-results-container(@click.self='closeSearch')
      .search-results-help(v-if='!search || (search && search.length < 2)')
        v-icon(size='18', aria-hidden='true') mdi-magnify
        span {{$t('common:header.searchHint')}}
      .search-results-help(v-else-if='folderScopeUnavailable', role='status')
        v-icon(size='18', aria-hidden='true') mdi-folder-open-outline
        span {{$t('common:header.searchSelectFolder')}}
      .search-results-loader(v-else-if='searchIsLoading && (!results || results.length < 1)')
        orbit-spinner(
          :animation-duration='1000'
          :size='100'
          color='#FFF'
        )
        .headline.mt-5 {{$t('common:header.searchLoading')}}
      .search-results-none(v-else-if='searchFailed', role='alert')
        v-icon(size='18', aria-hidden='true') mdi-alert-circle-outline
        span {{$t('common:header.searchUnavailable')}}
      .search-results-none(v-else-if='!searchIsLoading && (!results || results.length < 1)', role='status')
        v-icon(size='18', aria-hidden='true') mdi-magnify
        span {{$t('common:header.searchNoResult')}}
      template(v-if='!folderScopeUnavailable && search && search.length >= 2 && results && results.length > 0')
        v-subheader.white--text {{$t('common:header.searchResultsCount', { total: response.totalHits })}}
        .search-results-items.radius-7(ref='resultsList', role='listbox', tabindex='0')
          .search-result-line(
            v-for='(item, idx) of results'
            ref='resultRows'
            :key='item.id'
            role='option'
            :aria-selected='idx === cursor ? `true` : `false`'
            :class='idx === cursor ? `highlighted` : ``'
            :title='getItemTooltip(item)'
            @mouseenter='cursor = idx'
            @click='goToPage(item)'
            @click.middle='goToPageInNewTab(item)'
          )
            .search-result-line__code
              template(v-for='(seg, segIdx) of getHighlightedSegments(item.description || item.title, search)')
                mark.search-highlight(v-if='seg.match', :key='segIdx', v-text='seg.text')
                span(v-else, :key='segIdx', v-text='seg.text')
            span.search-result-line__doc(v-text='getResultPath(item)')
        v-pagination.mt-3(
          v-if='paginationLength > 1'
          dark
          v-model='pagination'
          :length='paginationLength'
          circle
        )
      template(v-if='!folderScopeUnavailable && suggestions && suggestions.length > 0')
        v-subheader.white--text.mt-3 {{$t('common:header.searchDidYouMean')}}
        v-list.search-results-suggestions.radius-7(dense, dark)
          template(v-for='(term, idx) of suggestions')
            v-list-item(:key='term', @click='setSearchTerm(term)', :class='idx + results.length === cursor ? `highlighted` : ``')
              v-list-item-avatar
                v-icon mdi-magnify
              v-list-item-content
                v-list-item-title(v-text='term')
            v-divider(v-if='idx < suggestions.length - 1')
</template>

<script>
import _ from 'lodash'
import { get, sync } from 'vuex-pathify'
import { OrbitSpinner } from 'epic-spinners'

import searchPagesQuery from 'gql/common/common-pages-query-search.gql'
import zhTranslations from '../../../data/sideload/zh.json'
import enTranslations from '../../../data/sideload/en.json'

export default {
  components: {
    OrbitSpinner
  },
  data() {
    return {
      cursor: 0,
      pagination: 1,
      perPage: 50,
      searchFailed: false,
      response: {
        results: [],
        suggestions: [],
        totalHits: 0
      }
    }
  },
  computed: {
    search: sync('site/search'),
    searchScope: sync('site/searchScope'),
    searchFolderPath: get('site/searchFolderPath'),
    pagePath: get('page/path'),
    pageLocale: get('page/locale'),
    searchIsFocused: sync('site/searchIsFocused'),
    searchIsLoading: sync('site/searchIsLoading'),
    searchRestrictLocale: sync('site/searchRestrictLocale'),
    searchRestrictPath: sync('site/searchRestrictPath'),
    folderScopeUnavailable() {
      return this.searchScope === 'folder' && typeof this.searchFolderPath !== 'string'
    },
    results() {
      const currentIndex = (this.pagination - 1) * this.perPage
      return this.response.results ? _.slice(this.response.results, currentIndex, currentIndex + this.perPage) : []
    },
    hits() {
      return this.response.totalHits ? this.response.totalHits : 0
    },
    suggestions() {
      return this.response.suggestions ? this.response.suggestions : []
    },
    paginationLength() {
      return (this.response.totalHits > 0) ? Math.ceil(this.response.totalHits / this.perPage) : 0
    }
  },
  watch: {
    search(newValue, oldValue) {
      this.cursor = 0
      this.searchFailed = false
      if (!newValue || (newValue && newValue.length < 2) || this.folderScopeUnavailable) {
        this.searchIsLoading = false
      } else {
        this.searchIsLoading = true
      }
    },
    searchScope() {
      this.resetScopeResults()
    },
    searchFolderPath() {
      if (this.searchScope === 'folder') {
        this.resetScopeResults()
      }
    },
    results() {
      this.cursor = 0
      this.$nextTick(() => {
        if (this.$refs.resultsList) {
          this.$refs.resultsList.scrollTop = 0
        }
      })
    }
  },
  created() {
    const i18next = this.$i18n && this.$i18n.i18next
    if (i18next) {
      for (const [locale, translations] of Object.entries({ zh: zhTranslations, en: enTranslations })) {
        for (const key of ['searchUnavailable', 'searchSelectFolder']) {
          i18next.addResource(locale, 'common', `header.${key}`, translations[`common:header.${key}`])
        }
      }
    }
  },
  mounted() {
    this.$root.$on('searchMove', (dir) => {
      this.cursor += ((dir === 'up') ? -1 : 1)
      if (this.cursor < -1) {
        this.cursor = -1
      } else if (this.cursor > this.results.length + this.suggestions.length - 1) {
        this.cursor = this.results.length + this.suggestions.length - 1
      }
      this.$nextTick(() => this.scrollResultIntoView())
    })
    this.$root.$on('searchEnter', () => {
      if (!this.results) {
        return
      }

      if (this.cursor >= 0 && this.cursor < this.results.length) {
        this.goToPage(_.nth(this.results, this.cursor))
      } else if (this.cursor >= 0) {
        this.setSearchTerm(_.nth(this.suggestions, this.cursor - this.results.length))
      }
    })
  },
  methods: {
    scrollResultIntoView() {
      const list = this.$refs.resultsList
      const rows = this.$refs.resultRows
      const row = rows && rows[this.cursor]
      if (!list || !row) {
        return
      }
      const listBounds = list.getBoundingClientRect()
      const rowBounds = row.getBoundingClientRect()
      if (rowBounds.top < listBounds.top) {
        list.scrollTop -= listBounds.top - rowBounds.top
      } else if (rowBounds.bottom > listBounds.bottom) {
        list.scrollTop += rowBounds.bottom - listBounds.bottom
      }
    },
    resetScopeResults() {
      this.response = { results: [], suggestions: [], totalHits: 0 }
      this.pagination = 1
      this.cursor = 0
      this.searchFailed = false
      this.searchIsLoading = Boolean(this.search && this.search.length >= 2 && !this.folderScopeUnavailable)
    },
    closeSearch() {
      this.search = ''
      this.searchIsFocused = false
    },
    getLineNumber(item) {
      if (!item || !item.id) {
        return ''
      }
      const parts = String(item.id).split(':')
      const candidate = parts.length > 1 ? parts[parts.length - 1] : ''
      return /^\d+$/.test(candidate) ? candidate : ''
    },
    getItemTooltip(item) {
      return this.getResultPath(item)
    },
    getResultPath(item) {
      if (!item) {
        return ''
      }
      const path = String(item.path || '').replace(/^\/+/, '')
      return path ? `/${path}` : String(item.title || '')
    },
    getSearchTerms(rawQuery) {
      const trimmed = _.trim(String(rawQuery || ''))
      if (!trimmed) {
        return []
      }
      return _.uniq(trimmed.split(/\s+/).filter(Boolean)).sort((a, b) => b.length - a.length)
    },
    clipLineAroundMatch(rawText, terms) {
      const text = String(rawText || '').replace(/\s+/g, ' ').trim()
      if (!text || text.length <= 110 || !terms.length) {
        return text
      }
      const lowerText = text.toLowerCase()
      let firstMatchIdx = -1
      terms.forEach(term => {
        const idx = lowerText.indexOf(term.toLowerCase())
        if (idx !== -1 && (firstMatchIdx === -1 || idx < firstMatchIdx)) {
          firstMatchIdx = idx
        }
      })
      if (firstMatchIdx <= 50) {
        return text
      }
      const start = Math.max(0, firstMatchIdx - 28)
      return `...${text.slice(start)}`
    },
    getHighlightedSegments(rawText, rawQuery) {
      const terms = this.getSearchTerms(rawQuery)
      const text = this.clipLineAroundMatch(rawText, terms)
      if (!text) {
        return []
      }
      if (!terms.length) {
        return [{ text, match: false }]
      }
      const pattern = terms.map(t => _.escapeRegExp(t)).join('|')
      if (!pattern) {
        return [{ text, match: false }]
      }
      const regex = new RegExp(`(${pattern})`, 'gi')
      const parts = text.split(regex)
      const lowerTerms = terms.map(t => t.toLowerCase())
      const segments = []
      parts.forEach(part => {
        if (!part) {
          return
        }
        const isMatch = lowerTerms.includes(part.toLowerCase())
        segments.push({
          text: part,
          match: isMatch
        })
      })
      return segments.length ? segments : [{ text, match: false }]
    },
    setSearchTerm(term) {
      this.search = term
    },
    goToPage(item) {
      const url = this.getResultUrl(item)
      this.search = ''
      this.searchIsFocused = false
      const sameUrl = new URL(url, window.location.href).href === window.location.href
      window.location.assign(url)
      if (sameUrl) {
        window.dispatchEvent(new Event('hashchange'))
      }
    },
    goToPageInNewTab(item) {
      window.open(this.getResultUrl(item), '_blank', 'noopener')
    },
    getResultUrl(item) {
      const base = `/${item.locale}/${item.path}`
      const line = this.getLineNumber(item)
      const previousMatches = line ? this.response.results.filter(result =>
        result.locale === item.locale && result.path === item.path &&
        result.description === item.description && Number(this.getLineNumber(result)) < Number(line)
      ).length : 0
      const params = new URLSearchParams()
      if (line) {
        params.set('line', line)
      }
      params.set('text', item.description || '')
      params.set('query', this.search)
      params.set('occurrence', String(previousMatches))
      return `${base}#search-${params.toString()}`
    }
  },
  apollo: {
    response: {
      query: searchPagesQuery,
      variables() {
        const scope = this.searchScope === 'folder' ? 'folder' : (this.pagePath ? this.searchScope : 'global')
        return {
          query: this.search,
          scope,
          locale: scope === 'global' ? null : this.pageLocale,
          path: scope === 'page' ? this.pagePath : (scope === 'folder' ? this.searchFolderPath : null)
        }
      },
      fetchPolicy: 'network-only',
      debounce: 300,
      throttle: 1000,
      skip() {
        return !this.search || this.search.length < 2 || this.folderScopeUnavailable
      },
      result() {
        this.pagination = 1
        this.searchFailed = false
      },
      error() {
        this.response = { results: [], suggestions: [], totalHits: 0 }
        this.searchFailed = true
        this.searchIsLoading = false
      },
      update: (data) => _.get(data, 'pages.search', {}),
      watchLoading (isLoading) {
        this.searchIsLoading = isLoading
      }
    }
  }
}
</script>

<style lang="scss">
.search-results {
  position: fixed;
  top: 64px;
  left: 0;
  overflow-y: auto;
  width: 100%;
  height: calc(100% - 64px);
  background-color: rgba(0,0,0,.9);
  z-index: 100;
  text-align: center;
  animation: searchResultsReveal .6s ease;

  @media #{map-get($display-breakpoints, 'sm-and-down')} {
    top: 112px;
  }

  &-container {
    margin: 12px auto;
    width: 90vw;
    max-width: 1024px;
  }

  &-help,
  &-none {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    padding: 12px 16px;
    color: #c5c9cf;
    font-size: 14px;
    line-height: 20px;
    text-align: left;

    .v-icon {
      color: inherit;
    }
  }

  &-loader {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    padding: 32px 0;
    color: #FFF;
  }

  &-items {
    max-height: 570px;
    max-height: min(570px, calc(100vh - 208px));
    background-color: #1e1f22;
    border: 1px solid #393b40;
    padding: 4px 0;
    text-align: left;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, .32) transparent;

    &::-webkit-scrollbar {
      width: 8px;
      background: transparent;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, .32);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, .5);
    }

    &::-webkit-scrollbar-button {
      display: none;
    }

    @media #{map-get($display-breakpoints, 'sm-and-down')} {
      max-height: min(570px, calc(100vh - 256px));
    }
  }

  .search-result-line {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    min-height: 48px;
    padding: 3px 14px;
    cursor: pointer;
    user-select: none;
    font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, 'Microsoft YaHei', sans-serif;
    transition: background-color .1s ease;

    &:not(:first-child) {
      border-top: 1px solid rgba(255, 255, 255, .16);
    }

    &:hover {
      background-color: #2b2d30;
    }

    &.highlighted {
      background-color: #2e436e;
    }

    &__code {
      min-width: 0;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #dcdfe4;
      font-size: 13.5px;
      line-height: 22px;
    }

    &__doc {
      display: block;
      width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      color: #89929f;
      font-size: 11.5px;
      line-height: 18px;
    }

    &:hover .search-result-line__doc,
    &.highlighted .search-result-line__doc {
      color: #aeb8c9;
    }
  }

  .search-highlight {
    background-color: rgba(214, 157, 56, 0.42);
    border: 1px solid #d69d38;
    border-radius: 3px;
    color: #fff8e7;
    padding: 0 2px;
    font-weight: 500;
  }

  &-suggestions {
    .highlighted {
      background: transparent linear-gradient(to bottom, mc('blue', '500'), mc('blue', '700'));
    }
  }
}

@keyframes searchResultsReveal {
  0% {
    background-color: rgba(0,0,0,0);
    padding-top: 32px;
  }
  100% {
    background-color: rgba(0,0,0,.9);
    padding-top: 0;
  }
}
</style>
