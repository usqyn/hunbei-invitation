import {} from 'fabric'

declare module 'fabric' {
  interface FabricObject {
    id?: string
    elementType?: string
    dataKey?: string
    editable?: boolean
    direction?: string
    srcUrl?: string
    isGuide?: boolean
    isGrid?: boolean
  }
}
