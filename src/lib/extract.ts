import { compressImageToDataUrl } from './imageCompress'

export type Reading = { type: 'time'; seconds: number } | { type: 'distance'; km: number }

export async function extractReadingsFromPhoto(file: File): Promise<Reading[]> {
  const imageDataUrl = await compressImageToDataUrl(file)

  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `อ่านรูปไม่สำเร็จ (${res.status})`)
  }

  const data = await res.json()
  const readings: Reading[] = Array.isArray(data.readings) ? data.readings : []
  return readings.filter(
    (r) =>
      (r.type === 'time' && Number.isFinite(r.seconds)) || (r.type === 'distance' && Number.isFinite(r.km)),
  )
}
