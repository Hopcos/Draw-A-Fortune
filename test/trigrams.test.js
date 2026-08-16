import { test } from 'node:test'
import assert from 'node:assert/strict'

import { TRIGRAM_DEFS, TRIGRAM_COUNT, trigramByBits, trigramKeyOf, trigramView } from '../src/core/trigrams.js'
import { FIVE_ELEMENTS } from '../src/core/elements.js'

const BIT_PATTERNS = [
  [1, 1, 1],
  [0, 0, 0],
  [1, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 0],
]

test('八卦表：8 卦、键唯一、爻位合法、五行合法', () => {
  assert.equal(TRIGRAM_COUNT, 8)
  assert.equal(TRIGRAM_DEFS.length, 8)
  const keys = new Set()
  const zhNames = new Set()
  for (const def of TRIGRAM_DEFS) {
    assert.equal(def.lines.length, 3)
    assert.ok(def.lines.every((bit) => bit === 0 || bit === 1))
    assert.ok(FIVE_ELEMENTS.some((e) => e.id === def.element), `五行必须合法: ${def.code}`)
    assert.equal(keys.has(def.key), false)
    assert.equal(zhNames.has(def.zh), false)
    keys.add(def.key)
    zhNames.add(def.zh)
  }
})

test('任意三爻模式都能唯一定位一卦（8 种模式全覆盖）', () => {
  const seen = new Set()
  for (const bits of BIT_PATTERNS) {
    const def = trigramByBits(bits)
    assert.ok(def, `模式 ${bits.join('')} 应能查到卦`)
    assert.deepEqual(def.lines, bits)
    seen.add(trigramKeyOf(bits))
  }
  assert.equal(seen.size, 8)
})

test('三爻模式的 8 种排列与表一一对应（广度验证：翻转任意单爻仍是合法卦）', () => {
  for (const bits of BIT_PATTERNS) {
    for (let i = 0; i < 3; i += 1) {
      const flipped = bits.slice()
      flipped[i] = 1 - flipped[i]
      const def = trigramByBits(flipped)
      assert.ok(def, `翻转 ${bits.join('')}[${i}] → ${flipped.join('')} 应仍是卦`)
      assert.notDeepEqual(flipped, bits, '单爻翻转后模式必然改变')
    }
  }
})

test('先天互补对：乾坤 / 震巽 / 坎离 / 艮兑', () => {
  const def = (key) => TRIGRAM_DEFS.find((d) => d.key === key)
  assert.deepEqual(def('qian').lines.map((b) => 1 - b), def('kun').lines)
  assert.deepEqual(def('zhen').lines.map((b) => 1 - b), def('xun').lines)
  assert.deepEqual(def('kan').lines.map((b) => 1 - b), def('li').lines)
  assert.deepEqual(def('gen').lines.map((b) => 1 - b), def('dui').lines)
})

test('trigramView 返回全新副本（防止调用方串改数据表）', () => {
  const view = trigramView(TRIGRAM_DEFS[0])
  view.lines[0] = 9
  view.key = 'hacked'
  assert.equal(TRIGRAM_DEFS[0].key, 'qian')
  assert.deepEqual(TRIGRAM_DEFS[0].lines, [1, 1, 1])
  assert.equal(trigramView(undefined), undefined)
})
