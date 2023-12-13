import { createStore, Store, useStore as baseUseStore } from 'vuex'
import { saveLanguageApi, fetchLanguageApi } from '@/api/layout'
import { saveGlobalHeader, fetchGlobalHeader } from '@/api/layout/header'
import { saveUserStatus, fetchUserStatus } from '@/api/layout/user'
import { saveDebugStatus, fetchDebugStatus } from '@/api/layout/debug'
import { saveRememberStatus, fetchRememberStatus } from '@/api/layout/remember'
import { InjectionKey } from 'vue'
import { getDRFTestData } from '@/api'

// 为 store state 声明类型
export interface AllStateTypes {
  count: number,
  locale: any,
  userStatus: Number,
  drtTestStatus: String,
  globalHeader: any
}

// 定义 injection key
export const key: InjectionKey<Store<AllStateTypes>> = Symbol('storeKey')

export function useStore() {
  return baseUseStore(key)
}

export function createSSRstore() {
  return createStore<AllStateTypes>({
    state: {
      count: 1,
      locale: null, // 语言包
      userStatus: 0, // 登录态
      drtTestStatus: '',
      globalHeader: false
    },
    mutations: {
      setCount(state, payload) {
        state.count += payload
        return state.count
      },
      setLanguage(state, payload) { // 设置语言包
        state.locale = payload
        return state.locale
      },
      setUserStatus(state, payload) {
        state.userStatus = payload
        return state.userStatus
      },
      setDrfData(state, payload) {
        state.drtTestStatus = payload
        return state.drtTestStatus
      },
      setGlobalHeader(state, payload) {
        state.globalHeader = payload
        return state.globalHeader
      }
    },
    actions: {
      fetchCount({ commit, state }, payload) {
        setTimeout(() => {
          commit('setCount', payload)
        }, 3000)
      },
      saveLanguage({ commit, state }, language: any) { // 保存语言包
        saveLanguageApi(language.name).then(res => {
          const { success } = res
          if (success) {
            commit('setLanguage', language)
          }
        })
      },
      getLanguage({ commit, state }) {
        return new Promise(resolve => {
          fetchLanguageApi().then(res => {
            commit('setLanguage', res.result)
            resolve(res.result)
          })
        })
      },
      getDrfData({ commit }) {
        return new Promise(resolve => {
          getDRFTestData().then(res => {
            const { success, result } = res
            if (success) {
              commit('setDrfData', result)
              console.log('保存DRF内容成功')
              resolve(true)
            }
          })
        })
      },
      saveGlobalHeader({ commit, state }, headerState) {
        return new Promise(resolve => {
          saveGlobalHeader(headerState).then(res => {
            const { success } = res
            if (success) {
              commit('setGlobalHeader', headerState)
            }
            resolve(state.globalHeader)
          })
        })
      },
      getGlobalHeader({ commit, state }) {
        return new Promise(resolve => {
          fetchGlobalHeader().then(res => {
            commit('setGlobalHeader', res.result === null ? false : res.result.style)
            resolve(state.globalHeader)
          })
        })
      },
      saveRemember({ commit, state }, status) {
        return new Promise(resolve => {
          saveRememberStatus(status).then((res:any) => {
            const { success } = res
            if (success) {
              resolve(true)
            }
            resolve(false)
          })
        })
      },
      getRemember({ commit, state }) {
        return new Promise(resolve => {
          fetchRememberStatus().then((res:any) => {
            const { success } = res
            if (success) {
              resolve(res.result)
            }
            resolve(null)
          })
        })
      },
      saveUser({ commit, state }, status) {
        return new Promise(resolve => {
          saveUserStatus(status).then((res:any) => {
            const { success } = res
            if (success) {
              resolve(true)
            }
            resolve(false)
          })
        })
      },
      saveDebug({ commit, state }, status) {
        return new Promise(resolve => {
          saveDebugStatus(status).then((res:any) => {
            const { success } = res
            if (success) {
              resolve(true)
            }
            resolve(false)
          })
        })
      },
      getUser({ commit, state }) {
        return new Promise(resolve => {
          fetchUserStatus().then((res:any) => {
            const { success } = res
            if (success) {
              resolve(res.result)
            }
            resolve(null)
          })
        })
      },
      getDebug({ commit, state }) {
        return new Promise(resolve => {
          fetchDebugStatus().then((res:any) => {
            const { success } = res
            if (success) {
              resolve(res.result)
            }
            resolve(null)
          })
        })
      },
      clearCookie({ commit, state }) {
        return new Promise(resolve => {

        })
      }
    }
  })
}
