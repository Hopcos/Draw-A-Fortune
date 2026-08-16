/**
 * 卜上一卦 悬浮部件（React 组件，仅使用 createElement，无 JSX）。
 *
 * 触发：
 *  - 页面首次加载（组件挂载）→ 自动起一卦（reason: 'page-load'）；
 *  - 每次发起任务（当前会话 running 由 false → true 的上升沿）→ 自动起卦（'task-start'）；
 *  - 点击浮钮手动起卦（'manual'）。
 *
 * 动画：叶片逐片 3D 翻转揭晓（ctx.timeout 驱动 + 轻 3D CSS），
 * 变爻高亮，最后展示 本卦→变卦 与 五行生克吉凶。
 * 竞态防护：generation + mounted 双重校验，丢弃过期动画序列。
 */

import React from 'react'
import { INITIAL_STATE, reduce, REASON_LABEL } from './state.js'

/** 五行汉字对照（UI 展示用；与 core 数据一致性由测试保证）。 */
export const ELEMENT_ZH = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }

/** 动画节奏参数（毫秒）。 */
const START_DELAY_MS = 180
const LEAF_STEP_MS = 430
const GROUP_PAUSE_MS = 340
const CHANGING_PAUSE_MS = 560

/**
 * 起卦控制器（自定义 Hook）：状态机 + 异步动画序列。
 * @param ctx - 客户端插件上下文（注入 timer 后含 ctx.timeout）
 * @param getSessionId - 可选：取当前会话 id
 */
function useCastController(ctx, getSessionId) {
  const [state, dispatch] = React.useReducer(reduce, INITIAL_STATE)
  const generation = React.useRef(0)
  const mounted = React.useRef(true)

  React.useEffect(() => () => {
    mounted.current = false
  }, [])

  const cast = React.useCallback(async (reason) => {
    const gen = ++generation.current
    dispatch({ type: 'trigger', reason })
    try {
      await ctx.timeout(START_DELAY_MS)
      if (gen !== generation.current || !mounted.current) return

      const args = { reason }
      const sessionId = typeof getSessionId === 'function' ? getSessionId() : undefined
      if (sessionId !== undefined) args.sessionId = sessionId
      const record = await host.call('divine', args)
      if (gen !== generation.current || !mounted.current) return

      for (let i = 0; i < 6; i += 1) {
        await ctx.timeout(LEAF_STEP_MS + (i === 2 || i === 5 ? GROUP_PAUSE_MS : 0))
        if (gen !== generation.current || !mounted.current) return
        dispatch({ type: 'reveal', index: i })
      }

      await ctx.timeout(CHANGING_PAUSE_MS)
      if (gen !== generation.current || !mounted.current) return
      dispatch({ type: 'changing' })

      await ctx.timeout(420)
      if (gen !== generation.current || !mounted.current) return
      dispatch({ type: 'settle', result: record })
      // 结果保持完整显示，不自动收起；由用户点击 × 收起，或由新的起卦替换。
    } catch (error) {
      if (!mounted.current || gen !== generation.current) return
      dispatch({ type: 'fail', message: String((error && error.message) || error) })
    }
  }, [ctx, getSessionId])

  const collapse = React.useCallback(() => {
    generation.current += 1 // 使进行中的旧序列失效
    dispatch({ type: 'collapse' })
  }, [])

  return { state, cast, collapse }
}

/** 入口组件：按 useSessions 是否可用选择触发模式。 */
export function FortuneWidget(props) {
  const overlayProps = props.overlayProps ?? {}
  if (typeof overlayProps.useSessions === 'function') {
    return React.createElement(FortuneAuto, props)
  }
  return React.createElement(FortuneManual, props)
}

/** 自动触发模式：订阅会话列表，检测任务发起上升沿 + 首次加载。 */
function FortuneAuto(props) {
  const useSessions = props.overlayProps.useSessions
  const snap = useSessions(
    (sessions) => {
      if (sessions.current === undefined) return null
      const row = sessions.byId[sessions.current]
      return row ? { id: sessions.current, running: row.running === true } : null
    },
    (a, b) => (a === null || b === null ? a === b : a.id === b.id && a.running === b.running),
  )
  const running = snap !== null && snap.running
  const controller = useCastController(props.ctx, () => (snap ? snap.id : undefined))
  const prevRunning = React.useRef(null)

  React.useEffect(() => {
    const last = prevRunning.current
    prevRunning.current = running
    if (last === null) {
      // 首次加载：若任务已在运行则按任务发起起卦，否则按页面加载起卦
      controller.cast(running ? 'task-start' : 'page-load')
    } else if (running && !last) {
      // 每个新任务的上升沿
      controller.cast('task-start')
    }
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  return React.createElement(FortuneView, {
    state: controller.state,
    onManual: () => controller.cast('manual'),
    onClose: controller.collapse,
  })
}

/** 手动模式：仅首次加载起卦，平时可点击浮钮手动起卦。 */
function FortuneManual(props) {
  const controller = useCastController(props.ctx)
  React.useEffect(() => {
    controller.cast('page-load')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return React.createElement(FortuneView, {
    state: controller.state,
    onManual: () => controller.cast('manual'),
    onClose: controller.collapse,
  })
}

/** 呈现组件（纯函数，导出以便测试/演示直接渲染）。 */
export function FortuneView({ state, onManual, onClose }) {
  if (state.phase === 'badge') {
    return React.createElement(
      'div',
      { className: 'byg-root', 'data-phase': 'badge' },
      React.createElement(
        'button',
        {
          className: 'byg-badge',
          type: 'button',
          title: '卜上一卦',
          'aria-label': '卜上一卦',
          onClick: onManual,
        },
        React.createElement('span', { className: 'byg-badge-icon' }, '☯'),
      ),
    )
  }

  const record = state.result
  const reasonLabel = REASON_LABEL[state.reason] ?? '起卦'
  const children = []

  // 头部
  children.push(
    React.createElement(
      'div',
      { className: 'byg-head', key: 'head' },
      React.createElement('span', { className: 'byg-title' }, '卜上一卦'),
      React.createElement('span', { className: 'byg-reason' }, reasonLabel),
      React.createElement(
        'button',
        { className: 'byg-close', type: 'button', 'aria-label': '收起', onClick: onClose },
        '×',
      ),
    ),
  )

  // 叶片托盘
  children.push(
    React.createElement(
      'div',
      { className: 'byg-tray', key: 'tray' },
      Array.from({ length: 6 }, (_, index) => {
        const revealed = index < state.revealed
        const face = record ? record.faces[index] : null
        return React.createElement(Leaf, { key: index, index, revealed, face })
      }),
    ),
  )

  // 六爻：从下到上排列（第 1 爻在下、第 6 爻在上）；
  // 第 1~3 爻（下卦）浅黄背景，第 4~6 爻（上卦）浅灰背景，变爻行蓝色背景。
  if (record) {
    children.push(
      React.createElement(
        'div',
        { className: 'byg-hex', key: 'hex' },
        record.lines
          .map((value, index) =>
            React.createElement(HexRow, {
              key: index,
              index,
              value,
              changing: state.changingShown && index === record.changingLine - 1,
            }),
          )
          .reverse(), // 第 6 爻在上、第 1 爻在下
      ),
    )
  }

  // 结果区：本卦 → 变卦 + 五行生克 + 吉凶判词
  if (record) {
    children.push(React.createElement(ResultPanel, { record, key: 'result' }))
    children.push(
      React.createElement(
        'div',
        { className: 'byg-actions', key: 'actions' },
        React.createElement(
          'button',
          { className: 'byg-again', type: 'button', onClick: onManual },
          '再占一卦',
        ),
      ),
    )
  }

  if (state.error) {
    children.push(
      React.createElement('div', { className: 'byg-error', key: 'error' }, '起卦失败：' + state.error),
    )
  }

  return React.createElement(
    'div',
    { className: 'byg-root', 'data-phase': state.phase },
    React.createElement('div', { className: 'byg-card' }, ...children),
  )
}

/** 单片树叶：待掷（抖动）→ 翻转揭晓正/反。 */
function Leaf({ index, revealed, face }) {
  if (!revealed) {
    return React.createElement(
      'div',
      { className: 'byg-leaf pending', 'data-index': index },
      React.createElement(
        'div',
        { className: 'byg-leaf-inner' },
        React.createElement('div', { className: 'byg-leaf-blur' }, '?'),
      ),
    )
  }
  const faceLabel = face === 'front' ? '阳' : '阴'
  return React.createElement(
    'div',
    { className: 'byg-leaf', 'data-index': index },
    React.createElement(
      'div',
      { className: 'byg-leaf-inner byg-leaf-toss', 'data-face': faceLabel === '阳' ? 'front' : 'back' },
      React.createElement('div', { className: 'byg-leaf-face byg-leaf-front' }, '阳'),
      React.createElement('div', { className: 'byg-leaf-face byg-leaf-back' }, '阴'),
    ),
  )
}

/** 一行爻：无文本标注，仅以背景色区分 —— 下卦浅黄、上卦浅灰、变爻浅蓝。 */
function HexRow({ index, value, changing }) {
  return React.createElement(
    'div',
    {
      className: 'byg-hex-row',
      'data-position': index < 3 ? 'lower' : 'upper',
      'data-changing': changing ? 'true' : 'false',
    },
    React.createElement('div', { className: 'byg-hex-line', 'data-value': value }),
  )
}

/** 结果面板：本卦/变卦 + 五行生克 + 吉凶。 */
function ResultPanel({ record }) {
  const base = record.base
  const changed = record.changed
  const fortune = record.fortune

  return [
    React.createElement(
      'div',
      { className: 'byg-trigram-swap', key: 'swap' },
      React.createElement(TrigramCard, { trigram: base, label: '本卦', key: 'base' }),
      React.createElement('span', { className: 'byg-swap-arrow', key: 'arrow' }, '⇄'),
      React.createElement(TrigramCard, { trigram: changed, label: '变卦', key: 'changed' }),
    ),
    React.createElement(
      'div',
      { className: 'byg-relation-row', key: 'relation' },
      '五行' + record.relationZh + '，' + (fortune.level) + '之兆',
    ),
    React.createElement(
      'div',
      { className: 'byg-verdict', 'data-tone': fortune.tone, key: 'verdict' },
      React.createElement('div', { className: 'byg-level' }, fortune.level),
      React.createElement('div', { className: 'byg-chance' }, '成事率 ' + fortune.chance + ' · ' + fortune.verdict),
      React.createElement('div', { className: 'byg-verse' }, fortune.verse),
    ),
    React.createElement(
      'div',
      { className: 'byg-changeline-note', key: 'note' },
      '第' + record.changingLine + '爻(动' + (record.changingTrigram === 'lower' ? '下卦' : '上卦') + ')' +
        ' · 天机数 ' + record.raw,
    ),
  ]
}

/** 单卦卡片：八卦与五行全部用汉字标识。 */
function TrigramCard({ trigram, label }) {
  return React.createElement(
    'div',
    { className: 'byg-trigram-card' },
    React.createElement('div', { className: 'byg-trigram-name' }, label),
    React.createElement('div', { className: 'byg-trigram-symbol' }, trigram.zh),
    React.createElement(
      'div',
      { className: 'byg-trigram-meta' },
      React.createElement(
        'span',
        { className: 'byg-chip', 'data-element': trigram.element },
        ELEMENT_ZH[trigram.element] ?? trigram.element,
      ),
    ),
  )
}
