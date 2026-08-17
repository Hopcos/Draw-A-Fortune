import { test } from 'node:test'
import assert from 'node:assert/strict'

import { INITIAL_STATE, reduce, REASON_LABEL } from '../src/ui/state.js'

test('初始状态为 badge（收起浮钮）', () => {
  assert.equal(INITIAL_STATE.phase, 'badge')
  assert.equal(INITIAL_STATE.revealed, 0)
  assert.equal(INITIAL_STATE.result, null)
})

test('trigger：进入 casting，清空旧结果，generation 递增', () => {
  let state = reduce(INITIAL_STATE, { type: 'trigger', reason: 'page-load' })
  assert.equal(state.phase, 'casting')
  assert.equal(state.reason, 'page-load')
  assert.equal(state.revealed, 0)
  assert.equal(state.generation, 1)
  state = reduce(state, { type: 'settle', result: { id: 'cast-1' } })
  state = reduce(state, { type: 'trigger', reason: 'task-start' })
  assert.equal(state.phase, 'casting')
  assert.equal(state.result, null)
  assert.equal(state.generation, 2)
})

test('reveal：逐片揭晓且不回落', () => {
  let state = reduce(INITIAL_STATE, { type: 'trigger' })
  state = reduce(state, { type: 'reveal', index: 0 })
  assert.equal(state.revealed, 1)
  state = reduce(state, { type: 'reveal', index: 2 })
  assert.equal(state.revealed, 3)
  state = reduce(state, { type: 'reveal', index: 0 }) // 旧事件不影响进度
  assert.equal(state.revealed, 3)
  state = reduce(state, { type: 'reveal', index: 5 })
  assert.equal(state.revealed, 6)
})

test('settle / fail / collapse / dismiss 状态转换', () => {
  let state = reduce(INITIAL_STATE, { type: 'trigger' })
  state = reduce(state, { type: 'changing' })
  assert.equal(state.changingShown, true)
  state = reduce(state, { type: 'settle', result: { id: 'cast-9' } })
  assert.equal(state.phase, 'result')
  assert.equal(state.revealed, 6)
  assert.equal(state.result.id, 'cast-9')

  state = reduce(state, { type: 'collapse' })
  assert.equal(state.phase, 'badge')

  state = reduce(state, { type: 'trigger' })
  state = reduce(state, { type: 'fail', message: 'boom' })
  assert.equal(state.phase, 'badge')
  assert.equal(state.error, 'boom')
  state = reduce(state, { type: 'dismiss' })
  assert.equal(state.error, null)
})

test('restore：折叠后还原上次结果；无结果时保持原样', () => {
  // 有结果时：collapse → restore 回到 result 且保留结果
  let state = reduce(INITIAL_STATE, { type: 'trigger' })
  state = reduce(state, { type: 'settle', result: { id: 'cast-7' } })
  state = reduce(state, { type: 'collapse' })
  assert.equal(state.phase, 'badge')
  assert.equal(state.result.id, 'cast-7')

  state = reduce(state, { type: 'restore' })
  assert.equal(state.phase, 'result')
  assert.equal(state.result.id, 'cast-7')

  // 无结果时：restore 不改变 phase（仍为 badge）
  const badge = reduce(INITIAL_STATE, { type: 'restore' })
  assert.equal(badge.phase, 'badge')
  assert.equal(badge.result, null)
})

test('未知 action 原样返回', () => {
  assert.equal(reduce(INITIAL_STATE, { type: 'nope' }), INITIAL_STATE)
})

test('触发原因标签齐全', () => {
  assert.equal(REASON_LABEL['page-load'], '页面加载')
  assert.equal(REASON_LABEL['task-start'], '任务发起')
  assert.equal(REASON_LABEL['manual'], '手动起卦')
})
