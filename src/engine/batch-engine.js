/**
 * 多线程批算引擎（Multithreaded Batch Engine）。
 *
 * 用 worker_threads 将起卦任务分片到多条真实线程并行执行（多线程编程/并行计算）。
 * 主线程以 Promise.all 收集各 worker 结果，聚合直方图与统计信息。
 * 异步编程：全部基于 async/await 与 Promise，绝不阻塞事件循环。
 */

import { Worker } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { FORTUNE_GRADES } from '../core/fortune.js'

const WORKER_PATH = join(dirname(fileURLToPath(import.meta.url)), 'batch-worker.js')
const WORKER_TIMEOUT_MS = 60_000
const MAX_WORKERS = 16

/** 启动一个 worker 并等待其单次结果。 */
function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData })
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('batch worker timed out'))
    }, WORKER_TIMEOUT_MS)
    worker.once('message', (message) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(message)
    })
    worker.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    worker.once('exit', (code) => {
      clearTimeout(timer)
      if (code !== 0) reject(new Error(`batch worker exited with code ${code}`))
    })
  })
}

/**
 * 分片批算：把 count 次起卦平均分到 workers 个线程并行执行。
 * @param opts - { count?: number, workers?: number, seed?: number }
 * @returns 统计结果：{ total, workers, elapsedMs, histogram, relationCounts, first, changingLines }
 */
export async function divineBatch(opts = {}) {
  const total = Math.max(1, Math.floor(opts.count ?? 1000))
  const workers = Math.min(Math.max(1, Math.floor(opts.workers ?? 4)), MAX_WORKERS)
  const seedBase = Math.floor(opts.seed ?? 20240101)

  const perWorker = Math.floor(total / workers)
  const remainder = total % workers

  const started = Date.now()

  // 分片规格：主线程计算分片，然后并行启动全部 worker（真实并行）
  const specs = Array.from({ length: workers }, (_, index) => ({
    seed: seedBase + index * 7919, // 每个线程独立的种子
    count: perWorker + (index < remainder ? 1 : 0),
    prefix: index * perWorker + Math.min(index, remainder),
  }))

  const messages = await Promise.all(specs.map(runWorker))
  const all = messages.flatMap((message) => message.results)

  const histogram = Object.fromEntries(FORTUNE_GRADES.map((grade) => [grade, 0]))
  const relationCounts = {}
  const changingLines = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const record of all) {
    histogram[record.grade] += 1
    relationCounts[record.relation] = (relationCounts[record.relation] ?? 0) + 1
    changingLines[record.changingLine] += 1
  }

  return {
    total: all.length,
    workers,
    elapsedMs: Date.now() - started,
    histogram,
    relationCounts,
    changingLines,
    first: all[0] ?? null,
    last: all[all.length - 1] ?? null,
  }
}
