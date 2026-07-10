/** 可编辑区域 — 模板定义时的基础属性 */
export interface PosterEditableArea {
  id: string
  type: 'text' | 'image'
  label?: string
  x: number
  y: number
  width: number
  height: number
  defaultText?: string
  defaultImage?: string
  fontSize?: number
  color?: string
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  borderRadius?: number
}

/** 可编辑区域 — 运行时编辑状态（继承基础属性） */
export interface PosterEditableAreaRuntime extends PosterEditableArea {
  _x?: number
  _y?: number
  _w?: number
  _h?: number
  _text?: string
  _src?: string
  _fontSize?: number
  _color?: string
  _align?: string
  _bold?: boolean
  _rotate?: number
  _scale?: number
  _fontFamily?: string
}
export interface PosterTemplate {
  id: string
  name: string
  category_id: string
  cover_url: string
  background_url: string
  config: {
    width: number
    height: number
    editableAreas: PosterEditableArea[]
  }
  is_free: boolean
  is_vip: boolean
  like_count: number
  use_count?: number
  is_active?: boolean
  category_name?: string
  created_at?: string
}

export interface PosterWork {
  id: string
  user_id: string
  template_id: string
  template_name?: string
  cover_url?: string
  poster_url?: string
  content: {
    editableAreas: PosterEditableAreaRuntime[]
  }
  created_at: string
  updated_at?: string
}

export interface StickerItem {
  id: string
  name: string
  url: string
}
