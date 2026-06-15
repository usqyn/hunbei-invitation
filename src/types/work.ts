export interface Work {
  id: number
  title: string
  date: string
  image: string
  status?: 'draft' | 'published'
  templateType?: string
  musicId?: number
  updatedAt?: string
}
