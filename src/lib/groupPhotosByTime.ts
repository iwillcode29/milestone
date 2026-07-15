// Groups a multi-select photo batch into per-team photo sets, using each
// file's lastModified (= capture time for camera-roll originals, no EXIF
// parsing needed) as a proxy for "these were taken together." A new group
// starts whenever the gap to the previous photo exceeds gapMs — staff
// naturally pause between teams (walking to the next runner, chatting)
// longer than the few seconds between two photos of the same watch.
export function groupPhotosByTime(files: File[], gapMs = 60_000): File[][] {
  const sorted = [...files].sort((a, b) => a.lastModified - b.lastModified)
  const groups: File[][] = []

  for (const file of sorted) {
    const current = groups[groups.length - 1]
    const previous = current?.[current.length - 1]
    if (previous && file.lastModified - previous.lastModified <= gapMs) {
      current.push(file)
    } else {
      groups.push([file])
    }
  }

  return groups
}
