<template lang="pug">
  v-app
    .login(:style='bgUrl ? { backgroundImage: `url("${bgUrl}")` } : {}')
      .login-shell
        .login-brand
          .login-brand-grid
          .login-brand-top
            .login-brand-logo: v-icon(color='white', size='26') mdi-file-document-outline
            div
              .login-brand-name {{ siteTitle }}
              .login-brand-sub AOFEI DOCS
          .login-brand-center
            h1 {{ $t('auth:design.brandTitleFirst', { defaultValue: 'Give every document' }) }}
              br
              | {{ $t('auth:design.brandTitleSecond', { defaultValue: 'the care it deserves' }) }}
            p {{ $t('auth:design.brandDescriptionFirst', { defaultValue: 'Centralized storage, access control, and efficient collaboration.' }) }}
              br
              | {{ $t('auth:design.brandDescriptionSecond', { defaultValue: 'A secure, reliable document workspace for your team.' }) }}
            .login-features
              .login-feature
                span: v-icon(color='white', size='17') mdi-shield-outline
                | {{ $t('auth:design.featureSecurity', { defaultValue: 'Enterprise data security and access control' }) }}
              .login-feature
                span: v-icon(color='white', size='17') mdi-account-group-outline
                | {{ $t('auth:design.featureCollaboration', { defaultValue: 'Team collaboration and version tracking' }) }}
              .login-feature
                span: v-icon(color='white', size='17') mdi-magnify
                | {{ $t('auth:design.featureSearch', { defaultValue: 'Find documents quickly with global search' }) }}
          .login-brand-bottom {{ $t('auth:design.brandFooter', { year: copyrightYear, defaultValue: 'Internal system' }) }}
        .login-sd
          .login-heading
            h2 {{ $t('auth:design.welcome', { defaultValue: 'Welcome' }) }}
            p {{ $t('auth:design.subtitle', { defaultValue: 'Choose an authentication method and enter your credentials.' }) }}
          v-alert.mb-0(
            v-model='errorShown'
            transition='slide-y-reverse-transition'
            color='red darken-2'
            tile
            dark
            dense
            icon='mdi-alert'
            )
            .body-2 {{errorMessage}}
          //-------------------------------------------------
          //- PROVIDERS LIST
          //-------------------------------------------------
          .login-tabs(v-if='screen === `login` && filteredStrategies.length > 1', role='group', :aria-label='$t("auth:selectAuthProvider")')
            button.login-tab(
              v-for='stg in filteredStrategies'
              :key='stg.key'
              type='button'
              :class='{ active: selectedStrategyKey === stg.key }'
              :aria-pressed='selectedStrategyKey === stg.key'
              @click='selectedStrategyKey = stg.key'
              )
              v-icon(size='18') {{ stg.strategy.useForm ? 'mdi-monitor' : 'mdi-link-variant' }}
              span {{ stg.strategy.key === 'local' ? $t('auth:design.localLogin', { defaultValue: 'Local login' }) : stg.displayName }}
          //-------------------------------------------------
          //- LOGIN FORM
          //-------------------------------------------------
          template(v-if='screen === `login` && selectedStrategy.strategy.useForm')
            .login-form
              label.login-field-label(for='login-username') {{ isUsernameEmail ? $t('auth:fields.email') : $t('auth:design.username', { defaultValue: 'Username' }) }}
              v-text-field(
                id='login-username'
                outlined
                prepend-inner-icon='mdi-account-outline'
                background-color='white'
                color='blue darken-2'
                hide-details
                ref='iptEmail'
                v-model='username'
                :placeholder='isUsernameEmail ? $t(`auth:design.emailPlaceholder`, { defaultValue: `Enter your email address` }) : $t(`auth:design.usernamePlaceholder`, { defaultValue: `Enter your username` })'
                :type='isUsernameEmail ? `email` : `text`'
                :autocomplete='isUsernameEmail ? `email` : `username`'
                @keyup.enter='login'
                light
                )
              label.login-field-label(for='login-password') {{ $t('auth:fields.password') }}
              v-text-field(
                id='login-password'
                outlined
                prepend-inner-icon='mdi-lock-outline'
                background-color='white'
                color='blue darken-2'
                hide-details
                ref='iptPassword'
                v-model='password'
                :append-icon='hidePassword ? "mdi-eye-off" : "mdi-eye"'
                @click:append='() => (hidePassword = !hidePassword)'
                :type='hidePassword ? "password" : "text"'
                :placeholder='$t("auth:design.passwordPlaceholder", { defaultValue: "Enter your password" })'
                autocomplete='current-password'
                @keyup.enter='login'
                light
              )
              .login-options
                a(href='#forgot', @click.stop.prevent='forgotPassword') {{ $t('auth:forgotPasswordLink') }}
                a(v-if='selectedStrategyKey === `local` && selectedStrategy.selfRegistration', href='/register') {{ $t('auth:switchToRegister.link') }}
              v-btn.login-submit.text-none(
                width='100%'
                large
                color='blue darken-2'
                dark
                @click='login'
                :loading='isLoading'
                ) {{ $t('auth:actions.login') }}
          .login-external(v-if='screen === `login` && selectedStrategy.key !== `unselected` && !selectedStrategy.strategy.useForm')
            .login-external-icon: v-icon(color='blue darken-2', size='32') mdi-shield-check-outline
            h3 {{ $t('auth:design.externalTitle', { defaultValue: 'Sign in with your identity provider' }) }}
            p {{ $t('auth:design.externalDescription', { provider: selectedStrategy.displayName, defaultValue: 'Continue to your identity provider to sign in with your account.' }) }}
            v-btn.login-submit.text-none(width='100%', large, color='blue darken-2', dark, :loading='isLoading', @click='loginWithProvider') {{ $t('auth:design.externalAction', { provider: selectedStrategy.displayName, defaultValue: 'Continue to sign in' }) }}
          //-------------------------------------------------
          //- FORGOT PASSWORD FORM
          //-------------------------------------------------
          template(v-if='screen === `forgot`')
            .login-subtitle
              .text-subtitle-1 {{$t('auth:forgotPasswordTitle')}}
            .login-info {{ $t('auth:forgotPasswordSubtitle') }}
            .login-form
              v-text-field(
                outlined
                prepend-inner-icon='mdi-clipboard-account'
                background-color='white'
                color='blue darken-2'
                hide-details
                ref='iptForgotPwdEmail'
                v-model='username'
                :placeholder='$t(`auth:fields.email`)'
                type='email'
                autocomplete='email'
                @keyup.enter='forgotPasswordSubmit'
                light
                )
              v-btn.mt-2.text-none(
                width='100%'
                large
                color='blue darken-2'
                dark
                @click='forgotPasswordSubmit'
                :loading='isLoading'
                ) {{ $t('auth:sendResetPassword') }}
              .text-center.mt-5
                v-btn.text-none(
                  text
                  rounded
                  color='grey darken-3'
                  @click.stop.prevent='screen = `login`'
                  href='#forgot'
                  ): .caption {{ $t('auth:forgotPasswordCancel') }}
          //-------------------------------------------------
          //- CHANGE PASSWORD FORM
          //-------------------------------------------------
          template(v-if='screen === `changePwd`')
            .login-subtitle
              .text-subtitle-1 {{ $t('auth:changePwd.subtitle') }}
            .login-form
              v-text-field.mt-2(
                type='password'
                outlined
                prepend-inner-icon='mdi-form-textbox-password'
                background-color='white'
                color='blue darken-2'
                hide-details
                ref='iptNewPassword'
                v-model='newPassword'
                :placeholder='$t(`auth:changePwd.newPasswordPlaceholder`)'
                autocomplete='new-password'
                light
                )
                password-strength(slot='progress', v-model='newPassword')
              v-text-field.mt-2(
                type='password'
                outlined
                prepend-inner-icon='mdi-form-textbox-password'
                background-color='white'
                color='blue darken-2'
                hide-details
                v-model='newPasswordVerify'
                :placeholder='$t(`auth:changePwd.newPasswordVerifyPlaceholder`)'
                autocomplete='new-password'
                @keyup.enter='changePassword'
                light
              )
              v-btn.mt-2.text-none(
                width='100%'
                large
                color='blue darken-2'
                dark
                @click='changePassword'
                :loading='isLoading'
                ) {{ $t('auth:changePwd.proceed') }}

          .login-footer {{ $t('auth:design.footer', { defaultValue: 'Need help? Contact your administrator · Chrome or Edge recommended' }) }}

    //-------------------------------------------------
    //- TFA FORM
    //-------------------------------------------------
    v-dialog(v-model='isTFAShown', max-width='500', persistent)
      v-card
        .login-tfa.text-center.pa-5.grey--text.text--darken-3
          img(src='_assets/svg/icon-pin-pad.svg')
          .subtitle-2 {{$t('auth:tfaFormTitle')}}
          v-text-field.login-tfa-field.mt-2(
            solo
            flat
            background-color='white'
            color='blue darken-2'
            hide-details
            ref='iptTFA'
            v-model='securityCode'
            :placeholder='$t("auth:tfa.placeholder")'
            autocomplete='one-time-code'
            @keyup.enter='verifySecurityCode(false)'
            light
          )
          v-btn.mt-2.text-none(
            width='100%'
            large
            color='blue darken-2'
            dark
            @click='verifySecurityCode(false)'
            :loading='isLoading'
            ) {{ $t('auth:tfa.verifyToken') }}

    //-------------------------------------------------
    //- SETUP TFA FORM
    //-------------------------------------------------
    v-dialog(v-model='isTFASetupShown', max-width='600', persistent)
      v-card
        .login-tfa.text-center.pa-5.grey--text.text--darken-3
          .subtitle-1.primary--text {{$t('auth:tfaSetupTitle')}}
          v-divider.my-5
          .subtitle-2 {{$t('auth:tfaSetupInstrFirst')}}
          .caption (#[a(href='https://authy.com/', target='_blank', noopener) Authy], #[a(href='https://support.google.com/accounts/answer/1066447', target='_blank', noopener) Google Authenticator], #[a(href='https://www.microsoft.com/en-us/account/authenticator', target='_blank', noopener) Microsoft Authenticator], etc.)
          .login-tfa-qr.mt-5(v-if='isTFASetupShown', v-html='tfaQRImage')
          .subtitle-2.mt-5 {{$t('auth:tfaSetupInstrSecond')}}
          v-text-field.login-tfa-field.mt-2(
            solo
            flat
            background-color='white'
            color='blue darken-2'
            hide-details
            ref='iptTFASetup'
            v-model='securityCode'
            :placeholder='$t("auth:tfa.placeholder")'
            autocomplete='one-time-code'
            @keyup.enter='verifySecurityCode(true)'
            light
          )
          v-btn.mt-2.text-none(
            width='100%'
            large
            color='blue darken-2'
            dark
            @click='verifySecurityCode(true)'
            :loading='isLoading'
            ) {{ $t('auth:tfa.verifyToken') }}

    loader(v-model='isLoading', :color='loaderColor', :title='loaderTitle', :subtitle='$t(`auth:pleaseWait`)')
    notify(style='padding-top: 64px;')
</template>

<script>
/* global siteConfig */

// <span>Photo by <a href="https://unsplash.com/@isaacquesada?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Isaac Quesada</a> on <a href="/t/textures-patterns?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a></span>

import _ from 'lodash'
import Cookies from 'js-cookie'
import gql from 'graphql-tag'
import { sync } from 'vuex-pathify'
import clearClientCache from '../helpers/client-cache'

export default {
  i18nOptions: { namespaces: 'auth' },
  props: {
    bgUrl: {
      type: String,
      default: ''
    },
    hideLocal: {
      type: Boolean,
      default: false
    },
    changePwdContinuationToken: {
      type: String,
      default: null
    }
  },
  data () {
    return {
      error: false,
      strategies: [],
      selectedStrategyKey: 'unselected',
      selectedStrategy: { key: 'unselected', strategy: { useForm: false, usernameType: 'email' } },
      screen: 'login',
      username: '',
      password: '',
      hidePassword: true,
      securityCode: '',
      continuationToken: '',
      isLoading: false,
      loaderColor: 'grey darken-4',
      loaderTitle: 'Working...',
      isShown: false,
      newPassword: '',
      newPasswordVerify: '',
      isTFAShown: false,
      isTFASetupShown: false,
      tfaQRImage: '',
      errorShown: false,
      errorMessage: ''
    }
  },
  computed: {
    activeModal: sync('editor/activeModal'),
    siteTitle () {
      return siteConfig.title
    },
    copyrightYear () {
      return new Date().getFullYear()
    },
    filteredStrategies () {
      const qParams = new URLSearchParams(window.location.search)
      if (this.hideLocal && !qParams.has('all')) {
        return _.reject(this.strategies, ['key', 'local'])
      } else {
        return this.strategies
      }
    },
    isUsernameEmail () {
      return this.selectedStrategy.strategy.usernameType === `email`
    }
  },
  watch: {
    filteredStrategies (newValue, oldValue) {
      const selected = _.find(newValue, ['key', this.selectedStrategyKey])
      if (selected) {
        this.selectedStrategy = selected
      } else {
        this.selectedStrategyKey = _.get(_.head(newValue), 'key', 'unselected')
      }
    },
    selectedStrategyKey (newValue, oldValue) {
      this.selectedStrategy = _.find(this.strategies, ['key', newValue]) || { key: 'unselected', strategy: { useForm: false, usernameType: 'email' } }
      if (this.screen === 'changePwd') {
        return
      }
      this.screen = 'login'
      if (this.selectedStrategy.strategy.useForm) {
        this.$nextTick(() => {
          if (this.$refs.iptEmail) this.$refs.iptEmail.focus()
        })
      }
    }
  },
  mounted () {
    this.isShown = true
    if (this.changePwdContinuationToken) {
      this.screen = 'changePwd'
      this.continuationToken = this.changePwdContinuationToken
    }
  },
  methods: {
    loginWithProvider () {
      this.isLoading = true
      window.location.assign('/login/' + this.selectedStrategyKey)
    },
    /**
     * LOGIN
     */
    async login () {
      this.errorShown = false
      if (this.username.length < 2) {
        this.errorMessage = this.$t('auth:invalidEmailUsername')
        this.errorShown = true
        this.$refs.iptEmail.focus()
      } else if (this.password.length < 2) {
        this.errorMessage = this.$t('auth:invalidPassword')
        this.errorShown = true
        this.$refs.iptPassword.focus()
      } else {
        this.loaderColor = 'grey darken-4'
        this.loaderTitle = this.$t('auth:signingIn')
        this.isLoading = true
        try {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation($username: String!, $password: String!, $strategy: String!) {
                authentication {
                  login(username: $username, password: $password, strategy: $strategy) {
                    responseResult {
                      succeeded
                      errorCode
                      slug
                      message
                    }
                    jwt
                    mustChangePwd
                    mustProvideTFA
                    mustSetupTFA
                    continuationToken
                    redirect
                    tfaQRImage
                  }
                }
              }
            `,
            variables: {
              username: this.username,
              password: this.password,
              strategy: this.selectedStrategy.key
            }
          })
          if (_.has(resp, 'data.authentication.login')) {
            const respObj = _.get(resp, 'data.authentication.login', {})
            if (respObj.responseResult.succeeded === true) {
              this.handleLoginResponse(respObj)
            } else {
              throw new Error(respObj.responseResult.errorCode === 1002 ?
                this.$t('auth:errors.invalidLoginMsg') :
                respObj.responseResult.message)
            }
          } else {
            throw new Error(this.$t('auth:genericError'))
          }
        } catch (err) {
          console.error(err)
          this.$store.commit('showNotification', {
            style: 'red',
            message: err.message,
            icon: 'alert'
          })
          this.isLoading = false
        }
      }
    },
    /**
     * VERIFY TFA CODE
     */
    async verifySecurityCode (setup = false) {
      if (this.securityCode.length !== 6) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: this.$t('auth:errors.securityCodeRequired', { defaultValue: 'Enter a valid security code.' }),
          icon: 'alert'
        })
        if (setup) {
          this.$refs.iptTFASetup.focus()
        } else {
          this.$refs.iptTFA.focus()
        }
      } else {
        this.loaderColor = 'grey darken-4'
        this.loaderTitle = this.$t('auth:signingIn')
        this.isLoading = true
        try {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation(
                $continuationToken: String!
                $securityCode: String!
                $setup: Boolean
                ) {
                authentication {
                  loginTFA(
                    continuationToken: $continuationToken
                    securityCode: $securityCode
                    setup: $setup
                    ) {
                    responseResult {
                      succeeded
                      errorCode
                      slug
                      message
                    }
                    jwt
                    mustChangePwd
                    continuationToken
                    redirect
                  }
                }
              }
            `,
            variables: {
              continuationToken: this.continuationToken,
              securityCode: this.securityCode,
              setup
            }
          })
          if (_.has(resp, 'data.authentication.loginTFA')) {
            let respObj = _.get(resp, 'data.authentication.loginTFA', {})
            if (respObj.responseResult.succeeded === true) {
              this.handleLoginResponse(respObj)
            } else {
              if (!setup) {
                this.isTFAShown = false
              }
              throw new Error(respObj.responseResult.message)
            }
          } else {
            throw new Error(this.$t('auth:genericError'))
          }
        } catch (err) {
          console.error(err)
          this.$store.commit('showNotification', {
            style: 'red',
            message: err.message,
            icon: 'alert'
          })
          this.isLoading = false
        }
      }
    },
    /**
     * CHANGE PASSWORD
     */
    async changePassword () {
      this.loaderColor = 'grey darken-4'
      this.loaderTitle = this.$t('auth:changePwd.loading')
      this.isLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $continuationToken: String!
              $newPassword: String!
            ) {
              authentication {
                loginChangePassword (
                  continuationToken: $continuationToken
                  newPassword: $newPassword
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  jwt
                  continuationToken
                  redirect
                }
              }
            }
          `,
          variables: {
            continuationToken: this.continuationToken,
            newPassword: this.newPassword
          }
        })
        if (_.has(resp, 'data.authentication.loginChangePassword')) {
          let respObj = _.get(resp, 'data.authentication.loginChangePassword', {})
          if (respObj.responseResult.succeeded === true) {
            this.handleLoginResponse(respObj)
          } else {
            throw new Error(respObj.responseResult.message)
          }
        } else {
          throw new Error(this.$t('auth:genericError'))
        }
      } catch (err) {
        console.error(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
        this.isLoading = false
      }
    },
    /**
     * SWITCH TO FORGOT PASSWORD SCREEN
     */
    forgotPassword () {
      this.screen = 'forgot'
      this.$nextTick(() => {
        this.$refs.iptForgotPwdEmail.focus()
      })
    },
    /**
     * FORGOT PASSWORD SUBMIT
     */
    async forgotPasswordSubmit () {
      this.loaderColor = 'grey darken-4'
      this.loaderTitle = this.$t('auth:forgotPasswordLoading')
      this.isLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $email: String!
            ) {
              authentication {
                forgotPassword (
                  email: $email
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
            email: this.username
          }
        })
        if (_.has(resp, 'data.authentication.forgotPassword.responseResult')) {
          let respObj = _.get(resp, 'data.authentication.forgotPassword.responseResult', {})
          if (respObj.succeeded === true) {
            this.$store.commit('showNotification', {
              style: 'success',
              message: this.$t('auth:forgotPasswordSuccess'),
              icon: 'email'
            })
            this.screen = 'login'
          } else {
            throw new Error(respObj.errorCode === 3002 ?
              this.$t('auth:errors.mailNotConfigured', { defaultValue: respObj.message }) :
              respObj.message)
          }
        } else {
          throw new Error(this.$t('auth:genericError'))
        }
      } catch (err) {
        console.error(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isLoading = false
    },
    async handleLoginResponse (respObj) {
      this.continuationToken = respObj.continuationToken
      if (respObj.mustChangePwd === true) {
        this.screen = 'changePwd'
        this.$nextTick(() => {
          this.$refs.iptNewPassword.focus()
        })
        this.isLoading = false
      } else if (respObj.mustProvideTFA === true) {
        this.securityCode = ''
        this.isTFAShown = true
        setTimeout(() => {
          this.$refs.iptTFA.focus()
        }, 500)
        this.isLoading = false
      } else if (respObj.mustSetupTFA === true) {
        this.securityCode = ''
        this.isTFASetupShown = true
        this.tfaQRImage = respObj.tfaQRImage
        setTimeout(() => {
          this.$refs.iptTFASetup.focus()
        }, 500)
        this.isLoading = false
      } else {
        this.loaderColor = 'green darken-1'
        this.loaderTitle = this.$t('auth:loginSuccess')
        Cookies.set('jwt', respObj.jwt, { expires: 365, secure: window.location.protocol === 'https:' })
        await clearClientCache()
        const loginRedirect = Cookies.get('loginRedirect')
        const isValidRedirect = loginRedirect && loginRedirect.startsWith('/') && !loginRedirect.startsWith('//') && !loginRedirect.includes('://')
        if (loginRedirect === '/' && respObj.redirect) {
          Cookies.remove('loginRedirect')
          window.location.replace(respObj.redirect)
        } else if (isValidRedirect) {
          Cookies.remove('loginRedirect')
          window.location.replace(loginRedirect)
        } else {
          if (loginRedirect) {
            Cookies.remove('loginRedirect')
          }
          if (respObj.redirect) {
            window.location.replace(respObj.redirect)
          } else {
            window.location.replace('/')
          }
        }
      }
    }
  },
  apollo: {
    strategies: {
      query: gql`
        {
          authentication {
            activeStrategies(enabledOnly: true) {
              key
              strategy {
                key
                logo
                color
                icon
                useForm
                usernameType
              }
              displayName
              order
              selfRegistration
            }
          }
        }
      `,
      update: (data) => _.sortBy(data.authentication.activeStrategies, ['order']),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'login-strategies-refresh')
      }
    }
  }
}
</script>

<style lang="scss">
  .login {
    min-height: 100vh;
    padding: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #eef2f7;
    background-size: cover;
    background-position: center;
    color: #1f2937;

    &-shell {
      width: 100%;
      max-width: 1080px;
      min-height: 640px;
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      overflow: hidden;
      border-radius: 24px;
      background: #fff;
      box-shadow: 0 20px 60px rgba(15, 23, 42, .12), 0 2px 8px rgba(15, 23, 42, .05);
    }

    &-brand {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: 56px 52px;
      color: #fff;
      background: linear-gradient(145deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);

      &::before, &::after {
        position: absolute;
        content: '';
        border-radius: 50%;
        pointer-events: none;
      }
      &::before {
        width: 520px;
        height: 520px;
        right: -220px;
        top: -180px;
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, .22), transparent 70%);
      }
      &::after {
        width: 420px;
        height: 420px;
        left: -160px;
        bottom: -200px;
        background: radial-gradient(circle, rgba(255, 255, 255, .14), transparent 70%);
      }
    }

    &-brand-grid {
      position: absolute;
      inset: 0;
      opacity: .12;
      background-image: linear-gradient(rgba(255, 255, 255, .6) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .6) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: linear-gradient(135deg, #000, transparent 75%);
      -webkit-mask-image: linear-gradient(135deg, #000, transparent 75%);
      pointer-events: none;
    }
    &-brand-top, &-brand-center, &-brand-bottom { position: relative; z-index: 1; }
    &-brand-top { display: flex; align-items: center; gap: 14px; }
    &-brand-logo {
      width: 48px;
      height: 48px;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, .35);
      border-radius: 13px;
      background: rgba(255, 255, 255, .16);
    }
    &-brand-name { font-size: 17px; font-weight: 600; letter-spacing: .5px; }
    &-brand-sub { margin-top: 2px; font-size: 11px; opacity: .75; letter-spacing: 2px; }
    &-brand-center { max-width: 400px; }
    &-brand-center h1 { font-size: 38px; line-height: 1.3; font-weight: 700; letter-spacing: 1px; }
    &-brand-center p { margin-top: 18px; font-size: 15px; line-height: 1.9; opacity: .82; }
    &-features { display: flex; flex-direction: column; gap: 16px; margin-top: 34px; }
    &-feature { display: flex; align-items: center; gap: 12px; font-size: 14px; }
    &-feature > span {
      width: 30px;
      height: 30px;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      background: rgba(255, 255, 255, .14);
    }
    &-brand-bottom { font-size: 12px; opacity: .6; letter-spacing: .5px; }

    &-sd { min-width: 0; padding: 56px 60px; display: flex; flex-direction: column; justify-content: center; background: #fff; }
    &-heading { margin-bottom: 30px; }
    &-heading h2 { font-size: 27px; font-weight: 700; letter-spacing: .5px; }
    &-heading p { margin-top: 8px; margin-bottom: 0; color: #6b7280; font-size: 14px; }
    &-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 5px; margin-bottom: 26px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; }
    &-tab {
      min-width: 120px;
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 8px;
      border-radius: 9px;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.4;
      cursor: pointer;
      &.active { color: #2563eb; background: #fff; font-weight: 600; box-shadow: 0 2px 8px rgba(37, 99, 235, .13); }
      &:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    }
    &-tab .v-icon { color: inherit; }
    &-field-label { display: block; margin: 18px 0 8px; color: #374151; font-size: 13px; font-weight: 600; }
    &-form .v-text-field--outlined > .v-input__control > .v-input__slot { min-height: 48px; border-radius: 11px; }
    &-form .v-text-field--outlined fieldset { border-color: #e5e7eb; }
    &-form .v-text-field--outlined.v-input--is-focused fieldset { border-color: #2563eb; }
    &-options { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin: 20px 0 24px; font-size: 13px; }
    &-options a { color: #2563eb; text-decoration: none; }
    &-options a:hover { text-decoration: underline; }
    &-submit.v-btn { height: 50px; border-radius: 11px; background: linear-gradient(135deg, #2563eb, #1d4ed8) !important; box-shadow: 0 8px 20px rgba(37, 99, 235, .28); }
    &-external { padding: 18px 4px 4px; text-align: center; }
    &-external-icon { width: 64px; height: 64px; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; border-radius: 18px; background: linear-gradient(135deg, #dbeafe, #eff6ff); }
    &-external h3 { margin-bottom: 8px; font-size: 17px; }
    &-external p { margin-bottom: 22px; color: #6b7280; font-size: 13px; line-height: 1.8; }
    &-subtitle { margin-bottom: 12px; font-weight: 600; }
    &-info { margin-bottom: 12px; color: #6b7280; font-size: 13px; }
    &-footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; }

    &-tfa {
      background-color: #eee;
      border: 7px solid #fff;
      &-field input { text-align: center; }
      &-qr { background-color: #fff; padding: 5px; border-radius: 5px; width: 200px; height: 200px; margin: 0 auto; }
    }

    @media (max-width: 880px) {
      &-shell { max-width: 540px; min-height: 0; grid-template-columns: 1fr; }
      &-brand { display: none; }
      &-sd { padding: 44px 28px; }
    }
    @media (max-width: 480px) {
      padding: 16px;
      &-sd { padding: 36px 22px; }
    }
  }
</style>
