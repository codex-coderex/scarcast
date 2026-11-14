declare module 'georaster' {
  import type { GeoRaster } from 'georaster-layer-for-leaflet'

  /** The ArrayBuffer parser used by the GCOV service. */
  export default function parseGeoraster(data: ArrayBuffer): Promise<GeoRaster>
  export default function parseGeoraster(data: number[][][], metadata: {
    height: number; width: number; projection: number
    pixelWidth: number; pixelHeight: number; xmin: number; ymax: number; noDataValue: number
  }): Promise<GeoRaster>
}
