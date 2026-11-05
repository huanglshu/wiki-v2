<template lang='pug'>
  v-dialog(v-model='isShown', persistent, max-width='700', no-click-animation, :overlay-opacity='$vuetify.theme.dark ? undefined : 0')
    v-card.radius-7(color='blue darken-3', dark)
      v-btn.editor-select-exit(icon, dark, @click='exitToHome', :aria-label='$t("common:actions.exit")')
        v-icon mdi-close
      v-card-text.text-center.py-4
        .subtitle-1.white--text {{$t('editor:select.title')}}
        v-container(grid-list-lg, fluid)
          v-layout(row, wrap, justify-center)
            v-flex(xs6)
              v-card.radius-7.animated.fadeInUp.wait-p1s(
                hover
                light
                ripple
                )
                v-card-text.text-center(@click='selectEditor("markdown")')
                  img(src='/_assets/svg/editor-icon-markdown.svg', :alt='$t("editor:editors.markdown.title")', style='width: 36px;')
                  .body-2.primary--text.mt-2 {{ $t('editor:editors.markdown.title') }}
                  .caption.grey--text {{ $t('editor:editors.markdown.description') }}
            v-flex(xs6)
              v-card.radius-7.animated.fadeInUp.wait-p2s(
                hover
                light
                ripple
                )
                v-card-text.text-center(@click='selectEditor("ckeditor")')
                  img(src='/_assets/svg/editor-icon-ckeditor.svg', :alt='$t("editor:editors.ckeditor.title")', style='width: 36px;')
                  .body-2.mt-2.primary--text {{ $t('editor:editors.ckeditor.title') }}
                  .caption.grey--text {{ $t('editor:editors.ckeditor.description') }}
            v-flex(xs4)
              v-card.radius-7.animated.fadeInUp.wait-p3s(
                hover
                light
                ripple
                )
                v-card-text.text-center(@click='selectEditor("asciidoc")')
                  img(src='/_assets/svg/editor-icon-asciidoc.svg', :alt='$t("editor:editors.asciidoc.title")', style='width: 36px;')
                  .body-2.primary--text.mt-2 {{ $t('editor:editors.asciidoc.title') }}
                  .caption.grey--text {{ $t('editor:editors.asciidoc.description') }}
            v-flex(xs4)
              v-card.radius-7.animated.fadeInUp.wait-p4s(
                hover
                light
                ripple
                )
                v-card-text.text-center(@click='selectEditor("code")')
                  img(src='/_assets/svg/editor-icon-code.svg', :alt='$t("editor:editors.code.title")', style='width: 36px;')
                  .body-2.primary--text.mt-2 {{ $t('editor:editors.code.title') }}
                  .caption.grey--text {{ $t('editor:editors.code.description') }}
            v-flex(xs4)
              v-card.radius-7.animated.fadeInUp.wait-p5s(
                hover
                light
                ripple
                )
                v-card-text.text-center(@click='fromTemplate')
                  img(src='/_assets/svg/icon-cube.svg', :alt='$t("editor:editors.template.title")', style='width: 42px; opacity: .5;')
                  .body-2.mt-1.teal--text {{ $t('editor:editors.template.title') }}
                  .caption.grey--text {{ $t('editor:editors.template.description') }}

    page-selector(mode='select', v-model='templateDialogIsShown', :open-handler='fromTemplateHandle', :path='path', :locale='locale', must-exist)
</template>

<script>
import _ from 'lodash'
import { sync, get } from 'vuex-pathify'

export default {
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      templateDialogIsShown: false
    }
  },
  computed: {
    isShown: {
      get() { return this.value },
      set(val) { this.$emit('input', val) }
    },
    currentEditor: sync('editor/editor'),
    locale: get('page/locale'),
    path: get('page/path')
  },
  methods: {
    selectEditor (name) {
      this.currentEditor = `editor${_.startCase(name)}`
      this.isShown = false
    },
    exitToHome () {
      this.isShown = false
      window.location.replace('/')
    },
    fromTemplate () {
      this.templateDialogIsShown = true
    },
    fromTemplateHandle ({ id }) {
      this.templateDialogIsShown = false
      this.isShown = false
      this.$nextTick(() => {
        window.location.assign(`/e/${this.locale}/${this.path}?from=${id}`)
      })
    }
  }
}
</script>

<style lang='scss'>
.editor-select-exit {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 1;
}
</style>
