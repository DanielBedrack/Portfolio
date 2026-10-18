import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const resumePath = new URL('../public/Daniel-Bedrack-CV-2026.pdf', import.meta.url)

let data
try {
  data = await readFile(resumePath)
} catch {
  console.error('Resume verification failed: public PDF is missing.')
  process.exit(1)
}

if (data.subarray(0, 5).toString('ascii') !== '%PDF-') {
  console.error('Resume verification failed: file does not begin with a PDF signature.')
  process.exit(1)
}

const document = await getDocument({ data: new Uint8Array(data), useSystemFonts: true }).promise
let text = ''
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber)
  const content = await page.getTextContent()
  text += ` ${content.items.map((item) => ('str' in item ? item.str : '')).join(' ')}`
}

if (!text.includes('September 2026')) {
  console.error('Resume verification failed: September 2026 is not extractable.')
  process.exit(1)
}

if (/Optimate[\s\S]{0,500}?Present/i.test(text)) {
  console.error('Resume verification failed: Optimate is still paired with Present.')
  process.exit(1)
}

console.log(`Resume verification passed: ${document.numPages} page(s), corrected Optimate date found.`)
