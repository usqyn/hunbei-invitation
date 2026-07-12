import type { EditableElement, PageSection, FlipPage, TemplateBackground, TemplateData, BasicInfo, TemplateSettings } from './template'

export interface WorkEditorData {
  elements?: EditableElement[]
  pageSections?: PageSection[]
  flipPages?: FlipPage[]
  background?: TemplateBackground
  canvasSize?: { width: number; height: number }
  templateType?: 'canvas' | 'page' | 'flip'
  renderedImage?: string
  templateData?: TemplateData
  basicInfo?: BasicInfo
  settings?: TemplateSettings
  currentFlipPageIndex?: number
}

export interface Work {
  id: string
  title: string
  date: string
  image: string
  cover?: string
  status?: 'draft' | 'published'
  templateType?: string
  templateId?: string
  musicId?: number | null
  updatedAt?: string
  data?: WorkEditorData
}
