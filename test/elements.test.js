import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  FIVE_ELEMENTS,
  GENERATES,
  RESTRAINS,
  generates,
  restrains,
  classifyRelation,
  relationZh,
  isElement,
} from '../src/core/elements.js'

test('五行表完整且自洽', () => {
  assert.equal(FIVE_ELEMENTS.length, 5)
  const ids = FIVE_ELEMENTS.map((e) => e.id)
  for (const id of ids) {
    assert.equal(isElement(id), true)
    assert.ok(generates(id, GENERATES[id]), `${id} 应相生 ${GENERATES[id]}`)
    assert.ok(restrains(id, RESTRAINS[id]), `${id} 应相克 ${RESTRAINS[id]}`)
    assert.notEqual(GENERATES[id], id, '不存在自生')
    assert.notEqual(RESTRAINS[id], id, '不存在自克')
    assert.notEqual(GENERATES[id], RESTRAINS[id], '相生相克目标不同')
  }
})

test('相生环：木→火→土→金→水→木 闭环', () => {
  let current = 'wood'
  const visited = []
  for (let i = 0; i < 5; i += 1) {
    visited.push(current)
    current = GENERATES[current]
  }
  assert.deepEqual(visited, ['wood', 'fire', 'earth', 'metal', 'water'])
  assert.equal(current, 'wood')
})

test('相克环：木→土→水→火→金→木 闭环', () => {
  let current = 'wood'
  const visited = []
  for (let i = 0; i < 5; i += 1) {
    visited.push(current)
    current = RESTRAINS[current]
  }
  assert.deepEqual(visited, ['wood', 'earth', 'water', 'fire', 'metal'])
  assert.equal(current, 'wood')
})

test('五行关系分类：25 个有序对恰好落入 5 类且每类 5 个', () => {
  const counter = {}
  for (const begin of FIVE_ELEMENTS) {
    for (const end of FIVE_ELEMENTS) {
      const relation = classifyRelation(begin.id, end.id)
      counter[relation] = (counter[relation] ?? 0) + 1
    }
  }
  const expected = {
    same: 5,
    'begin-generates-end': 5,
    'end-generates-begin': 5,
    'begin-restrains-end': 5,
    'end-restrains-begin': 5,
  }
  assert.deepEqual(counter, expected)
})

test('关键关系判定（需求表一一对应）', () => {
  // 结果生开始 → 大吉（本卦为木、变卦为水：水生木）
  assert.equal(classifyRelation('wood', 'water'), 'end-generates-begin')
  // 始终如一（五行相同）
  assert.equal(classifyRelation('metal', 'metal'), 'same')
  // 开始克结果 → 中平（本卦为金、变卦为木：金克木）
  assert.equal(classifyRelation('metal', 'wood'), 'begin-restrains-end')
  // 开始生结果 → 小凶（本卦为火、变卦为土：火生土）
  assert.equal(classifyRelation('fire', 'earth'), 'begin-generates-end')
  // 结果克开始 → 大凶（本卦为水、变卦为土：土克水）
  assert.equal(classifyRelation('water', 'earth'), 'end-restrains-begin')
})

test('关系中文标签存在', () => {
  for (const r of ['same', 'begin-generates-end', 'end-generates-begin', 'begin-restrains-end', 'end-restrains-begin']) {
    assert.ok(relationZh(r).length > 0)
  }
})
