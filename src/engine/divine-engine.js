/**
 * 起卦引擎（Divine Engine）：异步门面 + 卦象记录仓库。
 *
 * 异步编程：divine() 为 async，在真实微任务边界上让出事件循环（非阻塞）。
 * 设计模式：
 *  - 仓库（Repository）：内存中的卦象记录存储（有界 FIFO），对后续「写入/删除数据」
 *    扩展点开放 —— remove/clear/list 已经实现，未来可平滑替换为持久化后端。
 *  - 门面（Facade）：createDivineEngine 工厂注入依赖（rng 策略、容量、日志）。
 *
 * 线程安全：核心计算为纯函数，引擎自身为单实例可变状态；跨线程使用时仅需
 * 每线程独立引擎实例（见 batch-engine）。
 */

import { castHexagram } from '../core/hexagram.js'
import { defaultRng } from '../core/leaves.js'

/** 记录仓库默认容量。 */
export const DEFAULT_CAP = 64

/** JSON 安全的深拷贝（仅用于我们自有的纯 JSON 记录）。 */
function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

/**
 * 创建起卦引擎（依赖注入）。
 * @param opts - { rng?: () => number, cap?: number, log?: (msg: string) => void }
 */
export function createDivineEngine(opts = {}) {
  const rng = typeof opts.rng === 'function' ? opts.rng : defaultRng
  const cap = Number.isFinite(opts.cap) ? Math.max(1, Math.floor(opts.cap)) : DEFAULT_CAP
  const log = typeof opts.log === 'function' ? opts.log : () => {}
  let counter = 0
  const records = [] // 有界 FIFO 仓库

  function append(record) {
    records.push(record)
    if (records.length > cap) records.splice(0, records.length - cap)
  }

  return {
    /** 当前仓库记录数。 */
    size() {
      return records.length
    },

    /**
     * 起一卦并归档。
     * @param opts - { reason?: string, sessionId?: string }
     * @returns 卦象记录（JSON 安全、含 id / castAt / reason / sessionId）
     */
    async divine(opts = {}) {
      // 真正的异步边界：让出事件循环（微任务），绝不阻塞调用方。
      await Promise.resolve()
      counter += 1
      const reason = typeof opts.reason === 'string' ? opts.reason : 'manual'
      const sessionId = typeof opts.sessionId === 'string' ? opts.sessionId : undefined
      const cast = castHexagram({ rng })
      const record = {
        id: `cast-${counter}`,
        castAt: Date.now(),
        reason,
        sessionId,
        ...cast,
      }
      append(record)
      return cloneJson(record)
    },

    /**
     * 查询最近的卦象记录（查询模式）。
     * @param opts - { limit?: number } 返回最近 N 条
     */
    list(opts = {}) {
      const limit = Number.isFinite(opts.limit) ? Math.max(0, Math.floor(opts.limit)) : DEFAULT_CAP
      // 注意 slice(-0) 会返回整个数组 —— limit=0 需显式短路
      if (limit <= 0) return []
      return cloneJson(records.slice(-limit))
    },

    /**
     * 删除一条记录（数据删除扩展点）。
     * @param id - 记录 id，如 'cast-3'
     * @returns 是否删除成功
     */
    remove(id) {
      const index = records.findIndex((record) => record.id === id)
      if (index < 0) return false
      records.splice(index, 1)
      return true
    },

    /** 清空仓库，返回被清空的数量。 */
    clear() {
      const removed = records.length
      records.length = 0
      return removed
    },

    /** 释放引擎（停止时随 fiber 清理）。 */
    dispose() {
      records.length = 0
      log('[bushang-yigua] divine engine disposed')
    },
  }
}
