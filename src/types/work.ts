export interface Work {
  id: string
  title: string
  date: string
  image: string
  status?: 'draft' | 'published'
  templateType?: string
  musicId?: number
  updatedAt?: string
}
