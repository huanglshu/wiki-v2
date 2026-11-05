/* eslint-disable import/first */
import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import i18next from 'i18next'
import VueI18Next from '@panter/vue-i18next'
import boot from './modules/boot'
import en from '../data/sideload/en.json'
import zh from '../data/sideload/zh.json'
/* eslint-enable import/first */

window.WIKI = null
window.boot = boot

Vue.use(Vuetify)
Vue.use(VueI18Next)

const setupI18n = i18next.createInstance()
const setupResources = translations => Object.fromEntries(
  Object.entries(translations)
    .filter(([key]) => key.startsWith('setup:'))
    .map(([key, value]) => [key.slice('setup:'.length), value])
)
setupI18n.init({
  lng: navigator.language || 'en',
  load: 'languageOnly',
  fallbackLng: 'en',
  ns: ['setup'],
  defaultNS: 'setup',
  keySeparator: false,
  resources: {
    en: { setup: setupResources(en) },
    zh: { setup: setupResources(zh) }
  }
})

Vue.component('setup', () => import(/* webpackMode: "eager" */ './components/setup.vue'))

let bootstrap = () => {
  window.WIKI = new Vue({
    el: '#root',
    vuetify: new Vuetify(),
    i18n: new VueI18Next(setupI18n)
  })
}

window.boot.onDOMReady(bootstrap)
