/**
 * 随机性验证：每一个爻（阴/阳）必须完全随机 ——
 *  1) 每一爻位出现阳爻的概率 ≈ 50%（无爻位偏差）；
 *  2) 相邻爻之间无显著相关（无模式化生成）；
 *  3) 默认随机路径（Math.random，即浏览器实际使用的运行时路径）同样成立。
 *
 * 统计使用大样本 + 宽松容差，避免偶发误报（flaky）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { castHexagram } from '../src/core/hexagram.js'
import { createRng } from '../src/core/leaves.js'

/** 批量统计每爻阳爻比例与相邻爻自相关。 */
function collectStats(count, rngFactory) {
  const yangCount = [0, 0, 0, 0, 0, 0]
  let sameAsNext = 0 // 相邻爻相同次数
  let adjacentPairs = 0
  for (let i = 0; i < count; i += 1) {
    const record = castHexagram({ rng: rngFactory() })
    for (let line = 0; line < 6; line += 1) {
      if (record.lines[line] === 1) yangCount[line] += 1
      if (line < 5) {
        adjacentPairs += 1
        if (record.lines[line] === record.lines[line + 1]) sameAsNext += 1
      }
    }
  }
  return { yangCount, sameAsNext, adjacentPairs, total: count }
}

const SAMPLE = 8000

test('每一爻阳概率≈50%（7000 卦默认 Math.random 路径）', () => {
  const stats = collectStats(SAMPLE, () => undefined) // 不注入 rng → 使用 Math.random
  for (let line = 0; line < 6; line += 1) {
    const ratio = stats.yangCount[line] / stats.total
    assert.ok(
      ratio > 0.45 && ratio < 0.55,
      `第 ${line + 1} 爻阳比例 ${(ratio * 100).toFixed(1)}% 超出 45%~55%`,
    )
  }
})

test('相邻爻无显著相关：相同率≈50%（完全随机则相邻独立）', () => {
  const stats = collectStats(SAMPLE, () => undefined)
  const sameRatio = stats.sameAsNext / stats.adjacentPairs
  assert.ok(
    sameRatio > 0.45 && sameRatio < 0.55,
    `相邻爻相同率 ${(sameRatio * 100).toFixed(1)}% 异常（应接近 50%）`,
  )
})

test('种子化 PRNG 路径同样无爻位偏差（确定性可复现）', () => {
  const yangCount = [0, 0, 0, 0, 0, 0]
  const rng = createRng(20260601)
  for (let i = 0; i < 4000; i += 1) {
    const record = castHexagram({ rng })
    for (let line = 0; line < 6; line += 1) {
      if (record.lines[line] === 1) yangCount[line] += 1
    }
  }
  for (let line = 0; line < 6; line += 1) {
    const ratio = yangCount[line] / 4000
    assert.ok(ratio > 0.45 && ratio < 0.55, `第 ${line + 1} 爻阳比例 ${(ratio * 100).toFixed(1)}%`)
  }
})

test('同一种子两次全量结果一致（确定性）但不同种子结果不同（随机性）', () => {
  const a1 = castHexagram({ rng: createRng(1) })
  const a2 = castHexagram({ rng: createRng(1) })
  const b = castHexagram({ rng: createRng(2) })
  assert.deepEqual(a1, a2)
  // 用六爻 + 天机数组成的指纹比较：碰撞概率 ~ 1/2^20，几乎不可能 flake
  const fingerprint = (record) => record.lines.join('') + '/' + record.raw
  assert.notEqual(fingerprint(a1), fingerprint(b), '不同种子应产生不同的卦象')
})
