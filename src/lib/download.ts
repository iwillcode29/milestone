export function triggerDownload(filename: string, content: string, mime: string): void {
  const a = document.createElement('a')
  a.href = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
