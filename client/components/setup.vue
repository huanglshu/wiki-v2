<template lang="pug">
  v-app.setup
    v-content
      v-container
        v-layout
          v-flex(xs12, lg6, offset-lg3)
            v-card.elevation-20.radius-7.animated.fadeInUp
              v-alert(v-if='isDevMode', tile, dark, color='red darken-3', icon='mdi-alert', prominent)
                .body-2 {{ $t('setup:devWarning') }}
                .body-2.mt-3 {{ $t('setup:devInstallWarning') }}
                .body-2
                  span {{ $t('setup:devDocsPrefix') }}
                  a(href='https://docs.requarks.io/install', style='color: #FFF;') {{ $t('setup:devDocsLink') }}
              .text-center
                img.setup-logo.animated.fadeInUp.wait-p2s(src='/_assets/svg/logo-wikijs-full.svg', alt='Wiki.js Logo')
              v-alert(v-model='error', type='error', icon='mdi-alert', tile, dismissible) {{ errorMessage }}
              v-alert(v-if='!error', tile, color='blue lighten-5', :value='true')
                v-icon.mr-3(color='blue') mdi-package-variant
                span.blue--text {{ $t('setup:installVersion', { version: wikiVersion }) }}
              v-card-text
                .overline.pl-3 {{ $t('setup:administratorAccount') }}
                v-container.pa-3.mt-3(grid-list-xl)
                  v-layout(row, wrap)
                    v-flex(xs12)
                      v-text-field(
                        outlined
                        v-model='conf.adminEmail',
                        :label='$t("setup:administratorEmail")',
                        :hint='$t("setup:administratorEmailHint")',
                        persistent-hint
                        required
                        ref='adminEmailInput'
                      )
                    v-flex(xs6)
                      v-text-field(
                        outlined
                        ref='adminPassword',
                        counter='255'
                        v-model='conf.adminPassword',
                        :label='$t("setup:password")',
                        :append-icon="pwdMode ? 'mdi-eye-off' : 'mdi-eye'"
                        @click:append="() => (pwdMode = !pwdMode)"
                        :type="pwdMode ? 'password' : 'text'"
                        :hint='$t("setup:passwordHint")',
                        persistent-hint
                      )
                    v-flex(xs6)
                      v-text-field(
                        outlined
                        ref='adminPasswordConfirm',
                        counter='255'
                        v-model='conf.adminPasswordConfirm',
                        :label='$t("setup:confirmPassword")',
                        :append-icon="pwdConfirmMode ? 'mdi-eye-off' : 'mdi-eye'"
                        @click:append="() => (pwdConfirmMode = !pwdConfirmMode)"
                        :type="pwdConfirmMode ? 'password' : 'text'"
                        :hint='$t("setup:confirmPasswordHint")',
                        persistent-hint
                      )
                v-divider.mb-4
                .overline.pl-3.mb-5 {{ $t('setup:siteUrl') }}
                v-text-field.mb-4.mx-3(
                  outlined
                  ref='adminSiteUrl',
                  v-model='conf.siteUrl',
                  :label='$t("setup:siteUrl")',
                  :hint='$t("setup:siteUrlHint")',
                  persistent-hint
                  @keyup.enter='install'
                )
                v-divider.mb-4
                .overline.pl-3.mb-3 {{ $t('setup:telemetry') }}
                v-switch.ml-3(
                  inset
                  color='primary',
                  v-model='conf.telemetry',
                  :label='$t("setup:allowTelemetry")',
                  persistent-hint,
                  :hint='$t("setup:telemetryHint")'
                )
                a.pl-3(style='font-size: 12px; letter-spacing: initial;', href='https://docs.requarks.io/telemetry', target='_blank') {{ $t('setup:learnMore') }}
              v-divider.mt-2
              v-card-actions
                v-btn(color='primary', @click='install', :disabled='loading', x-large, depressed, block)
                  v-icon(left) mdi-check
                  span {{ $t('setup:install') }}

    v-dialog(v-model='loading', width='450', persistent)
      v-card(color='primary', dark).radius-7
        v-card-text.text-center.py-5
          .py-3(style='width: 64px; display:inline-block;')
            breeding-rhombus-spinner(
              :animation-duration='2000'
              :size='64'
              color='#FFF'
              )
          template(v-if='!success')
            .subtitle-1.white--text {{ $t('setup:finalizing') }}
            .caption {{ $t('setup:pleaseWait') }}
          template(v-else)
            .subtitle-1.white--text {{ $t('setup:installationComplete') }}
            .caption {{ $t('setup:redirecting') }}
</template>

<script>
import _ from 'lodash'
import validate from 'validate.js'
import { BreedingRhombusSpinner } from 'epic-spinners'
import confetti from 'canvas-confetti'
import english from '../../data/sideload/en.json'

const setupErrorKeys = new Map(
  Object.entries(english)
    .filter(([key]) => key.startsWith('setup:error.'))
    .map(([key, message]) => [message, key])
)

/* global siteConfig */

export default {
  components: {
    BreedingRhombusSpinner
  },
  props: {
    wikiVersion: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      success: false,
      error: false,
      errorMessage: '',
      conf: {
        adminEmail: '',
        adminPassword: '',
        adminPasswordConfirm: '',
        siteUrl: 'https://wiki.yourdomain.com',
        telemetry: true
      },
      pwdMode: true,
      pwdConfirmMode: true,
      isDevMode: false
    }
  },
  mounted() {
    _.delay(() => {
      this.$refs.adminEmailInput.focus()
    }, 500)
    this.isDevMode = siteConfig.devMode === true
  },
  methods: {
    localizeError (message) {
      const key = setupErrorKeys.get(message)
      return key ? this.$t(key, { defaultValue: message }) : message
    },
    async install () {
      this.error = false

      const validationResults = validate(this.conf, {
        adminEmail: {
          presence: {
            allowEmpty: false,
            message: this.$t('setup:emailRequired')
          },
          email: { message: this.$t('setup:emailInvalid') }
        },
        adminPassword: {
          presence: {
            allowEmpty: false,
            message: this.$t('setup:passwordRequired')
          },
          length: {
            minimum: 6,
            maximum: 255,
            tooShort: this.$t('setup:passwordTooShort'),
            tooLong: this.$t('setup:passwordTooLong')
          }
        },
        adminPasswordConfirm: {
          equality: { attribute: 'adminPassword', message: this.$t('setup:passwordMismatch') }
        },
        siteUrl: {
          presence: {
            allowEmpty: false,
            message: this.$t('setup:siteUrlRequired')
          },
          url: {
            schemes: ['http', 'https'],
            allowLocal: true,
            allowDataUrl: false,
            message: this.$t('setup:siteUrlInvalid')
          },
          format: {
            pattern: '^(?!.*/$).*$',
            flags: 'i',
            message: this.$t('setup:siteUrlTrailingSlash')
          }
        }
      }, {
        format: 'flat',
        fullMessages: false
      })
      if (validationResults) {
        this.error = true
        this.errorMessage = validationResults[0]
        this.$forceUpdate()
        return
      }

      this.loading = true
      this.success = false
      this.$forceUpdate()

      _.delay(async () => {
        try {
          const resp = await fetch('/finalize', {
            method: 'POST',
            cache: 'no-cache',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.conf)
          }).then(res => res.json())

          if (resp.ok === true) {
            _.delay(() => {
              confetti({
                particleCount: 100,
                spread: 70,
                zIndex: 100000
              })
              this.success = true
              _.delay(() => {
                window.location.assign('/login')
              }, 3000)
            }, 10000)
          } else {
            this.error = true
            this.errorMessage = this.localizeError(resp.error)
            this.loading = false
          }
        } catch (err) {
          window.alert(this.localizeError(err.message))
        }
      }, 1000)
    }
  }
}

</script>

<style lang='scss'>
.setup {
  .v-application--wrap {
    padding-top: 10vh;
    background-color: #111;
    background-image: linear-gradient(45deg, mc('blue', '100'), mc('blue', '700'), mc('indigo', '900'));
    background-blend-mode: exclusion;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100vh;
      z-index: 0;
      background-color: transparent;
      background-image: url(../static/svg/motif-grid.svg) !important;
      background-size: 100px;
      background-repeat: repeat;
      animation: bg-anim 100s linear infinite;
    }
  }

  @keyframes bg-anim {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 100% 100%;
    }
  }

  &-logo {
    width: 400px;
    margin: 2rem 0 2rem 0;
  }
}
</style>
