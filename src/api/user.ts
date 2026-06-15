import { post } from './request'

export function login(phone: string) {
  return post('/api/user/login', { phone })
}

export function getUserInfo() {
  return post('/api/user/info')
}
