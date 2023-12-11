import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'

export function createSSRi18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      zh,
      en
    }
  })
}
