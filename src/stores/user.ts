import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const nickname = ref('')
  const phone = ref('')

  function setLogin(phoneNumber: string, nick?: string) {
    isLoggedIn.value = true
    phone.value = phoneNumber
    if (nick) nickname.value = nick
  }

  function logout() {
    isLoggedIn.value = false
    nickname.value = ''
    phone.value = ''
  }

  return { isLoggedIn, nickname, phone, setLogin, logout }
})
