function isHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  return /\.hei[cf]$/i.test(file.name)
}

async function toDecodableBlob(file: File): Promise<Blob> {
  if (!isHeic(file)) return file
  const heic2any = (await import('heic2any')).default
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 })
  return Array.isArray(converted) ? converted[0] : converted
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ ลองถ่ายรูปใหม่หรือเลือกไฟล์ JPEG/PNG แทน'))
    img.src = src
  })
}

export async function compressImageToDataUrl(file: File, maxDim = 1280, quality = 0.7): Promise<string> {
  let blob: Blob
  try {
    blob = await toDecodableBlob(file)
  } catch {
    throw new Error('แปลงไฟล์ HEIC ไม่สำเร็จ ลองถ่ายรูปใหม่หรือเลือกไฟล์ JPEG/PNG แทน')
  }

  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(img, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
