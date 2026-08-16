/**
 * 起卦（Hexagram Casting）核心模块 —— 本插件的业务核心。
 *
 * 流程（与需求一一对应）：
 *  1. 下卦：随机扔 3 片树叶（正=阳爻，反=阴爻）→ 第 1~3 爻；
 *  2. 上卦：再随机扔 3 片树叶 → 第 4~6 爻；
 *  3. 自下而上按 1~6 构建六爻；
 *  4. 随机生成一个数字 N，N % 6 取 0~5；1~5 代表第几根爻，0 代表最上面的第 6 根；
 *  5. 该爻动（变爻）：阳→阴 或 阴→阳；
 *  6. 变爻所在的卦（上或下）为本卦，变爻后该卦为变卦；
 *  7. 依据本卦与变卦的五行生克预测吉凶（查 fortune 表）。
 *
 * 纯函数：输入 { rng }，输出 JSON 安全的纯数据对象。
 */

import { classifyRelation, relationZh } from './elements.js'
import { trigramByBits, trigramView } from './trigrams.js'
import { leafFace, randomInt, tossTrigramBits } from './leaves.js'
import { fortuneOf } from './fortune.js'

/** 天机数字的最大值（N 的取值范围，保证 N%6 均匀）。 */
export const RAW_NUMBER_MAX = 1_000_000

/**
 * 起一卦。
 * @param opts - { rng } 随机源（策略注入）
 * @returns 卦象记录（JSON 安全）
 */
export function castHexagram(opts) {
  const rng = opts && typeof opts.rng === 'function' ? opts.rng : Math.random

  // 1) 下卦 3 爻（底→顶为第 1~3 爻），2) 上卦 3 爻（第 4~6 爻）
  const lowerBits = tossTrigramBits(rng, 3)
  const upperBits = tossTrigramBits(rng, 3)
  const lines = lowerBits.concat(upperBits) // 六爻，自下而上 1..6

  // 3) 天机数字 N，N%6 ∈ {0..5}
  const raw = randomInt(rng, RAW_NUMBER_MAX)
  const mod = raw % 6

  // 4) 动爻：1~5 代表第几根爻，0 代表最上面的第 6 根
  const changingLine = mod === 0 ? 6 : mod
  const changingIndex = changingLine - 1

  // 5) 变爻（阳↔阴）
  const flipped = lines.slice()
  flipped[changingIndex] = 1 - flipped[changingIndex]

  // 6) 变爻所在的卦：第 1~3 爻为下卦，第 4~6 爻为上卦
  const trigramPosition = changingIndex < 3 ? 'lower' : 'upper'
  const sliceStart = changingIndex < 3 ? 0 : 3
  const baseBits = lines.slice(sliceStart, sliceStart + 3)
  const changedBits = flipped.slice(sliceStart, sliceStart + 3)

  const base = trigramView(trigramByBits(baseBits))
  const changed = trigramView(trigramByBits(changedBits))

  // 7) 五行生克 → 吉凶
  const relation = classifyRelation(base.element, changed.element)
  const fortune = fortuneOf(relation)

  // 组装 JSON 安全的展示记录
  return {
    lower: {
      bits: lowerBits.slice(),
      faces: lowerBits.map(leafFace),
      trigram: trigramView(trigramByBits(lowerBits)),
    },
    upper: {
      bits: upperBits.slice(),
      faces: upperBits.map(leafFace),
      trigram: trigramView(trigramByBits(upperBits)),
    },
    lines: lines.slice(),
    faces: lines.map(leafFace),
    facesZh: lines.map((bit) => (bit === 1 ? '正' : '反')),
    raw,
    mod,
    changingLine,
    changingTrigram: trigramPosition,
    base,
    changed,
    relation,
    relationZh: relationZh(relation),
    fortune: { ...fortune },
  }
}
