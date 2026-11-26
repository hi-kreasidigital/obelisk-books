// Serves fixtures/storage/** at http://localhost:4400/storage/... so fixture builds exercise real remote-image optimisation.
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
const root = join(process.cwd(), 'fixtures');
createServer((req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const f = join(root, p);
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream' });
  createReadStream(f).pipe(res);
}).listen(4400, () => console.log('fixture storage on :4400'));
