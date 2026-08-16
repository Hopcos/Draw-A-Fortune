import { test } from 'node:test'
import assert from 'node:assert/strict'

import { divineBatch } from '../src/engine/batch-engine.js'
import { FORTUNE_GRADES } from '../src/core/fortune.js'

test('多线程批算：120 卦分 3 线程，结果数量与等级分布正确', async () => {
  const report = await divineBatch({ count: 120, workers: 3, seed: 99 })
  assert.equal(report.total, 120)
  assert.equal(report.workers, 3)
  assert.ok(report.elapsedMs >= 0)
  assert.ok(report.first && report.last)

  const sum = Object.values(report.histogram).reduce((a, b) => a + b, 0)
  assert.equal(sum, 120)
  for (const grade of FORTUNE_GRADES) {
    assert.ok(report.histogram[grade] >= 0)
  }

  const changingSum = Object.values(report.changingLines).reduce((a, b) => a + b, 0)
  assert.equal(changingSum, 120)
})

test('多线程批算：动爻分布均匀（六爻各约 1/6，允许 ±40% 容差）', async () => {
  const report = await divineBatch({ count: 6000, workers: 6, seed: 2024 })
  const expected = report.total / 6
  for (const [line, count] of Object.entries(report.changingLines)) {
    assert.ok(
      count > expected * 0.6 && count < expected * 1.4,
      `第 ${line} 爻出现 ${count} 次，期望约 ${expected}`,
    )
  }
})

test('多线程批算：881 卦 1 线程边界可用', async () => {
  const report = await divineBatch({ count: 881, workers: 1, seed: 7 })
  assert.equal(report.total, 881)
  assert.equal(report.workers, 1)
})

test('多线程批算：参数防护（非法输入取默认值）', async () => {
  const report = await divineBatch({ count: 0, workers: 0, seed: 'x' })
  assert.equal(report.total, 1)
  assert.equal(report.workers, 1)
})
