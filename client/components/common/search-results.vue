<template lang="pug">
  .search-results(v-if='searchIsFocused || (search && search.length > 1)')
    .search-results-container
      .search-results-help(v-if='!search || (search && search.length < 2)')
        img(src='/_assets/svg/icon-search-alt.svg')
        .mt-4 {{$t('common:header.searchHint')}}
      .search-results-loader(v-else-if='searchIsLoading && (!results || results.length < 1)')
        orbit-spinner(
          :animation-duration='1000'
          :size='100'
          color='#FFF'
        )
        .headline.mt-5 {{$t('common:header.searchLoading')}}
      .search-results-none(v-else-if='!searchIsLoading && (!results || results.length < 1)')
        img(src='/_assets/svg/icon-no-results.svg', alt='No Results')
        .subheading {{$t('common:header.searchNoResult')}}
      template(v-if='search && search.length >= 2 && results && results.length > 0')
        v-subheader.white--text {{$t('common:header.searchResultsCount', { total: response.totalHits })}}
        .search-results-items.radius-7(role='listbox')
          .search-result-line(
            v-for='(item, idx) of results'
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
            .search-result-line__meta
              span.search-result-line__doc(v-text='item.title || item.path')
              span.search-result-line__lineno(v-if='getLineNumber(item)', v-text='getLineNumber(item)')
        v-pagination.mt-3(
          v-if='paginationLength > 1'
          dark
          v-model='pagination'
          :length='paginationLength'
          circle
        )
      template(v-if='suggestions && suggestions.length > 0')
        v-subheader.white--text.mt-3 {{$t('common:header.searchDidYouMean')}}
        v-list.search-results-suggestions.radius-7(dense, dark)
          template(v-for='(term, idx) of suggestions')
            v-list-item(:key='term', @click='setSearchTerm(term)', :class='idx + results.length === cursor ? `highlighted` : ``')
              v-list-item-avatar
                v-icon mdi-magnify
              v-list-item-content
                v-list-item-title(v-text='term')
            v-divider(v-if='idx < suggestions.length - 1')
      .text-xs-center.pt-5(v-if='search && search.length > 1')
        //- v-btn.mx-2(outlined, color='orange', @click='search = ``', v-if='results.length > 0')
        //-   v-icon(left) mdi-content-save
        //-   span {{$t('common:header.searchCopyLink')}}
        v-btn.mx-2(outlined, color='pink', @click='search = ``')
          v-icon(left) mdi-close
          span {{$t('common:header.searchClose')}}
</template>

<script>
import _ from 'lodash'
import { sync } from 'vuex-pathify'
import { OrbitSpinner } from 'epic-spinners'

import searchPagesQuery from 'gql/common/common-pages-query-search.gql'

export default {
  components: {
    OrbitSpinner
  },
  data() {
    return {
      cursor: 0,
      pagination: 1,
      perPage: 20,
      response: {
        results: [],
        suggestions: [],
        totalHits: 0
      }
    }
  },
  computed: {
    search: sync('site/search'),
    searchIsFocused: sync('site/searchIsFocused'),
    searchIsLoading: sync('site/searchIsLoading'),
    searchRestrictLocale: sync('site/searchRestrictLocale'),
    searchRestrictPath: sync('site/searchRestrictPath'),
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
      if (!newValue || (newValue && newValue.length < 2)) {
        this.searchIsLoading = false
      } else {
        this.searchIsLoading = true
      }
    },
    results() {
      this.cursor = 0
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
    getLineNumber(item) {
      if (!item || !item.id) {
        return ''
      }
      const parts = String(item.id).split(':')
      const candidate = parts.length > 1 ? parts[parts.length - 1] : ''
      return /^\d+$/.test(candidate) ? candidate : ''
    },
    getItemTooltip(item) {
      if (!item) {
        return ''
      }
      const lineNo = this.getLineNumber(item)
      return lineNo ? `${item.path}:${lineNo}` : String(item.path || item.title || '')
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
      window.location.assign(`/${item.locale}/${item.path}`)
    },
    goToPageInNewTab(item) {
      window.open(`/${item.locale}/${item.path}`, '_blank')
    }
  },
  apollo: {
    response: {
      query: searchPagesQuery,
      variables() {
        return {
          query: this.search
        }
      },
      fetchPolicy: 'network-only',
      debounce: 300,
      throttle: 1000,
      skip() {
        return !this.search || this.search.length < 2
      },
      result() {
        this.pagination = 1
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

  &-help {
    text-align: center;
    padding: 32px 0;
    font-size: 18px;
    font-weight: 300;
    color: #FFF;

    img {
      width: 104px;
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

  &-none {
    color: #FFF;

    img {
      width: 200px;
    }
  }

  &-items {
    background-color: #1e1f22;
    border: 1px solid #393b40;
    padding: 4px 0;
    text-align: left;
    overflow: hidden;
  }

  .search-result-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 28px;
    padding: 3px 14px;
    cursor: pointer;
    user-select: none;
    font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, 'Microsoft YaHei', sans-serif;
    transition: background-color .1s ease;

    &:hover {
      background-color: #2b2d30;
    }

    &.highlighted {
      background-color: #2e436e;
    }

    &__code {
      flex: 1 1 auto;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #dcdfe4;
      font-size: 13.5px;
      line-height: 22px;
    }

    &__meta {
      flex: 0 0 auto;
      max-width: 36%;
      margin-left: 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: right;
      color: #6f737a;
      font-size: 12.5px;
      line-height: 22px;
    }

    &:hover .search-result-line__meta,
    &.highlighted .search-result-line__meta {
      color: #cfd6e6;
    }

    &__lineno {
      margin-left: 5px;
      font-variant-numeric: tabular-nums;
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
