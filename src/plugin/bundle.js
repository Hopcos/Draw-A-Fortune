/**
 * 插件打包器（Bundler）—— 单一事实来源（Single Source of Truth）。
 *
 * 把 src/core + src/engine + src/ui 的模块化源码，经过极简拼接变换，
 * 生成 dist/plugin/ 下的两套产物：
 *
 *  A. 静态 DSH 模块（推荐，随 profile 启动自动加载）：
 *     - package.json  模块清单（dsh.client 声明 + exports["./client"]）
 *     - index.js      Node 半体（空 apply，仅让插件出现在 host Loader）
 *     - client.js     浏览器半体（window.__ModuleLoader__.load + 本地起卦引擎 + UI）
 *
 *  B. 动态 Cordis 插件（旧，供 cordis_define / cordis_run）：
 *     - host.code.js   自包含 Host 函数体（harness.handle RPC）
 *     - client.code.js 自包含 Client 函数体（styles.insert + host.call）
 *
 * 两套产物共享同一份 core/ui 源码：差异只在骨架（skeleton）——
 * 动态骨架注入「ctx.timeout + host.call」运行时，静态骨架注入「setTimeout + 本地
 * castHexagram」运行时，UI 组件本身通过 runtime 依赖注入做到运行时无关。
 *
 * 变换规则：
 *   - 逐行剥除 import 语句（模块被拼接进同一作用域，函数提升 + 惰性表查询保证顺序无关）；
 *   - 剥除顶层 `export ` 前缀（声明仍在同一作用域中）；
 *   - Core 暴露工厂与查询函数；UI 暴露 CSS 与组件。
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

/** Core 暴露给骨架的符号表（host 与静态 client 共用）。 */
const CORE_HEADER = [
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

/** UI 暴露给骨架的符号表（动态 client 与静态 client 共用）。 */
const UI_HEADER = ['css: FORTUNE_CSS', 'FortuneWidget', 'reduce', 'INITIAL_STATE', 'REASON_LABEL', 'ELEMENT_ZH']

/** 生成 Core IIFE 文本（`const Core = (() => {...})()`）。 */
function buildCoreIife() {
  const core = concatSources(CORE_FILES)
  return `const Core = (() => {\n${core}\nreturn { ${CORE_HEADER.join(', ')} }\n})()`
}

/** 生成 UI IIFE 文本（`const UI = (() => {...})()`）。 */
function buildUiIife() {
  const ui = concatSources(UI_FILES)
  return `const UI = (() => {\n${ui}\nreturn { ${UI_HEADER.join(', ')} }\n})()`
}

/** 动态 Host 半体骨架（Core 已在上方 IIFE 中就绪）。 */
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

/**
 * 动态 Client 半体骨架（UI 已在上方 IIFE 中就绪）。
 * 动态插件沙箱不提供浏览器定时器全局，运行时用 ctx.timeout；起卦走 host.call RPC。
 */
const CLIENT_SKELETON = `
return {
  inject: ['timer'],
  apply(ctx) {
    styles.insert(UI.css)
    const slots = ctx.get('slots')
    if (slots === undefined) return
    const runtime = {
      delay: (ms) => ctx.timeout(ms),
      divine: (reason, sessionId) => {
        const args = { reason }
        if (sessionId !== undefined) args.sessionId = sessionId
        return host.call('divine', args)
      },
    }
    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'bushang-yigua', order: 1000, label: '卜上一卦' },
      (props) => React.createElement(UI.FortuneWidget, { ...props, runtime }),
    ))
  },
}
`

/** 静态 client 的开头（window.__ModuleLoader__.load 包装 + require("react")）。 */
const STATIC_CLIENT_HEADER = `window.__ModuleLoader__.load({
  id: "bushang-yigua",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
`

/** 静态 client 的结尾（CSS 注入 + 本地引擎运行时 + 槽位注册 + 导出）。 */
const STATIC_CLIENT_FOOTER = `
    // 样式注入（静态模块用 DOM 直接注入，附 plugin 标签供模块系统记账）
    const CSS_TAG_ID = "bushang-yigua/fortune.css"
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]") === null) {
      const tag = document.createElement("style")
      tag.dataset.plugin = "bushang-yigua"
      tag.dataset.pluginCss = CSS_TAG_ID
      tag.textContent = UI.css
      document.head.appendChild(tag)
    }

    // 静态运行时：本地起卦引擎 + 原生计时器
    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
    const runtime = {
      delay,
      divine: async (reason, sessionId) => Core.castHexagram({}),
    }

    const inject = ["slots"]
    function apply(ctx) {
      ctx.slots.inject("shell.overlay", () => ctx.slots.register(
        { name: "shell.overlay", id: "bushang-yigua", order: 1000, label: "卜上一卦" },
        (props) => React.createElement(UI.FortuneWidget, { ...props, runtime }),
      ))
    }
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
});
`

/** 生成动态 host 代码（完整函数体）。 */
export function buildHostCode() {
  return `${buildCoreIife()}\n\n${HOST_SKELETON.trim()}\n`
}

/** 生成动态 client 代码（完整函数体）。 */
export function buildClientCode() {
  return `${buildUiIife()}\n\n${CLIENT_SKELETON.trim()}\n`
}

/** 生成静态 client 代码（完整脚本，window.__ModuleLoader__.load 格式）。 */
export function buildStaticClientCode() {
  return `${STATIC_CLIENT_HEADER}\n${buildCoreIife()}\n${buildUiIife()}\n${STATIC_CLIENT_FOOTER.trim()}\n`
}

/** 生成静态模块的 Node 半体（index.js）。 */
export function buildIndexCode() {
  return `/**
 * 卜上一卦（bushang-yigua）静态 DSH 模块 —— Node 半体。
 * 纯 UI 插件：空 apply 仅为了让插件出现在 host cordis.yml / Loader 中；
 * 浏览器半体通过 exports["./client"] 提供，由 package.json 的 dsh.client 声明发现。
 */
function apply() {}
export { apply };
`
}

/** 生成静态模块清单（package.json）。 */
export function buildPackageJson() {
  return JSON.stringify({
    name: 'bushang-yigua',
    version: '1.0.0',
    private: true,
    type: 'module',
    main: 'index.js',
    exports: {
      '.': './index.js',
      './client': './client.js',
      './package.json': './package.json',
    },
    dsh: {
      client: {
        platform: 'web',
      },
    },
    dependencies: {
      react: '^18.2.0',
    },
  }, null, 2) + '\n'
}

/** 主流程：生成并写出 dist/plugin/ 全部产物。 */
export function main() {
  mkdirSync(dist, { recursive: true })
  const hostCode = buildHostCode()
  const clientCode = buildClientCode()
  const staticClientCode = buildStaticClientCode()
  const indexCode = buildIndexCode()
  const packageJson = buildPackageJson()
  writeFileSync(join(dist, 'host.code.js'), hostCode, 'utf8')
  writeFileSync(join(dist, 'client.code.js'), clientCode, 'utf8')
  writeFileSync(join(dist, 'client.js'), staticClientCode, 'utf8')
  writeFileSync(join(dist, 'index.js'), indexCode, 'utf8')
  writeFileSync(join(dist, 'package.json'), packageJson, 'utf8')
  console.log(`[bundle] wrote dist/plugin/package.json (${packageJson.length} chars)`)
  console.log(`[bundle] wrote dist/plugin/index.js (${indexCode.length} chars)`)
  console.log(`[bundle] wrote dist/plugin/client.js (${staticClientCode.length} chars)`)
  console.log(`[bundle] wrote dist/plugin/host.code.js (${hostCode.length} chars)`)
  console.log(`[bundle] wrote dist/plugin/client.code.js (${clientCode.length} chars)`)
  return { hostCode, clientCode, staticClientCode, indexCode, packageJson }
}

// 直接执行时运行主流程
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) main()
