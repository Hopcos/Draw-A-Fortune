/**
 * 八卦（Eight Trigrams）核心模块。
 *
 * 三爻从下到上记为 lines[0..2]，1 为阳爻（⚊），0 为阴爻（⚋）。
 * 五行采用常用后天八卦五行：乾兑为金、离为火、震巽为木、坎为水、艮坤为土。
 *
 * 设计模式：数据表 + 工厂（lookup）。
 */

/**
 * 八卦定义表（自下而上三爻）。
 * - key   英文标识
 * - zh    汉字
 * - symbol 卦符（Unicode ☰☷ 等）
 * - element 五行
 * - nature 自然象征
 * - lines  三爻位（底→顶）
 */
export const TRIGRAM_DEFS = [
  { key: 'qian', zh: '乾', symbol: '☰', element: 'metal', nature: '天', lines: [1, 1, 1] },
  { key: 'dui', zh: '兑', symbol: '☱', element: 'metal', nature: '泽', lines: [1, 1, 0] },
  { key: 'li', zh: '离', symbol: '☲', element: 'fire', nature: '火', lines: [1, 0, 1] },
  { key: 'zhen', zh: '震', symbol: '☳', element: 'wood', nature: '雷', lines: [1, 0, 0] },
  { key: 'xun', zh: '巽', symbol: '☴', element: 'wood', nature: '风', lines: [0, 1, 1] },
  { key: 'kan', zh: '坎', symbol: '☵', element: 'water', nature: '水', lines: [0, 1, 0] },
  { key: 'gen', zh: '艮', symbol: '☶', element: 'earth', nature: '山', lines: [0, 0, 1] },
  { key: 'kun', zh: '坤', symbol: '☷', element: 'earth', nature: '地', lines: [0, 0, 0] },
]

/** 三爻位 → 卦的位模式键（如 '101'）。 */
export function trigramKeyOf(lines) {
  return lines.join('')
}

/** 依据三爻位（底→顶，元素 0/1）查到卦定义；找不到返回 undefined。 */
export function trigramByBits(lines) {
  const key = trigramKeyOf(lines)
  return TRIGRAM_DEFS.find((def) => trigramKeyOf(def.lines) === key)
}

/** 八卦总数。 */
export const TRIGRAM_COUNT = TRIGRAM_DEFS.length

/**
 * 展示用副本：仅保留叶子字段（供 UI / 序列化使用），返回全新对象。
 * @param def - TRIGRAM_DEFS 中的条目
 */
export function trigramView(def) {
  if (!def) return undefined
  return {
    key: def.key,
    zh: def.zh,
    symbol: def.symbol,
    nature: def.nature,
    element: def.element,
    lines: def.lines.slice(),
  }
}
