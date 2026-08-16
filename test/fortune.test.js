import { test } from 'node:test'
import assert from 'node:assert/strict'

import { FORTUNE_BY_RELATION, FORTUNE_GRADES, GRADE_LABEL, fortuneOf, fortuneView } from '../src/core/fortune.js'

test('吉凶表与需求完全一致', () => {
  assert.deepEqual(FORTUNE_BY_RELATION['end-generates-begin'], {
    grade: 'great-ji',
    level: '大吉',
    chance: '约 90%',
    verdict: '事必成',
    verse: '得天时之助，所求必成。',
    tone: 'auspicious',
  })
  assert.deepEqual(FORTUNE_BY_RELATION['same'], {
    grade: 'ci-ji',
    level: '次吉',
    chance: '约 70%',
    verdict: '事易成',
    verse: '始终如一，顺遂可期。',
    tone: 'auspicious',
  })
  assert.deepEqual(FORTUNE_BY_RELATION['begin-restrains-end'], {
    grade: 'zhong-ping',
    level: '中平',
    chance: '40%–60%',
    verdict: '事可成',
    verse: '势均相克，事可成而需加力。',
    tone: 'neutral',
  })
  assert.deepEqual(FORTUNE_BY_RELATION['begin-generates-end'], {
    grade: 'xiao-xiong',
    level: '小凶',
    chance: '30% 以下',
    verdict: '事难成',
    verse: '元气外泄，宜守缓图。',
    tone: 'ominous',
  })
  assert.deepEqual(FORTUNE_BY_RELATION['end-restrains-begin'], {
    grade: 'da-xiong',
    level: '大凶',
    chance: '10% 以下',
    verdict: '事不成',
    verse: '反受其克，宜守不宜攻。',
    tone: 'ominous',
  })
})

test('五等级唯一标识齐全且顺序为吉→凶', () => {
  assert.deepEqual(FORTUNE_GRADES, ['great-ji', 'ci-ji', 'zhong-ping', 'xiao-xiong', 'da-xiong'])
  for (const grade of FORTUNE_GRADES) {
    assert.ok(GRADE_LABEL[grade], `等级 ${grade} 应有中文标签`)
  }
})

test('fortuneOf / fortuneView 行为', () => {
  assert.equal(fortuneOf('unknown-relation'), undefined)
  const view = fortuneView('same')
  assert.deepEqual(view, FORTUNE_BY_RELATION['same'])
  assert.notEqual(view, FORTUNE_BY_RELATION['same'], 'fortuneView 应返回副本')
  view.level = '被篡改'
  assert.equal(FORTUNE_BY_RELATION['same'].level, '次吉')
})
