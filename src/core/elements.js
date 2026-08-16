/**
 * 五行（Five Elements / Wu Xing）核心模块。
 *
 * 只包含纯数据与纯函数：无副作用、无共享可变状态，天然线程安全。
 * 设计模式：数据表（常量映射）+ 策略判定函数。
 *
 * 相生：木→火→土→金→水→木      生（generates）
 * 相克：木→土→水→火→金→木      克（restrains）
 *
 * 任意两个不同五行之间，恰好满足“生/克”四种关系之一（加上相同即五种），
 * 因此吉凶五分类是完备且互斥的。
 */

/** 五种五行及其中文名。 */
export const FIVE_ELEMENTS = [
  { id: 'wood', zh: '木' },
  { id: 'fire', zh: '火' },
  { id: 'earth', zh: '土' },
  { id: 'metal', zh: '金' },
  { id: 'water', zh: '水' },
]

/** 相生环：该元素「生」谁。木生火、火生土、土生金、金生水、水生木。 */
export const GENERATES = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}

/** 相克环：该元素「克」谁。木克土、土克水、水克火、火克金、金克木。 */
export const RESTRAINS = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}

/** 五行中文名查找表。 */
const ELEMENT_ZH = Object.fromEntries(FIVE_ELEMENTS.map((e) => [e.id, e.zh]))

/** 五行中文名。@param element - 五行 id（'wood' | 'fire' | ...） */
export function elementZh(element) {
  return ELEMENT_ZH[element] ?? String(element)
}

/** 是否为合法五行 id。 */
export function isElement(value) {
  return value in GENERATES
}

/** a 是否「生」b（相生关系判定）。 */
export function generates(a, b) {
  return GENERATES[a] === b
}

/** a 是否「克」b（相克关系判定）。 */
export function restrains(a, b) {
  return RESTRAINS[a] === b
}

/**
 * 五行生克关系分类（begin 为开始/本卦五行，end 为结果/变卦五行）。
 * @returns 五种关系之一：
 *  - 'end-generates-begin' 结果生开始
 *  - 'same'                始终如一（五行相同）
 *  - 'begin-restrains-end' 开始克结果
 *  - 'begin-generates-end' 开始生结果
 *  - 'end-restrains-begin' 结果克开始
 */
export function classifyRelation(begin, end) {
  if (begin === end) return 'same'
  if (generates(begin, end)) return 'begin-generates-end'
  if (generates(end, begin)) return 'end-generates-begin'
  if (restrains(begin, end)) return 'begin-restrains-end'
  if (restrains(end, begin)) return 'end-restrains-begin'
  throw new Error(`无法判定的五行关系: ${begin} vs ${end}`)
}

/** 关系的中文判词标签（用于 UI 展示「X生Y」「X克Y」）。 */
export const RELATION_META = {
  'end-generates-begin': { zh: '结果生开始', short: '果生始', arrow: '变生本' },
  'same': { zh: '始终如一', short: '如一', arrow: '同' },
  'begin-restrains-end': { zh: '开始克结果', short: '始克果', arrow: '本克变' },
  'begin-generates-end': { zh: '开始生结果', short: '始生果', arrow: '本生变' },
  'end-restrains-begin': { zh: '结果克开始', short: '果克始', arrow: '变克本' },
}

/** 关系中文标签。 */
export function relationZh(relation) {
  return RELATION_META[relation]?.zh ?? String(relation)
}
