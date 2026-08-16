/**
 * 批算子线程入口（worker_threads）。
 *
 * 每个 worker 使用独立的种子化 RNG 并行起卦，互不共享状态（线程安全来源：
 * 核心为纯函数 + 每线程独立随机源），把紧凑结果 postMessage 回主线程。
 */

import { parentPort, workerData } from 'node:worker_threads'
import { castHexagram } from '../core/hexagram.js'
import { createRng } from '../core/leaves.js'

function main() {
  const { seed, count, prefix } = workerData
  const rng = createRng(seed)
  const results = []
  for (let i = 0; i < count; i += 1) {
    const cast = castHexagram({ rng })
    results.push({
      index: prefix + i,
      raw: cast.raw,
      mod: cast.mod,
      changingLine: cast.changingLine,
      changingTrigram: cast.changingTrigram,
      baseKey: cast.base.key,
      changedKey: cast.changed.key,
      baseElement: cast.base.element,
      changedElement: cast.changed.element,
      relation: cast.relation,
      grade: cast.fortune.grade,
    })
  }
  parentPort.postMessage({ results })
}

main()
