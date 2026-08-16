/**
 * 吉凶（Fortune）模块：五行关系 → 吉凶等级映射表。
 *
 * 依据需求中的吉凶表：
 * | 关系        | 吉凶等级  | 结果    |
 * | 结果生开始  | 大吉 90% | 事必成  |
 * | 始终如一    | 次吉 70% | 事易成  |
 * | 开始克结果  | 中平 40%-60% | 事可成 |
 * | 开始生结果  | 小凶 <30% | 事难成  |
 * | 结果克开始  | 大凶 <10% | 事不成  |
 *
 * tone 为 UI 配色语义（auspicious 吉 / neutral 平 / ominous 凶）。
 */

/** 五行生克关系 → 吉凶元数据（纯数据表）。 */
export const FORTUNE_BY_RELATION = {
  'end-generates-begin': {
    grade: 'great-ji',
    level: '大吉',
    chance: '约 90%',
    verdict: '事必成',
    verse: '得天时之助，所求必成。',
    tone: 'auspicious',
  },
  'same': {
    grade: 'ci-ji',
    level: '次吉',
    chance: '约 70%',
    verdict: '事易成',
    verse: '始终如一，顺遂可期。',
    tone: 'auspicious',
  },
  'begin-restrains-end': {
    grade: 'zhong-ping',
    level: '中平',
    chance: '40%–60%',
    verdict: '事可成',
    verse: '势均相克，事可成而需加力。',
    tone: 'neutral',
  },
  'begin-generates-end': {
    grade: 'xiao-xiong',
    level: '小凶',
    chance: '30% 以下',
    verdict: '事难成',
    verse: '元气外泄，宜守缓图。',
    tone: 'ominous',
  },
  'end-restrains-begin': {
    grade: 'da-xiong',
    level: '大凶',
    chance: '10% 以下',
    verdict: '事不成',
    verse: '反受其克，宜守不宜攻。',
    tone: 'ominous',
  },
}

/** 吉凶等级唯一标识（按吉→凶顺序，用于直方图与排序）。 */
export const FORTUNE_GRADES = ['great-ji', 'ci-ji', 'zhong-ping', 'xiao-xiong', 'da-xiong']

/** 等级→中文标签。 */
export const GRADE_LABEL = {
  'great-ji': '大吉',
  'ci-ji': '次吉',
  'zhong-ping': '中平',
  'xiao-xiong': '小凶',
  'da-xiong': '大凶',
}

/** 依据五行关系取吉凶元数据；未知关系返回 undefined。 */
export function fortuneOf(relation) {
  return FORTUNE_BY_RELATION[relation]
}

/** 返回一行吉凶元数据的浅副本（避免调用方改动数据表）。 */
export function fortuneView(relation) {
  const meta = FORTUNE_BY_RELATION[relation]
  return meta ? { ...meta } : undefined
}
