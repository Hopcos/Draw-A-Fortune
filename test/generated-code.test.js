/**
 * 生成代码验证：打包产出（host.code.js / client.code.js）必须
 *  1) 可被 new Function 语法通过（对应宿主/浏览器闭包参数表）；
 *  2) host 半体：apply 注册 4 个 RPC 处理器，divine 返回完整合法卦象；
 *  3) client 半体：注入样式 + 注册 shell.overlay 悬浮槽位。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildHostCode, buildClientCode } from '../src/plugin/bundle.js'

/** 宿主闭包参数表（与 dsh-cordis-host-runner 的沙箱一致）。 */
const HOST_PARAMS = ['ctx', 'harness', 'console', 'btoa', 'atob', 'TextEncoder', 'TextDecoder']

/** 浏览器闭包参数表（与 dsh-cordis-client-runner 的闭包一致）。 */
const CLIENT_PARAMS = [
  'React',
  'console',
  'styles',
  'host',
  'harness',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'fetch',
  'require',
  'process',
  'Buffer',
]

function fakeCtx() {
  const effects = []
  return {
    effects,
    effect(fn) {
      effects.push(fn)
      return () => {}
    },
  }
}

function fakeHarness() {
  const handlers = new Map()
  return {
    handlers,
    handle(method, handler) {
      handlers.set(method, handler)
      return () => handlers.delete(method)
    },
  }
}

function parsePlugin(params, code) {
  const fn = new Function(...params, code)
  return fn
}

test('host 代码可解析并注册四个 RPC 处理器', async () => {
  const code = buildHostCode()
  const ctx = fakeCtx()
  const harness = fakeHarness()
  const plugin = parsePlugin(HOST_PARAMS, code)(
    ctx,
    harness,
    { log: () => {}, error: () => {} },
    (s) => btoa(s),
    (s) => atob(s),
    TextEncoder,
    TextDecoder,
  )
  assert.ok(plugin && typeof plugin.apply === 'function')

  plugin.apply(ctx)
  assert.equal(harness.handlers.size, 4)
  for (const name of ['divine', 'history', 'forget', 'clear']) {
    assert.ok(harness.handlers.has(name), `应有处理器 ${name}`)
  }

  // divine 返回完整合法记录
  const record = await harness.handlers.get('divine')({ reason: 'test', sessionId: 's-x' })
  assert.equal(record.reason, 'test')
  assert.equal(record.sessionId, 's-x')
  assert.equal(record.lines.length, 6)
  assert.ok(record.changingLine >= 1 && record.changingLine <= 6)
  assert.ok(record.base.key && record.changed.key)
  assert.ok(record.fortune.level)

  // history / forget / clear 扩展点可用
  const history = await harness.handlers.get('history')({ limit: 5 })
  assert.ok(Array.isArray(history) && history.length >= 1)
  const removal = await harness.handlers.get('forget')({ id: 'cast-999' })
  assert.deepEqual(removal, { ok: false, reason: undefined })
  const cleared = await harness.handlers.get('clear')()
  assert.ok(cleared.cleared >= 0)
})

test('client 代码可解析：注入样式 + 注册 shell.overlay 槽位', () => {
  const code = buildClientCode()
  let insertedCss = null
  const registers = []
  const slots = {
    inject(key, callback) {
      registers.push({ key, callback })
      return () => {}
    },
    register(options, render) {
      return { options, render }
    },
  }
  const ctx = {
    get(name) {
      return name === 'slots' ? slots : undefined
    },
  }
  const styles = {
    insert(css) {
      insertedCss = css
      return () => {}
    },
  }
  const React = { createElement: (type, props, ...children) => ({ type, props, children }) }

  const plugin = parsePlugin(CLIENT_PARAMS, code)(
    React,
    { log: () => {}, error: () => {} },
    styles,
    { call: async () => null },
    {},
    () => { throw new Error('setTimeout trapped') },
    () => { throw new Error('setInterval trapped') },
    () => { throw new Error('clearTimeout trapped') },
    () => { throw new Error('clearInterval trapped') },
    () => { throw new Error('fetch trapped') },
    () => { throw new Error('require trapped') },
    undefined,
    undefined,
  )
  assert.ok(plugin && typeof plugin.apply === 'function')
  plugin.apply(ctx)

  assert.ok(insertedCss && insertedCss.includes('.byg-root'), '应插入样式表')
  assert.equal(registers.length, 1)
  assert.equal(registers[0].key, 'shell.overlay')

  // 调用注册回调，验证生成的注册对象
  const registered = registers[0].callback()
  assert.equal(registered.options.name, 'shell.overlay')
  assert.equal(registered.options.id, 'bushang-yigua')
  assert.equal(typeof registered.render, 'function')

  // 用最小 props 调用 render，应返回 FortuneWidget 的 React 元素描述
  // （组件内部的徽章分支由真实 React 的 SSR 冒烟测试覆盖）
  const element = registered.render({ useSessions: undefined })
  assert.equal(typeof element.type, 'function', '顶层应为组件类型')
  assert.ok(element.props.overlayProps !== undefined)
  assert.ok(element.props.ctx !== undefined)
})

test('client 代码中禁用的浏览器全局不可用（setTimeout 等已陷阱化）', () => {
  // 确认生成代码没有引用被陷阱化的全局
  const code = buildClientCode()
  for (const banned of ['setTimeout(', 'setInterval(', 'fetch(', 'window.', 'document.']) {
    assert.ok(!code.includes(banned), `生成代码不应引用 ${banned}`)
  }
})
