import PDFDocument from 'pdfkit'

const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwwnwn',
  '1': 'wnnwnnwnw',
  '2': 'nnwwnnwnw',
  '3': 'wnwwnnwnn',
  '4': 'nnnwnwwnw',
  '5': 'wnnwnwwnn',
  '6': 'nnwwnwwnn',
  '7': 'nnnwnwnww',
  '8': 'wnnwnwnwn',
  '9': 'nnwwnwnwn',
  'A': 'wnnnnwnnw',
  'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn',
  'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn',
  'F': 'nnwnwwnnn',
  'G': 'nnnnnwnww',
  'H': 'wnnnnwnwn',
  'I': 'nnwnnwnwn',
  'J': 'nnnnwwnwn',
  'K': 'wnnnnnnww',
  'L': 'nnwnnnnww',
  'M': 'wnwnnnnwn',
  'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn',
  'P': 'nnwnwnnwn',
  'Q': 'nnnnnnwww',
  'R': 'wnnnnwnwn',
  'S': 'nnwnnnwnn',
  'T': 'nnnnwnwnn',
  'U': 'wwnnnnnnw',
  'V': 'nwnnnnnnw',
  'W': 'wwnnnnnnn',
  'X': 'nwnnwnnnw',
  'Y': 'wwnnwnnnn',
  'Z': 'nwnnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwnnnwnnn',
  '*': 'nwnnwnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn'
}

/**
 * Draws a Code 39 barcode on a pdfkit document.
 * @param doc The PDFKit document instance.
 * @param x X coordinate (in points).
 * @param y Y coordinate (in points).
 * @param code The text to encode (e.g. "12345"). Start/Stop asterisks are added automatically.
 * @param height Height of the barcode bars (in points).
 * @param narrowWidth Width of a narrow bar (in points).
 */
export function drawCode39(
  doc: typeof PDFDocument,
  x: number,
  y: number,
  code: string,
  height = 35,
  narrowWidth = 0.95
) {
  const cleanCode = `*${code.toUpperCase()}*`
  const wideWidth = narrowWidth * 2.2

  let currentX = x

  // Enable black fill
  doc.save()
  doc.fillColor('black')

  for (let i = 0; i < cleanCode.length; i++) {
    const char = cleanCode[i]
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS[' ']

    for (let p = 0; p < pattern.length; p++) {
      const isBar = p % 2 === 0
      const isWide = pattern[p] === 'w'
      const w = isWide ? wideWidth : narrowWidth

      if (isBar) {
        doc.rect(currentX, y, w, height).fill()
      }

      currentX += w
    }

    // Inter-character gap (narrow space)
    currentX += narrowWidth
  }

  doc.restore()
}
