/**
 * 卜上一卦 领域门面（Facade）：对外的统一入口。
 *
 * 对外暴露：起卦、掷叶、五行、八卦、吉凶及引擎工厂。
 * 说明：打包器不使用本文件（插件代码为自包含 IIFE，逐文件拼接 core 模块），
 * 本文件仅供 Node 侧（测试 / 演示 / 开发）使用。
 */

export * from './elements.js'
export * from './trigrams.js'
export * from './leaves.js'
export * from './fortune.js'
export * from './hexagram.js'
