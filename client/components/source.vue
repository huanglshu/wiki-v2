<template lang='pug'>
  v-app(:dark='$vuetify.theme.dark').source
    nav-header(site-header)
    v-content
      v-toolbar.source-toolbar(color='white', light)
        i18next.subheading.source-title.text-truncate(v-if='versionId > 0', path='common:page.viewingSourceVersion', tag='div')
          strong(place='date', :title='$options.filters.moment(versionDate, `LLL`)') {{versionDate | moment('lll')}}
          strong(place='path') /{{path}}
        i18next.subheading.source-title.text-truncate(v-else, path='common:page.viewingSource', tag='div')
          strong(place='path') /{{path}}
        template(v-if='$vuetify.breakpoint.mdAndUp')
          v-spacer
          .caption.source-meta {{$t('common:page.id', { id: pageId })}}
          .caption.source-meta.ml-4(v-if='versionId > 0') {{$t('common:page.versionId', { id: versionId })}}
          v-btn.ml-4.source-action(v-if='versionId > 0', outlined, color='blue darken-1', @click='goHistory')
            v-icon mdi-history
          v-btn.ml-4.source-action(outlined, color='blue darken-1', @click='goLive') {{$t('common:page.returnNormalView')}}
      v-card.source-card(tile)
        v-card-text.source-content
          .source-code-shell
            .source-code-heading
              span.source-code-language {{ sourceLanguageLabel }}
              .source-code-tools
                span.source-code-lines {{ sourceLineLabel }}
                v-btn.source-copy(
                  icon
                  small
                  :aria-label='$t("common:code.copy", { defaultValue: "Copy code" })'
                  :title='$t("common:code.copy", { defaultValue: "Copy code" })'
                  v-clipboard='sourceCode'
                  @success='onSourceCopied'
                  @error='onSourceCopyError'
                  )
                  v-icon(small) mdi-content-copy
            .source-code-scroll(tabindex='0')
              pre.source-code-block.line-numbers.no-whitespace-normalization(data-toolbar-order='')
                slot

    nav-footer
    notify
    search-results
</template>

<script>
import Prism from 'prismjs'

import 'prismjs/components/prism-markdown'

export default {
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
    versionId: {
      type: Number,
      default: 0
    },
    versionDate: {
      type: String,
      default: ''
    },
    contentType: {
      type: String,
      default: ''
    },
    effectivePermissions: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      sourceLineCount: 0,
      sourceCode: ''
    }
  },
  mounted () {
    const pre = this.$el.querySelector('.source-code-block')
    const code = pre ? pre.querySelector('code') : null
    this.sourceCode = code ? code.textContent : ''
    const source = this.sourceCode.replace(/\r\n/g, '\n')

    this.sourceLineCount = source ? source.replace(/\n$/, '').split('\n').length : 0
    if (code) {
      code.classList.add('language-markdown')
    }
    this.$nextTick(() => {
      Prism.highlightAllUnder(pre)
    })
  },
  computed: {
    sourceLanguageLabel () {
      return this.contentType || this.$t('common:page.sourceLanguage', { defaultValue: 'Source' })
    },
    sourceLineLabel () {
      return this.$t('common:page.sourceLines', {
        count: this.sourceLineCount,
        defaultValue: '{{count}} lines'
      })
    }
  },
  created () {
    this.$store.commit('page/SET_ID', this.id)
    this.$store.commit('page/SET_LOCALE', this.locale)
    this.$store.commit('page/SET_PATH', this.path)

    this.$store.commit('page/SET_MODE', 'source')

    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
  },
  methods: {
    onSourceCopied (event) {
      if (event && event.clearSelection) {
        event.clearSelection()
      }
      this.$store.commit('showNotification', {
        style: 'success',
        message: this.$t('common:code.copied', { defaultValue: 'Copied' }),
        icon: 'check'
      })
    },
    onSourceCopyError () {
      this.$store.commit('showNotification', {
        style: 'red',
        message: this.$t('common:code.copyFailed', { defaultValue: 'Copy failed. Press Ctrl+C to copy.' }),
        icon: 'alert'
      })
    },
    goLive() {
      window.location.assign(`/${this.locale}/${this.path}`)
    },
    goHistory () {
      window.location.assign(`/h/${this.locale}/${this.path}`)
    }
  }
}
</script>

<style lang='scss'>

.source {
  color: #1f2937;
  background-color: #f5f7fa;

  > .v-application--wrap {
    height: 100vh;
    height: 100dvh;
    min-height: 0;
  }

  .v-main {
    flex: 1 1 0%;
    min-height: 0;
  }

  .v-main__wrap {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .source-toolbar {
    flex: 0 0 auto;
  }

  .source-card {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }

  @at-root .theme--dark & {
    color: #e5e7eb;
    background-color: #111827;
  }

  .source-toolbar {
    background-color: #fff !important;
    color: rgba(0, 0, 0, .87) !important;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .16);

    .source-title strong {
      color: #1976d2;
    }

    .source-meta {
      display: inline-block;
      padding: 0 6px;
      border: 1px solid #90caf9;
      border-radius: 3px;
      background-color: #fff;
      color: #1976d2 !important;
      line-height: 18px;
    }

    .source-action {
      background-color: #fff !important;
      border-color: #1976d2 !important;
      color: #1976d2 !important;

      .v-btn__content {
        color: #1976d2 !important;
      }
    }
  }

  .source-title {
    min-width: 0;
  }

  .source-content {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    padding: 24px;
    text-shadow: none;

    @media (max-width: 599px) {
      padding: 12px;
    }
  }

  .source-code-shell {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    text-rendering: optimizeLegibility;
    overflow: hidden;
    border: 1px solid #dce3eb;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, .04);

    @at-root .theme--dark & {
      border-color: #374151;
      background-color: #1f2937;
      box-shadow: 0 1px 2px rgba(0, 0, 0, .24);
    }
  }

  .source-code-heading {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;
    padding: 8px 14px;
    border-bottom: 1px solid #e5eaf0;
    background-color: #f8fafc;
    color: #64748b;
    font-size: 12px;
    letter-spacing: 0;
    line-height: 20px;
    text-shadow: none;

    @at-root .theme--dark & {
      border-bottom-color: #374151;
      background-color: #263244;
      color: #94a3b8;
    }
  }

  .source-code-language {
    color: #1976d2;
    font-weight: 500;
    text-transform: uppercase;

    @at-root .theme--dark & {
      color: #90caf9;
    }
  }

  .source-code-tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .source-copy {
    color: inherit !important;
  }

  .source-code-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }

  .source-code-block {
    min-width: max-content;
    margin: 0 !important;
    padding: 16px 16px 16px 3.5rem;
    border: 0 !important;
    border-radius: 0 !important;
    background-color: #fff !important;
    box-shadow: none !important;
    color: #1f2937;
    tab-size: 2;
    text-shadow: none;

    @at-root .theme--dark & {
      background-color: #1f2937 !important;
      color: #e5e7eb;
    }

    > code {
      display: block;
      padding: 0;
      background-color: transparent !important;
      box-shadow: none !important;
      color: inherit !important;
      font-family: 'Roboto Mono', monospace;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.65;
      overflow-wrap: normal;
      white-space: pre;
      text-shadow: none;

      &::before {
        display: none;
      }
    }

    .line-numbers-rows {
      top: 16px;
      border-right-color: #e2e8f0;
      color: #94a3b8;
      text-shadow: none;

      > span:before {
        color: #94a3b8;
        text-shadow: none;
      }
    }

    .token.title,
    .token.title .token.punctuation,
    .token.title .token.important {
      color: #0f4c81;
      font-weight: 600;
    }

    .token.bold {
      color: #334155;
      font-weight: 600;
    }

    .token.italic {
      color: #475569;
      font-style: italic;
    }

    .token.url,
    .token.link,
    .token.attr-value {
      color: #1976d2;
    }

    .token.code {
      padding: 1px 4px;
      border-radius: 4px;
      background-color: #eef2f7;
      color: #0f4c81;
      font-weight: 500;
    }

    .token.blockquote {
      color: #64748b;
    }

    .token.table-header {
      color: #334155;
      font-weight: 600;
    }

    .token.hr {
      color: #94a3b8;
    }

    @at-root .theme--dark & {
      .token.title,
      .token.title .token.punctuation,
      .token.title .token.important {
        color: #90caf9;
      }

      .token.bold,
      .token.table-header {
        color: #e2e8f0;
      }

      .token.italic {
        color: #cbd5e1;
      }

      .token.url,
      .token.link,
      .token.attr-value {
        color: #7ab7f2;
      }

      .token.code {
        background-color: #334155;
        color: #e2e8f0;
      }

      .line-numbers-rows {
        border-right-color: #4b5563;
      }
    }
  }
}

</style>
