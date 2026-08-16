import { test } from 'node:test'
import assert from 'node:assert/strict'

import { castHexagram, RAW_NUMBER_MAX } from '../src/core/hexagram.js'
import { createRng } from '../src/core/leaves.js'

/** 构造可控随机源：依次消费给定序列；耗尽后抛错（防止测试静默少看见）。 */
function sequenceRng(values) {
  let index = 0
  const rng = () => {
    const value = values[index]
    if (value === undefined) throw new Error('rng sequence exhausted')
    index += 1
    return value
  }
  rng.values = values
  return rng
}

/** 把六爻位 + 天机数字重映射为可控随机序列（前 6 次掷叶，第 7 次取天机数）。 */
function rngFor(lines, raw) {
  const values = lines.map((bit) => (bit === 1 ? 0.01 : 0.99))
  values.push(raw / RAW_NUMBER_MAX)
  return sequenceRng(values)
}

test('确定性：同一种子两次起卦结果完全一致', () => {
  const a = castHexagram({ rng: createRng(2024) })
  const b = castHexagram({ rng: createRng(2024) })
  assert.deepEqual(a, b)
})

test('六爻自下而上 = 下卦三位 + 上卦三位，正/反与爻位一致', () => {
  // 构造：下卦 [阳,阴,阳] = 离，上卦 [阴,阳,阳] = 巽
  const rng = rngFor([1, 0, 1, 0, 1, 1], 123456)
  const record = castHexagram({ rng })
  assert.deepEqual(record.lower.bits, [1, 0, 1])
  assert.deepEqual(record.upper.bits, [0, 1, 1])
  assert.deepEqual(record.lines, [1, 0, 1, 0, 1, 1])
  assert.deepEqual(record.faces, ['front', 'back', 'front', 'back', 'front', 'front'])
  assert.deepEqual(record.facesZh, ['正', '反', '正', '反', '正', '正'])
  assert.equal(record.lower.trigram.key, 'li')
  assert.equal(record.upper.trigram.key, 'xun')
})

test('天机数：1~5 代表第几根爻', () => {
  for (let line = 1; line <= 5; line += 1) {
    const raw = line + 6 * 7 // raw % 6 === line
    const record = castHexagram({ rng: rngFor([1, 1, 1, 1, 1, 1], raw) })
    assert.equal(record.raw, raw)
    assert.equal(record.mod, raw % 6)
    assert.equal(record.changingLine, line, `line=${line}`)
    assert.equal(record.changingTrigram, line <= 3 ? 'lower' : 'upper')
  }
})

test('天机数：0 代表最上面的第 6 根爻', () => {
  const raw = 6 * 13 // raw % 6 === 0
  const record = castHexagram({ rng: rngFor([1, 1, 1, 1, 1, 1], raw) })
  assert.equal(record.mod, 0)
  assert.equal(record.changingLine, 6)
  assert.equal(record.changingTrigram, 'upper')
})

test('变爻翻转：动爻位确实反转，其余爻位保持不变', () => {
  // 下卦 [阳,阴,阳](离) + 上卦 [阴,阳,阴](坎)，动第 2 爻（下卦中爻）：阴→阳
  const record = castHexagram({ rng: rngFor([1, 0, 1, 0, 1, 0], 2) })
  assert.equal(record.changingLine, 2)
  assert.equal(record.changingTrigram, 'lower')
  assert.equal(record.base.key, 'li') // 本卦 = 动爻所在的下卦 离
  assert.equal(record.base.lines[1], 0)
  assert.equal(record.changed.lines[1], 1) // 变爻阴→阳
  assert.deepEqual(record.changed.lines, [1, 1, 1])
  assert.equal(record.changed.key, 'qian') // 离 → 乾
  assert.equal(record.relation, 'begin-restrains-end') // 火克金：开始克结果
  assert.equal(record.fortune.grade, 'zhong-ping')
})

test('动爻在上卦：本卦取上卦，变卦为上卦翻转', () => {
  // 上卦 [阴,阴,阳] (艮)，动第 6 爻（上卦顶爻）：阳→阴 → 上卦成 坤
  const record = castHexagram({ rng: rngFor([0, 0, 0, 0, 0, 1], 6) })
  assert.equal(record.changingLine, 6)
  assert.equal(record.changingTrigram, 'upper')
  assert.equal(record.base.key, 'gen')
  assert.equal(record.changed.key, 'kun')
  assert.equal(record.base.element, 'earth')
  assert.equal(record.changed.element, 'earth')
  assert.equal(record.relation, 'same') // 始终如一
  assert.equal(record.fortune.grade, 'ci-ji')
})

test('吉凶回路随机抽查：六爻均可为阳/阴，动爻位任意，关系必为五类之一', () => {
  const rng = createRng(777)
  const relations = new Set()
  for (let i = 0; i < 200; i += 1) {
    const record = castHexagram({ rng })
    assert.equal(record.lines.length, 6)
    assert.ok(record.changingLine >= 1 && record.changingLine <= 6)
    assert.ok(['lower', 'upper'].includes(record.changingTrigram))
    assert.ok(record.fortune && record.fortune.level)
    assert.ok(record.base && record.changed)
    relations.add(record.relation)
    // 变爻位翻转校验
    const idx = record.changingLine - 1
    const base = record.changingTrigram === 'lower' ? record.lower : record.upper
    const flippedBit = 1 - base.bits[idx % 3]
    assert.equal(record.changed.lines[idx % 3], flippedBit)
  }
  // 200 次抽查应覆盖多种关系（五行分表齐全，理论上全 5 类都可能出现）
  assert.ok(relations.size >= 2, `抽查应至少出现 2 种关系, got ${[...relations]}`)
})

test('默认随机源可用（不注入 rng 时内部使用 Math.random）', () => {
  const record = castHexagram({})
  assert.equal(record.lines.length, 6)
  assert.ok(record.raw >= 0 && record.raw < RAW_NUMBER_MAX)
})
