/**
 * 卜上一卦 界面样式（轻 3D、简洁、美观）。
 * 所有选择器前缀 byg-，只使用主题 CSS 变量 + 五行/吉凶语义色。
 */

/** 插入页面的完整样式表（由客户端插件骨架注入）。 */
export const FORTUNE_CSS = `
.byg-root {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 40;
  pointer-events: auto;
  perspective: 900px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ---- 收起态：一枚精致的圆钮 ---- */
.byg-badge {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35));
  background: linear-gradient(145deg, var(--dsw-alias-bg-overlay, #fff), var(--dsw-alias-bg-layer-2, #f2f2f4));
  color: var(--dsw-alias-label-primary, #222);
  box-shadow: 0 6px 18px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.5);
  cursor: pointer;
  transition: transform .25s ease, box-shadow .25s ease;
  transform-style: preserve-3d;
}
.byg-badge:hover {
  transform: rotateY(10deg) rotateX(-6deg) translateY(-2px);
  box-shadow: 0 10px 26px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.5);
}
.byg-badge-icon {
  font-size: 24px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,.25));
}

/* ---- 展开卡 ---- */
.byg-card {
  width: 304px;
  max-height: 560px;
  overflow: auto;
  border-radius: 16px;
  padding: 14px 14px 16px;
  background: var(--dsw-alias-bg-overlay, rgba(255,255,255,.9));
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3));
  box-shadow: 0 14px 40px rgba(0,0,0,.22);
  backdrop-filter: blur(14px);
  color: var(--dsw-alias-label-primary, #222);
  transform: rotateX(2deg);
  transition: transform .3s ease;
}
.byg-card:hover { transform: rotateX(0deg); }

.byg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.byg-title { font-weight: 700; font-size: 14px; letter-spacing: .5px; }
.byg-reason {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #666);
  background: var(--dsw-alias-bg-layer-2, #ececf0);
  border-radius: 999px;
  padding: 2px 8px;
}
.byg-close {
  margin-left: auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.byg-close:hover { background: var(--dsw-alias-bg-layer-2, #ececf0); }

/* ---- 叶片托盘（3D 舞台） ---- */
.byg-tray {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 8px 0 6px;
  margin-bottom: 8px;
  perspective: 700px;
}
.byg-leaf { width: 34px; height: 34px; position: relative; }
.byg-leaf-inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform .62s cubic-bezier(.22,.75,.3,1.05);
}
.byg-leaf-inner[data-face="back"] { transform: rotateY(180deg); }
.byg-leaf-inner[data-face="front"] { transform: rotateY(0deg); }
.byg-leaf-inner[data-face="front"].byg-leaf-toss { animation: byg-toss-front .62s cubic-bezier(.22,.75,.3,1.05) both; }
.byg-leaf-inner[data-face="back"].byg-leaf-toss { animation: byg-toss-back .62s cubic-bezier(.22,.75,.3,1.05) both; }
.byg-leaf.pending .byg-leaf-inner {
  transform: rotateY(905deg);
  animation: byg-rumble 1.4s ease-in-out infinite;
}
.byg-leaf-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 8px 68% 8px 68%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 1px rgba(0,0,0,.3);
}
.byg-leaf-front {
  background: linear-gradient(135deg, #e6c35c, #c79a2e);
  transform: rotateY(0deg);
}
.byg-leaf-back {
  background: linear-gradient(135deg, #8fa3b0, #5f7180);
  transform: rotateY(180deg);
}
.byg-leaf-blur {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 12px;
  border-radius: 8px 68% 8px 68%;
  background: var(--dsw-alias-bg-layer-2, #e6e6ea);
  border: 1px dashed var(--dsw-alias-border-l1, rgba(128,128,128,.4));
  color: var(--dsw-alias-label-secondary, #666);
}

/* ---- 六爻（从下到上：第 1 爻在下、第 6 爻在上） ---- */
.byg-hex { display: grid; gap: 4px; margin: 10px 0 12px; }
.byg-hex-row {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 8px;
  transition: background .25s ease;
}
/* 分区背景：下卦浅黄、上卦浅灰 —— 无需文字标注 */
.byg-hex-row[data-position="lower"] { background: #fbf0c8; }
.byg-hex-row[data-position="upper"] { background: var(--dsw-alias-bg-layer-2, #e9e9ee); }
/* 变爻：背景用蓝色（覆盖分区色） */
.byg-hex-row[data-changing="true"] { background: #cfe3fc; }
.byg-hex-line {
  flex: 1;
  height: 15px;
  border-radius: 6px;
  background: var(--dsw-alias-label-secondary, #888);
  opacity: .25;
}
.byg-hex-line[data-value="1"] {
  background: var(--dsw-alias-label-primary, #222);
  opacity: .85;
}
.byg-hex-line[data-value="0"] {
  background: linear-gradient(90deg, var(--dsw-alias-label-primary,#222) 0 42%, transparent 42% 58%, var(--dsw-alias-label-primary,#222) 58% 100%);
  opacity: .85;
}

/* ---- 结果区 ---- */
.byg-trigram-swap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 4px 0 10px;
}
.byg-trigram-card {
  flex: 1;
  text-align: center;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3));
  border-radius: 12px;
  padding: 8px 4px 10px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.6));
}
.byg-trigram-symbol { font-size: 30px; line-height: 1.2; }
.byg-trigram-name { font-size: 13px; font-weight: 700; margin-top: 2px; }
.byg-trigram-meta { font-size: 11px; color: var(--dsw-alias-label-secondary, #666); margin-top: 2px; }
.byg-swap-arrow { font-size: 20px; color: var(--dsw-alias-label-secondary, #999); }
.byg-chip {
  display: inline-block;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.byg-chip[data-element="wood"] { background: #43a047; }
.byg-chip[data-element="fire"] { background: #e53935; }
.byg-chip[data-element="earth"] { background: #b8860b; }
.byg-chip[data-element="metal"] { background: #78909c; }
.byg-chip[data-element="water"] { background: #1e88e5; }

.byg-relation-row { text-align: center; font-size: 11px; color: var(--dsw-alias-label-secondary, #666); margin-bottom: 10px; }

.byg-verdict {
  border-radius: 12px;
  padding: 10px 12px;
  text-align: center;
  border: 1px solid transparent;
}
.byg-verdict[data-tone="auspicious"] {
  background: linear-gradient(145deg, rgba(76,175,80,.12), rgba(255,215,0,.10));
  border-color: rgba(76,175,80,.45);
}
.byg-verdict[data-tone="neutral"] {
  background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.04));
  border-color: var(--dsw-alias-border-l1, rgba(128,128,128,.35));
}
.byg-verdict[data-tone="ominous"] {
  background: linear-gradient(145deg, rgba(244,67,54,.12), rgba(255,152,0,.10));
  border-color: rgba(244,67,54,.45);
}
.byg-level { font-size: 20px; font-weight: 800; letter-spacing: 2px; }
.byg-verdict[data-tone="auspicious"] .byg-level { color: #d4a017; }
.byg-verdict[data-tone="neutral"] .byg-level { color: var(--dsw-alias-label-primary, #444); }
.byg-verdict[data-tone="ominous"] .byg-level { color: #d32f2f; }
.byg-chance { font-size: 12px; margin-top: 2px; color: var(--dsw-alias-label-secondary, #666); }
.byg-verse { font-size: 12px; margin-top: 4px; font-style: italic; color: var(--dsw-alias-label-primary, #333); }

.byg-changeline-note { font-size: 11px; text-align: center; color: var(--dsw-alias-label-secondary, #888); margin-top: 8px; }

/* ---- 操作 ---- */
.byg-actions { display: flex; justify-content: center; margin-top: 10px; }
.byg-again {
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.4));
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.7));
  color: var(--dsw-alias-label-primary, #222);
  border-radius: 999px;
  padding: 5px 16px;
  font-size: 12px;
  cursor: pointer;
  transition: transform .15s ease;
}
.byg-again:hover { transform: translateY(-1px); }

.byg-error {
  font-size: 12px;
  color: var(--dsw-alias-state-error-primary, #d32f2f);
  text-align: center;
  margin-top: 8px;
}

/* ---- 动画 ---- */
@keyframes byg-toss-front {
  0%   { transform: rotateY(-540deg) translateY(-22px); }
  55%  { transform: rotateY(-240deg) translateY(-10px); }
  100% { transform: rotateY(0deg) translateY(0); }
}
@keyframes byg-toss-back {
  0%   { transform: rotateY(540deg) translateY(-22px); }
  55%  { transform: rotateY(320deg) translateY(-10px); }
  100% { transform: rotateY(180deg) translateY(0); }
}
@keyframes byg-rumble {
  0%, 100% { rotate: -8deg; }
  50% { rotate: 8deg; }
}

@media (prefers-reduced-motion: reduce) {
  .byg-badge, .byg-card, .byg-leaf-inner, .byg-hex-row { transition: none; }
  .byg-leaf-inner[data-face="front"].byg-leaf-toss,
  .byg-leaf-inner[data-face="back"].byg-leaf-toss,
  .byg-leaf.pending .byg-leaf-inner { animation: none; }
}
`
