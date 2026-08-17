# 卜上一卦（Draw a Fortune）

一个运行在 DeepSeek Harness（DSH）中的悬浮起卦插件：**页面首次加载**与**每次发起任务**时自动起卦；以本卦/变卦的**五行生克**断吉凶。

- 悬浮部件：右下角轻 3D 浮钮，可展开/收起，不遮挡、不干扰会话使用。
- 现代模块化工程：纯函数核心 + 异步引擎 + worker_threads 多线程批算 + 完整测试套件。
- 可拔插扩展：随机源（Strategy）、记录仓库（Repository）、数据删除/查询扩展点已就位。

---

<div align="center">
  <img src="docs/fortune-badge.svg" alt="收起态：右下角 ☯ 浮钮" width="45%" />
  <img src="docs/fortune-result.svg" alt="占卜结果卡：六爻从下到上、下卦浅黄/上卦浅灰/变爻蓝、本卦变卦汉字标识" width="45%" />
</div>

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

## 快速开始

```bash
# 不需要 node_modules（测试用的 react 已通过 junction 复用 DSH 缓存）

npm test        # 运行全部 44 项测试（含多线程与 SSR 冒烟）
npm run demo    # 单卦详示 + 4000 卦 / 4 线程批算统计
npm run build   # 重新生成 dist/plugin/*.code.js
npm run check   # 语法检查 + 重建 + 生成代码执行验证
```

### 在 DSH 中安装插件（静态模块）

插件以**静态 DSH 模块**形式安装，随 profile 启动自动加载，无需运行时 `cordis_define`。
`dist/plugin/` 下已就绪静态模块文件：`package.json`（模块清单，含 `dsh.bundle` 声明）、
`index.js`（Node 半体）、`client.js`（浏览器半体，内联本地起卦引擎与 UI 组件）、
`cordis.patch.yml`（profile 补丁层，向宿主 Loader 插入插件条目）。

1. 安装插件到 web profile（`dsh plugin` 转发到 pnpm；`dsh.bundle` 声明会让插件自动加入
   `dsh.profile.bundles`，**无需手动编辑 profile 的 `cordis.patch.yml`**）：
   ```powershell
   dsh plugin --profile web add .\dist\plugin
   ```

2. 重启 web profile（静态模块在启动时扫描加载）：
   ```powershell
   dsh web
   ```

3. 重启后右下角出现 ☯ 浮钮：
   - 页面加载自动起卦；
   - 每次发起任务（发送消息）自动起卦；
   - 点击浮钮手动起卦；点 × 收起。
   - **每一爻完全随机**：每次掷叶独立消费一次随机源（正/反各 50%），
     与历史爻、相邻爻无关，无缓存无模式（见 `test/randomness.test.js` 统计验证）；
   - **结果完整显示**：占卜完成后的卡片保持展开（本卦→变卦、五行生克、吉凶判词
     全部清晰可见），不自动收起，由用户手动关闭或由新起卦替换；
   - 叶片上的「阳/阴」为纯文字标识，无装饰横线/竖线。


