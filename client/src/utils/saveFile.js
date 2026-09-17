const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

// iOS Safari does not reliably honor the `download` attribute on links
// pointing at data: URLs or blob: URLs — instead of saving the file, it
// often just opens the image in a preview with nothing saved, which is why
// "Download" silently does nothing useful on iPhones. The Web Share API's
// file sharing lets the user explicitly "Save Image" / "Save to Files" from
// the native share sheet, which is the reliable way to get a file onto a
// phone from a web page. Desktop Chrome/Edge also implement navigator.share,
// but there the plain anchor-download already works fine and is what users
// expect (a share sheet is a confusing detour), so only prefer Share on
// actual mobile devices and fall back to anchor-download everywhere else.
export async function saveOrShareBlob(blob, filename, mimeType) {
  if (isMobileDevice() && navigator.canShare && navigator.share) {
    try {
      const file = new File([blob], filename, { type: mimeType })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      // fall through to the download fallback on any other share failure
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}
