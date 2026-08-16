/**
 * 演示 CLI：卜上一卦。
 *   - 单卦详示：六爻、天机数、动爻、本卦/变卦、五行生克、吉凶判词；
 *   - 多线程批算：distributed over worker_threads，输出吉凶与动爻分布。
 *
 * 运行：node src/demo/cli.js
 */

import { castHexagram, createRng } from '../core/index.js'
import { divineBatch } from '../engine/batch-engine.js'
import { elementZh } from '../core/elements.js'
import { GRADE_LABEL } from '../core/fortune.js'

function lineGlyph(value) {
  return value === 1 ? '━━━━━━━━' : '━━━  ━━━'
}

function printRecord(record, title) {
  console.log('')
  console.log(`── ${title} ──`)
  console.log(`天机数：${record.raw}  (mod 6 = ${record.mod})  →  动第${record.changingLine}爻（${record.changingTrigram === 'lower' ? '下卦' : '上卦'}）`)
  console.log('')
  // 自上而下打印六爻（屏幕上第 6 爻在最上）
  for (let i = 5; i >= 0; i -= 1) {
    const marker = i === record.changingLine - 1 ? '  ◉ 动爻' : ''
    console.log(`第${i + 1}爻  ${lineGlyph(record.lines[i])}${marker}`)
  }
  console.log('')
  const base = record.base
  const changed = record.changed
  console.log(
    `本卦 ${base.symbol} ${base.zh}（${elementZh(base.element)}）  ⇄  变卦 ${changed.symbol} ${changed.zh}（${elementZh(changed.element)}）`,
  )
  console.log(`五行关系：${record.relationZh}`)
  console.log(
    `吉凶：${record.fortune.level}（${record.fortune.chance}） · ${record.fortune.verdict} · ${record.fortune.verse}`,
  )
  console.log(`六爻正反：${record.facesZh.join(' ')}`)
}

function printHistogram(report) {
  console.log('')
  console.log(`── 多线程批算统计（${report.total} 卦 / ${report.workers} 线程 / ${report.elapsedMs}ms）──`)
  const width = 40
  const maxCount = Math.max(...Object.values(report.histogram))
  for (const grade of ['great-ji', 'ci-ji', 'zhong-ping', 'xiao-xiong', 'da-xiong']) {
    const count = report.histogram[grade]
    const bar = '█'.repeat(Math.round((count / maxCount) * width))
    const pct = ((count / report.total) * 100).toFixed(1)
    console.log(`  ${GRADE_LABEL[grade].padEnd(3)} ${String(count).padStart(5)} (${pct.padStart(5)}%) ${bar}`)
  }
  console.log('')
  console.log('  动爻分布：')
  for (let line = 1; line <= 6; line += 1) {
    const count = report.changingLines[line]
    const pct = ((count / report.total) * 100).toFixed(1)
    console.log(`    第${line}爻  ${String(count).padStart(5)} (${pct.padStart(5)}%)`)
  }
}

async function main() {
  const seed = process.argv[2] !== undefined ? Number(process.argv[2]) : Date.now() % 100000
  console.log(`卜上一卦 · 演示 · 种子 ${seed}`)

  // 1) 单卦详示（确定性种子）
  const record = castHexagram({ rng: createRng(seed) })
  printRecord(record, '今日一卦')

  // 2) 多线程批算（真实 worker_threads 并行）
  const report = await divineBatch({ count: 4000, workers: 4, seed })
  printHistogram(report)

  console.log('')
  console.log('提示：浏览器端 DSH 插件在页面加载与每次任务发起时自动起卦。')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
