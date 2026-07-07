const fs = require('fs')
const path = require('path')
const root = path.resolve(process.argv[2] || '.')
const keyword = process.argv[3]
const exts = ['.vue', '.ts', '.tsx', '.js', '.jsx', '.json', '.md']
const hits = []
function ok(name) { return exts.some((ext) => name.endsWith(ext)) }
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (['node_modules', '.git', '.turbo', 'dist'].includes(ent.name)) continue
      walk(p)
    } else if (ok(ent.name)) {
      const s = fs.readFileSync(p, 'utf8')
      if (s.includes(keyword)) hits.push(path.relative(process.cwd(), p))
    }
  }
}
walk(root)
console.log(hits.join('\n'))
