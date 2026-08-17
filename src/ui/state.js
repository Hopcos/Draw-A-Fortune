/**
 * 卜卦界面状态机（纯 reducer，可独立测试，无 React 依赖）。
 *
 * 阶段（phase）：
 *  - 'badge'   收起状态（一枚圆钮），首次加载完成/结果自动收起后到达；
 *  - 'casting' 掷叶动画进行中（叶片逐片揭晓）；
 *  - 'result'  展示本卦→变卦与吉凶判词。
 *
 * generation 用于丢弃过期动画序列（新的起卦会使旧的序列失效，避免竞态）。
 */

/** 初始状态。 */
export const INITIAL_STATE = {
  phase: 'badge',
  revealed: 0, // 已揭晓的叶片数（0..6）
  changingShown: false,
  result: null,
  error: null,
  reason: null,
  generation: 0,
}

/** 触发原因 → 中文标签。 */
export const REASON_LABEL = {
  'page-load': '页面加载',
  'task-start': '任务发起',
  manual: '手动起卦',
}

/**
 * 状态归约器（Reducer）。
 * @param state - 当前状态
 * @param action - { type, ... }
 */
export function reduce(state, action) {
  switch (action.type) {
    case 'trigger': {
      return {
        ...INITIAL_STATE,
        phase: action.immediate === true ? 'casting' : state.phase === 'result' ? 'casting' : 'casting',
        reason: typeof action.reason === 'string' ? action.reason : 'manual',
        generation: state.generation + 1,
      }
    }
    case 'reveal': {
      const index = Number.isFinite(action.index) ? action.index : state.revealed
      return { ...state, revealed: Math.min(6, Math.max(state.revealed, index + 1)) }
    }
    case 'changing': {
      return { ...state, changingShown: true }
    }
    case 'settle': {
      return { ...state, phase: 'result', revealed: 6, changingShown: true, result: action.result ?? null, error: null }
    }
    case 'fail': {
      return { ...state, phase: 'badge', revealed: 0, result: null, error: action.message ?? '起卦失败' }
    }
    case 'collapse': {
      return { ...state, phase: 'badge' }
    }
    case 'restore': {
      // 折叠后重新展开：还原上次结果（若无结果则保持原样，由调用方 guard）
      return state.result !== null ? { ...state, phase: 'result', error: null } : state
    }
    case 'dismiss': {
      return { ...state, error: null }
    }
    default: {
      return state
    }
  }
}
