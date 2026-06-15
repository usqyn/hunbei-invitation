export interface Template {
  id: number
  title: string
  date: string
  image: string
}

export interface TemplateData {
  coverImage: string
  coverTitle: string
  coverSubtitle: string
  photo1: string
  photo2: string
  photo3: string
  photo4: string
  photoTitle: string
  photoSubtitle: string
  footerText: string
  footerSubText: string
}

export interface BasicInfo {
  groomName: string
  brideName: string
  weddingDate: string
  location: string
  detailAddress: string
}

export interface TemplateSettings {
  danmaku: boolean
  giftAlbum: boolean
  giftBuy: boolean
  moneyGift: boolean
  like: boolean
  album: boolean
  [key: string]: boolean
}

export interface EditableElement {
  type: 'image' | 'text' | 'basic'
  text: string
  dataKey?: keyof TemplateData
}

export interface Material {
  url: string
  name: string
}
