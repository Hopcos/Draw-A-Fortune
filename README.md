# 卜上一卦（Draw a Fortune）· DSH 动态 Cordis 插件

> 界面预览（与运行时界面同款数据与配色 1:1 还原）：

<div align="center">

![收起态：右下角 ☯ 浮钮](docs/fortune-badge.svg)

![占卜结果卡：六爻从下到上、下卦浅黄/上卦浅灰/变爻蓝、本卦变卦汉字标识](docs/fortune-result.svg)

</div>

一个运行在 DeepSeek Harness（DSH）中的悬浮起卦插件：**页面首次加载**与**每次发起任务**时自动起卦；
随机扔 6 片树叶定六爻，取天机数定动爻（变爻），以本卦/变卦的**五行生克**断吉凶。

- 悬浮部件：右下角轻 3D 浮钮，可展开/收起，不遮挡、不干扰会话使用。
- 现代模块化工程：纯函数核心 + 异步引擎 + worker_threads 多线程批算 + 完整测试套件。
- 可拔插扩展：随机源（Strategy）、记录仓库（Repository）、数据删除/查询扩展点已就位。

---

## 一、需求 → 设计映射

| 需求 | 实现 |
| --- | --- |
| 页面首次加载触发 | Client `FortuneAuto` 挂载即起卦（reason=`page-load`） |
| 发起每个任务时触发 | 订阅 `useSessions`，当前会话 `running` 由 false→true 上升沿起卦（reason=`task-start`）；任务已在运行时首次加载也会起卦 |
| 下卦：随机扔 3 片树叶（正=阳爻、反=阴爻） | `tossTrigramBits` 掷 3 叶定 1~3 爻 |
| 上卦：再随机扔 3 片树叶 | 同上定 4~6 爻 |
| 先下后上按 1~6 构建六爻 | `castHexagram`：`lines = lower.concat(upper)` |
| 随机数字对 6 求模（0~5；1~5 为第几爻，0 为第 6 爻） | `mod = raw % 6`，`changingLine = mod === 0 ? 6 : mod` |
| 该爻动（阴↔阳） | `flipped[changingIndex] = 1 - flipped[changingIndex]` |
| 动爻所在卦（上/下）为本卦，变后为变卦 | 爻位 1~3→下卦，4~6→上卦；`base`=动前卦，`changed`=动后卦 |
| 本卦与变卦五行生克断吉凶 | `classifyRelation`（生/克/同五行）→ `FORTUNE_BY_RELATION` 五级吉凶 |

### 吉凶表（与需求一致）

| 五行关系 | 吉凶 | 概率 | 结果 |
| --- | --- | --- | --- |
| 结果生开始 | 大吉 | 约 90% | 事必成 |
| 始终如一（五行同） | 次吉 | 约 70% | 事易成 |
| 开始克结果 | 中平 | 40%–60% | 事可成 |
| 开始生结果 | 小凶 | 30% 以下 | 事难成 |
| 结果克开始 | 大凶 | 10% 以下 | 事不成 |

五行采用常用后天八卦五行：乾兑=金、离=火、震巽=木、坎=水、艮坤=土。
任意两个不同的五行恰好满足「生/克」四种关系之一（相同为第五类），五分类完备且互斥。

---

## 二、目录结构（清晰模块化）

```
dsh_test/
├─ package.json                # ESM 项目，scripts: test / demo / build / check
├─ README.md
├─ src/
│  ├─ core/                    # ★ 纯函数领域核心（无副作用、线程安全）
│  │  ├─ elements.js           #   五行：相生/相克环 + 关系分类（策略）
│  │  ├─ trigrams.js           #   八卦：三爻位数据表 + 查找工厂
│  │  ├─ leaves.js             #   掷叶：可注入 RNG 策略 + 种子化 PRNG
│  │  ├─ hexagram.js           #   起卦：六爻/天机数/动爻/本卦变卦（业务流程核心）
│  │  ├─ fortune.js            #   吉凶：五行关系 → 五级吉凶映射表
│  │  └─ index.js              #   门面：对外统一导出（Node 侧用）
│  ├─ engine/
│  │  ├─ divine-engine.js      #   异步起卦引擎 + 记录仓库（仓储模式，含增删查扩展点）
│  │  ├─ batch-worker.js       #   worker_threads 入口（每线程独立种子）
│  │  └─ batch-engine.js       #   多线程批算：分片 → Promise.all 并行 → 聚合统计
│  ├─ ui/
│  │  ├─ styles.js             #   轻 3D 样式表（CSS 字符串，主题变量 + 语义色）
│  │  ├─ state.js              #   界面状态机（纯 reducer：掷叶进度/结果/收起）
│  │  └─ widget.js             #   React 悬浮部件（仅 createElement，自动/手动触发）
│  ├─ plugin/
│  │  └─ bundle.js             #   打包器：模块化源码 → 自包含插件代码（host/client 骨架内嵌于此，
│  │                           #   单一事实来源：产物见 dist/plugin/*.code.js）
│  └─ demo/
│     └─ cli.js                #   演示：单卦详示 + 4000 卦/4 线程批算统计
├─ dist/plugin/
│  ├─ host.code.js             #   ★ 打包产物：自包含 Host 函数体（供 cordis_define）
│  └─ client.code.js           #   ★ 打包产物：自包含 Client 函数体（供 cordis_define）
└─ test/                       # node:test 全套测试（44 项）
   ├─ elements.test.js         #   五行关系完备性/闭环
   ├─ trigrams.test.js         #   八卦表/互补对/模式全覆盖
   ├─ hexagram.test.js         #   起卦确定性/动爻映射/边界/翻转
   ├─ fortune.test.js          #   吉凶表与需求逐字一致
   ├─ divine-engine.test.js    #   异步引擎/并发/仓库有界/增删清
   ├─ batch-engine.test.js     #   多线程批算/动爻均匀性/参数防护
   ├─ ui-state.test.js         #   界面状态机各阶段
   ├─ ui-ssr.test.js           #   真实 React 18 SSR 渲染冒烟
   └─ generated-code.test.js   #   打包产物执行验证（host RPC + client 槽位）
```

---

## 三、架构与设计原则

| 原则 | 落地 |
| --- | --- |
| 模块化 / 插件式 | 领域核心(纯) → 引擎(异步) → 界面(React) → 插件壳(host/client)，单向依赖 |
| 单一事实来源 | `src/plugin/bundle.js` 把模块化源码拼装为自包含插件代码，杜绝双份逻辑漂移 |
| 策略（Strategy） | 随机源可注入：默认 `Math.random`，测试/多线程注入种子化 `mulberry32` |
| 工厂（Factory） | `trigramByBits` 三爻位 → 卦定义；`createDivineEngine` 依赖注入工厂 |
| 仓储（Repository） | `records` 有界 FIFO + `divine/list/remove/clear`，为「写入/删除数据」预留扩展点 |
| 门面（Facade） | `createDivineEngine` 对外统一异步 API；`castHexagram` 纯函数门面 |
| 还原论 / 纯函数 | 所有判定无副作用，JSON 安全，可在任意线程/进程复制执行 |
| 异步编程 | 引擎 `await Promise.resolve()` 让出事件循环；批算 `Promise.all`；界面时序用 `ctx.timeout` |
| 多线程编程 | `worker_threads` 分片并行（演示与测试覆盖）；核心纯函数天然线程安全 |
| 代码可读性 | JSDoc 中文注释、单一职责、命名一致、每模块自顶向下可读 |

> 说明：DSH 动态插件运行沙箱不提供 `worker_threads`/浏览器 Worker，插件的「并发
> 性」以异步编排（非阻塞时序、并发 Promise）实现；**真正的多线程批算**在引擎与测试
> 中通过 `worker_threads` 落地，二者共享同一套纯函数核心——这就是「可复用的并发
> 设计」：把逻辑与执行模型解耦。

---

## 四、快速开始

```bash
# 不需要 node_modules（测试用的 react 已通过 junction 复用 DSH 缓存）

npm test        # 运行全部 44 项测试（含多线程与 SSR 冒烟）
npm run demo    # 单卦详示 + 4000 卦 / 4 线程批算统计
npm run build   # 重新生成 dist/plugin/*.code.js
npm run check   # 语法检查 + 重建 + 生成代码执行验证
```

### 在 DSH 中激活插件

1. 把 `dist/plugin/*.code.js` 的内容分别作为 `code.host` / `code.client` 交给
   `cordis_define`（或让代理从该目录读取后定义）；也可以直接运行：
   `npm run build` 后，将两个产物作为插件代码导入。
2. `cordis_run` 激活。客户端授权后，右下角出现 ☯ 浮钮：
   - 页面加载自动起卦；
   - 每次发起任务（发送消息）自动起卦；
   - 点击浮钮手动起卦；点 × 收起。
   - **每一爻完全随机**：每次掷叶独立消费一次随机源（正/反各 50%），
     与历史爻、相邻爻无关，无缓存无模式（见 `test/randomness.test.js` 统计验证）；
   - **结果完整显示**：占卜完成后的卡片保持展开（本卦→变卦、五行生克、吉凶判词
     全部清晰可见），不自动收起，由用户手动关闭或由新起卦替换；
   - 叶片上的「阳/阴」为纯文字标识，无装饰横线/竖线。

---

## 五、验收记录（多轮自测）

| 轮次 | 内容 | 结果 |
| --- | --- | --- |
| 1 | 全量测试首跑 | 44 项，2 项失败（`slice(-0)` 返回全量；client render 断言层级错误）→ 修复 |
| 2 | 全量测试复跑 | 44/44 通过 |
| 3 | 演示 CLI（单卦 + 4000 卦/4 线程） | 动爻分布均匀（16.2%~17.3%），五级吉凶齐全 |
| 4 | 打包产物执行验证 | host 四 RPC（divine/history/forget/clear）可用；client 注入样式并注册 shell.overlay |
| 5 | React 18 SSR 渲染 | 手动/自动两模式徽章 + 完整结果卡片（本卦/变卦/判词/动爻）渲染不崩溃 |
| 6 | 生成代码静态检查 | 无被禁用的浏览器全局（setTimeout/fetch/window 等） |

更多验证：`npm test`（确定性种子可复现；随机 200 例结构不变量；6000 卦动爻均匀性 ±40% 容差）。
