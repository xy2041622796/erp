const fs = require('fs')
const path = require('path')
const root = path.resolve(process.argv[2] || 'src/views')
const exts = ['.vue', '.ts', '.tsx', '.js', '.jsx']
const keywords = [
  'importConfigId',
  'ExportConfig',
  'ImportConfig',
  'useImportExport',
  '导入',
  '导出',
  'ImportExport'
]
const hits = []
function ok(name) {
  return exts.some((ext) => name.endsWith(ext))
}
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(p)
    } else if (ok(ent.name)) {
      const s = fs.readFileSync(p, 'utf8')
      if (keywords.some((k) => s.includes(k))) {
        hits.push(path.relative(process.cwd(), p))
      }
    }
  }
}
walk(root)
console.log(hits.join('\n'))
