/**
 * 插件打包器（Bundler）—— 单一事实来源（Single Source of Truth）。
 *
 * DSH 动态 Cordis 插件的 host/client 代码必须是「自包含的单一函数体」（无 import）。
 * 本脚本把 src/core + src/engine + src/ui 的模块化源码，经过极简拼接变换，
 * 生成 dist/plugin/host.code.js 与 dist/plugin/client.code.js：
 *   - 逐行剥除 import 语句（模块被拼接进同一作用域，函数提升 + 惰性表查询保证顺序无关）；
 *   - 剥除顶层 `export ` 前缀（声明仍在同一作用域中）；
 *   - Core 暴露工厂与查询函数；UI 暴露 CSS 与组件；
 *   - host/client 骨架（src/plugin/host.js / client.js）追加在后。
 *
 * 约束：core/ui 源码只使用 `export function` / `export const`（无 export default、
 * 无多行 import、无顶层跨文件的常量初始化依赖）。
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const src = join(root, 'src')
const dist = join(root, 'dist', 'plugin')

/** 参与打包的 core 模块（依赖顺序：被引用的表在前，函数提升保证调用时已就绪）。 */
const CORE_FILES = [
  ['core/elements.js', 'elements.js'],
  ['core/trigrams.js', 'trigrams.js'],
  ['core/leaves.js', 'leaves.js'],
  ['core/fortune.js', 'fortune.js'],
  ['core/hexagram.js', 'hexagram.js'],
  ['engine/divine-engine.js', 'divine-engine.js'],
]

/** 参与打包的 ui 模块。 */
const UI_FILES = [
  ['ui/styles.js', 'styles.js'],
  ['ui/state.js', 'state.js'],
  ['ui/widget.js', 'widget.js'],
]

/** 读取并变换一个源码文件为「作用域内可拼接文本」。 */
function transformSource(filePath, label) {
  let text = readFileSync(join(src, filePath), 'utf8')
  // 1) 剥除 import 语句（单行形式）
  text = text.replace(/^import\s+[^\n]*\n?/gm, '')
  // 2) 剥除顶层 export 前缀
  text = text.replace(/^export\s+/gm, '')
  // 3) 防御：残留的 import/export 意味着不受支持的语法
  const leftover = text.match(/^(import\s|export\s)/m)
  if (leftover) {
    throw new Error(`[bundle] ${label} 存在无法处理的顶层语句: ${leftover[0].trim()}`)
  }
  return text
}

/** 拼接一组文件。 */
function concatSources(files) {
  return files
    .map(([path, label]) => {
      const text = transformSource(path, label)
      return `// ===== ${label} =====\n${text.trim()}\n`
    })
    .join('\n')
}

/** Host 半体骨架（Core 已在上方 IIFE 中就绪）。 */
const HOST_SKELETON = `
return {
  apply(ctx) {
    const engine = Core.createDivineEngine({ log: (msg) => console.log(msg) })
    ctx.effect(() => () => { engine.dispose() }, 'bushang-yigua engine teardown')

    // 起卦：页面加载 / 任务发起 / 手动
    harness.handle('divine', async (args) => {
      const reason = args && typeof args.reason === 'string' ? args.reason : 'manual'
      const sessionId = args && typeof args.sessionId === 'string' ? args.sessionId : undefined
      return engine.divine({ reason, sessionId })
    })

    // 查询历史（数据读取扩展点）
    harness.handle('history', async (args) => {
      const limit = args && typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : 10
      return engine.list({ limit })
    })

    // 删除一条记录（数据删除扩展点）
    harness.handle('forget', async (args) => {
      const id = args && typeof args.id === 'string' ? args.id : undefined
      return { ok: id !== undefined ? engine.remove(id) : false, reason: id === undefined ? 'missing id' : undefined }
    })

    // 清空记录（数据操作扩展点）
    harness.handle('clear', async () => ({ cleared: engine.clear() }))
  },
}
`

/** Client 半体骨架（UI 已在上方 IIFE 中就绪）。 */
const CLIENT_SKELETON = `
return {
  inject: ['timer'],
  apply(ctx) {
    styles.insert(UI.css)
    const slots = ctx.get('slots')
    if (slots === undefined) return
    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'bushang-yigua', order: 1000, label: '卜上一卦' },
      (props) => React.createElement(UI.FortuneWidget, { ctx, overlayProps: props }),
    ))
  },
}
`

/** 生成 host 代码（完整函数体）。 */
export function buildHostCode() {
  const core = concatSources(CORE_FILES)
  const coreHeader = [
    'createDivineEngine',
    'castHexagram',
    'createRng',
    'defaultRng',
    'tossBit',
    'classifyRelation',
    'relationZh',
    'trigramView',
    'trigramByBits',
    'FORTUNE_BY_RELATION',
    'FORTUNE_GRADES',
    'GRADE_LABEL',
  ]
  const iife = `const Core = (() => {\n${core}\nreturn { ${coreHeader.join(', ')} }\n})()`
  return `${iife}\n\n${HOST_SKELETON.trim()}\n`
}

/** 生成 client 代码（完整函数体）。 */
export function buildClientCode() {
  const ui = concatSources(UI_FILES)
  const iife = `const UI = (() => {\n${ui}\nreturn { css: FORTUNE_CSS, FortuneWidget, reduce, INITIAL_STATE, REASON_LABEL, ELEMENT_ZH }\n})()`
  return `${iife}\n\n${CLIENT_SKELETON.trim()}\n`
}

/** 主流程：生成并写出 dist/plugin/*.code.js。 */
export function main() {
  mkdirSync(dist, { recursive: true })
  const hostCode = buildHostCode()
  const clientCode = buildClientCode()
  writeFileSync(join(dist, 'host.code.js'), hostCode, 'utf8')
  writeFileSync(join(dist, 'client.code.js'), clientCode, 'utf8')
  console.log(`[bundle] wrote dist/plugin/host.code.js (${hostCode.length} chars)`)
  console.log(`[bundle] wrote dist/plugin/client.code.js (${clientCode.length} chars)`)
  return { hostCode, clientCode }
}

// 直接执行时运行主流程
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) main()
