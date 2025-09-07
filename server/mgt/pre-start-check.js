#!/usr/bin/env node
/**
 * 启动前预检查脚本
 * 在启动应用前检查并确保所有依赖模块准备就绪
 */

const { ensureSQLite3Ready } = require('../src/utils/cross-platform-sqlite3');
const { ensureChromiumReady } = require('../src/utils/cross-platform-chromium');

async function main() {
    try {
        console.log('🚀 ICPADS 2025 Backend 启动前检查...\n');
        
        // 确保 SQLite3 准备就绪
        await ensureSQLite3Ready();
        
        // 确保 Chromium 准备就绪
        await ensureChromiumReady();
        
        console.log('\n✅ 所有依赖已就绪，启动应用程序...\n');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ 启动前检查失败:', error.message);
        process.exit(1);
    }
}

// 如果是直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = main;
