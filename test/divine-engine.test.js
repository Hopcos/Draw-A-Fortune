import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createDivineEngine, DEFAULT_CAP } from '../src/engine/divine-engine.js'
import { createRng } from '../src/core/leaves.js'

test('异步起卦：返回 JSON 安全的完整记录', async () => {
  const engine = createDivineEngine({ rng: createRng(11) })
  const record = await engine.divine({ reason: 'manual', sessionId: 's-1' })
  assert.equal(record.id, 'cast-1')
  assert.equal(record.reason, 'manual')
  assert.equal(record.sessionId, 's-1')
  assert.ok(Number.isFinite(record.castAt))
  assert.equal(record.lines.length, 6)
  assert.ok(record.changingLine >= 1 && record.changingLine <= 6)
  assert.ok(record.fortune.level)
  // JSON 往返无损（证明记录可安全跨越包间 RPC）
  const roundTrip = JSON.parse(JSON.stringify(record))
  assert.deepEqual(roundTrip, record)
  engine.dispose()
})

test('并发起卦：Promise.all 并发 30 次全部成功（异步/并发能力）', async () => {
  const engine = createDivineEngine({ rng: createRng(42) })
  const records = await Promise.all(
    Array.from({ length: 30 }, (_, index) => engine.divine({ reason: 'task-start', sessionId: 's-' + index })),
  )
  assert.equal(records.length, 30)
  const ids = new Set(records.map((r) => r.id))
  assert.equal(ids.size, 30, 'id 必须唯一')
  assert.equal(engine.size(), 30)
})

test('仓库有界：超过容量时淘汰最旧记录（FIFO）', async () => {
  const engine = createDivineEngine({ rng: createRng(5), cap: 3 })
  for (let i = 0; i < 5; i += 1) await engine.divine({ reason: 'manual' })
  assert.equal(engine.size(), 3)
  const list = engine.list({ limit: 10 })
  assert.deepEqual(list.map((r) => r.id), ['cast-3', 'cast-4', 'cast-5'])
  engine.dispose()
})

test('查询 / 删除 / 清空（数据扩展点）', async () => {
  const engine = createDivineEngine({ rng: createRng(9) })
  await engine.divine({})
  await engine.divine({})
  await engine.divine({})

  assert.equal(engine.list({ limit: 2 }).length, 2)
  assert.equal(engine.list({ limit: 0 }).length, 0)
  assert.equal(engine.list({ limit: -5 }).length, 0)

  const removed = engine.remove('cast-2')
  assert.equal(removed, true)
  assert.equal(engine.remove('cast-999'), false)
  assert.ok(!engine.list({}).some((r) => r.id === 'cast-2'))

  assert.equal(engine.clear(), 2)
  assert.equal(engine.size(), 0)
  engine.dispose()
})

test('默认容量与空参数外包', async () => {
  const engine = createDivineEngine()
  assert.equal(DEFAULT_CAP, 64)
  const record = await engine.divine()
  assert.equal(record.reason, 'manual')
  assert.equal(record.sessionId, undefined)
  engine.dispose()
})
