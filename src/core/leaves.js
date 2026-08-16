/**
 * 掷叶（Leaf Toss）模块：随机源策略 + 叶片正反判定。
 *
 * 需求：下卦先随机扔 3 片树叶，上卦再扔 3 片。正面（正）为阳爻，反面（反）为阴爻。
 * 正反各 50%（p=0.5）。
 *
 * 设计模式：策略（Strategy）——RNG 可注入；默认为 Math.random，
 * 测试/多线程场景注入种子化的 mulberry32（确定性、可复现、线程安全）。
 */

/**
 * mulberry32：种子化的确定性伪随机数生成器。
 * 采用纯函数式实现（无共享状态），可在 worker 线程中以不同 seed 并行复制。
 * @param seed - 任意正整数种子
 * @returns () => number，返回 [0,1) 均匀分布
 */
export function createRng(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 默认随机源（宿主/浏览器原生 Math.random，无需注入时使用）。 */
export function defaultRng() {
  return Math.random()
}

/**
 * 掷一片树叶 —— 完全随机：每次调用独立消费一次随机源，
 * 正/反各 50%（p = 0.5），与历史结果没有任何关联（无缓存、无模式、无权重）。
 * @param rng - 随机源
 * @returns 1 = 正面（阳爻），0 = 反面（阴爻）
 */
export function tossBit(rng) {
  return rng() < 0.5 ? 1 : 0
}

/**
 * 掷一组树叶（默认 3 片）——对应一个卦的三爻。
 * 每片树叶各自独立掷出（循环内每次调用 tossBit → 独立消费 rng），
 * 因此同一卦内的三爻之间也完全相互独立。
 * @param rng - 随机源
 * @param count - 叶片数，默认 3
 * @returns 爻位数组（底→顶，1 阳 0 阴）
 */
export function tossTrigramBits(rng, count = 3) {
  const bits = []
  for (let i = 0; i < count; i += 1) bits.push(tossBit(rng))
  return bits
}

/** 叶片正反面元数据。 */
export const FACE_META = {
  1: { face: 'front', zh: '正', line: 'yang', label: '阳' },
  0: { face: 'back', zh: '反', line: 'yin', label: '阴' },
}

/** 爻位（0/1）→ 叶片正面/反面字符串：'front' | 'back'。 */
export function leafFace(bit) {
  return FACE_META[bit].face
}

/**
 * 取 [0, max) 的随机整数。
 * @param rng - 随机源
 */
export function randomInt(rng, max) {
  return Math.floor(rng() * max)
}
