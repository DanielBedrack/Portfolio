import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'dist')
const port = 4173
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

createServer((request, response) => {
  const requestedUrl = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const relativePath = decodeURIComponent(requestedUrl.pathname).replace(/^\/Portfolio\/?/, '')
  const safePath = normalize(relativePath || 'index.html').replace(/^(\.\.[/\\])+/, '')
  const candidate = join(root, safePath)
  const filePath = existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : join(root, '404.html')
  const status = filePath === candidate ? 200 : 404

  response.writeHead(status, {
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(filePath).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`Portfolio test server listening on http://127.0.0.1:${port}`)
})
