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
  align?: string
  bold?: boolean
  borderRadius?: number
  // runtime state
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
  is_free: number
  is_vip: number
  like_count: number
  category_name?: string
}

export interface PosterWork {
  id: string
  user_id: string
  template_id: string
  template_name?: string
  cover_url?: string
  poster_url?: string
  content: {
    editableAreas: PosterEditableArea[]
  }
  created_at: string
}
