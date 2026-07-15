import { compressImageToDataUrl } from './imageCompress'

export type BatchExtraction = {
  bib: string | null
  activity_sec: number | null
  laps: { pace_sec: number | null; distance_km: number | null }[]
}

export async function extractBatchFromPhotos(files: File[]): Promise<BatchExtraction> {
  const imageDataUrls = await Promise.all(files.map((file) => compressImageToDataUrl(file)))

  const res = await fetch('/api/extract-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrls }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `อ่านรูปไม่สำเร็จ (${res.status})`)
  }

  const data = await res.json()
  return {
    bib: typeof data.bib === 'string' ? data.bib : null,
    activity_sec: Number.isFinite(data.activity_sec) ? data.activity_sec : null,
    laps: Array.isArray(data.laps)
      ? data.laps.map((lap: { pace_sec?: unknown; distance_km?: unknown }) => ({
          pace_sec: Number.isFinite(lap.pace_sec) ? (lap.pace_sec as number) : null,
          distance_km: Number.isFinite(lap.distance_km) ? (lap.distance_km as number) : null,
        }))
      : [],
  }
}
