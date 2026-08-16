/**
 * 组件 SSR 冒烟测试：用真实 React 18 渲染悬浮部件，验证初始渲染与结果分页
 * 均不崩溃且产出预期结构（自动/手动两种触发模式）。
 *
 * 依赖 node_modules junction → npx 缓存中的 react / react-dom（离线可用）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToString } from 'react-dom/server'
import { FortuneWidget, FortuneView, ELEMENT_ZH } from '../src/ui/widget.js'
import { INITIAL_STATE, reduce } from '../src/ui/state.js'
import { elementZh } from '../src/core/elements.js'

test('手动模式：无 useSessions 时渲染徽章浮钮', () => {
  const element = React.createElement(FortuneWidget, { ctx: {}, overlayProps: {} })
  const html = renderToString(element)
  assert.ok(html.includes('byg-badge'), '应渲染 byg-badge')
  assert.ok(html.includes('☯'), '应渲染卦符图标')
  assert.ok(!html.includes('byg-card'), '初始收起态不应渲染卡片')
})

test('自动模式：订阅会话快照并渲染徽章', () => {
  const useSessions = (selector) =>
    selector({ current: 's1', byId: { s1: { running: false } } })
  const element = React.createElement(FortuneWidget, {
    ctx: {},
    overlayProps: { useSessions },
  })
  const html = renderToString(element)
  assert.ok(html.includes('byg-badge'))
})

test('自动模式：任务运行中的快照同样能渲染（起卦只发生在 effect 中）', () => {
  const useSessions = (selector) => selector({ current: 's1', byId: { s1: { running: true } } })
  const element = React.createElement(FortuneWidget, {
    ctx: {},
    overlayProps: { useSessions },
  })
  const html = renderToString(element)
  assert.ok(html.includes('byg-badge'))
})

test('完整流程渲染：结果阶段卡片包含本卦/变卦与吉凶判词', () => {
  let state = reduce(INITIAL_STATE, { type: 'trigger', reason: 'task-start' })
  state = reduce(state, { type: 'changing' })
  state = reduce(state, {
    type: 'settle',
    result: {
      lines: [1, 0, 1, 0, 1, 1],
      faces: ['front', 'back', 'front', 'back', 'front', 'front'],
      raw: 999666,
      changingLine: 2,
      changingTrigram: 'lower',
      lower: { bits: [1, 0, 1], faces: ['front', 'back', 'front'], trigram: {} },
      upper: { bits: [0, 1, 1], faces: ['back', 'front', 'front'], trigram: {} },
      base: { key: 'li', zh: '离', symbol: '☲', element: 'fire', nature: '火', lines: [1, 0, 1] },
      changed: { key: 'qian', zh: '乾', symbol: '☰', element: 'metal', nature: '天', lines: [1, 1, 1] },
      relation: 'begin-restrains-end',
      relationZh: '开始克结果',
      fortune: {
        grade: 'zhong-ping',
        level: '中平',
        chance: '40%–60%',
        verdict: '事可成',
        verse: '势均相克，事可成而需加力。',
        tone: 'neutral',
      },
    },
  })

  const element = React.createElement(FortuneView, {
    state,
    onManual: () => {},
    onClose: () => {},
  })
  const html = renderToString(element)
  assert.ok(html.includes('byg-card'), '结果阶段应渲染卡片')
  assert.ok(html.includes('本卦'), '应渲染本卦标签')
  assert.ok(html.includes('变卦'), '应渲染变卦标签')
  assert.ok(html.includes('离') && html.includes('乾'), '八卦应使用汉字标识')
  assert.ok(!html.includes('☲') && !html.includes('☰'), '不应再渲染 Unicode 卦符')
  assert.ok(html.includes('火') && html.includes('金'), '五行应使用汉字标识')
  assert.ok(html.includes('中平'), '应渲染吉凶等级')
  assert.ok(html.includes('事可成'), '应渲染判词')
  assert.ok(html.includes('开始克结果'), '应渲染五行关系')
  assert.ok(!html.includes('byg-hex-tag') && !html.includes('byg-hex-pos'), '六爻区不应有文本标注（仅背景色）')
  // 六爻从下到上：第 1 爻(下卦/浅黄)在最下、第 6 爻(上卦/浅灰)在最上
  const row1 = html.indexOf('byg-hex-row')
  assert.ok(html.indexOf('data-position="lower"') > row1, '存在下卦行背景')
  assert.ok(html.includes('data-position="upper"'), '存在上卦行背景')
  assert.ok(html.includes('data-changing="true"'), '存在变爻行（蓝色背景标识）')
})

test('五行汉字：UI 展示表与核心数据表完全一致（单一事实来源）', () => {
  for (const [element, zh] of Object.entries(ELEMENT_ZH)) {
    assert.equal(elementZh(element), zh, `${element} 应映射为 ${zh}`)
  }
  assert.equal(Object.keys(ELEMENT_ZH).length, 5)
})
