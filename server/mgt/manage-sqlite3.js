#!/usr/bin/env node
/**
 * SQLite3 预编译模块管理工具
 * 用于构建、导出和管理不同平台的 SQLite3 模块
 */

const { instance } = require('../src/utils/cross-platform-sqlite3');
const fs = require('fs');
const path = require('path');

const commands = {
    info: '显示当前平台信息',
    export: '导出当前平台的 SQLite3 模块',
    list: '列出所有可用的预编译模块',
    clean: '清理预编译模块目录',
    rebuild: '重建当前平台的 SQLite3 模块'
};

async function showPlatformInfo() {
    const info = instance.getPlatformInfo();
    console.log('📋 Platform Information:');
    console.log('========================');
    console.log(`Platform:     ${info.platform}`);
    console.log(`Architecture: ${info.arch}`);
    console.log(`Platform Key: ${info.platformKey}`);
    console.log(`Node.js:      ${info.node}`);
    console.log(`SQLite3:      ${info.isLoaded ? '✅ Loaded' : '❌ Not loaded'}`);
    console.log(`Prebuilt:     ${info.hasPrebuilt ? '✅ Available' : '❌ Not available'}`);
}

async function exportCurrentBuild() {
    try {
        console.log('📦 Exporting current SQLite3 build...');
        const exportPath = await instance.exportCurrentBuild();
        console.log('✅ Export completed successfully!');
        return exportPath;
    } catch (error) {
        console.error('❌ Export failed:', error.message);
        throw error;
    }
}

async function listPrebuiltModules() {
    const prebuiltDir = path.join(__dirname, '../prebuilt/sqlite3');
    
    if (!fs.existsSync(prebuiltDir)) {
        console.log('📁 No prebuilt modules directory found');
        return;
    }

    const platforms = fs.readdirSync(prebuiltDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    if (platforms.length === 0) {
        console.log('📁 No prebuilt modules found');
        return;
    }

    console.log('📦 Available Prebuilt Modules:');
    console.log('===============================');

    for (const platform of platforms) {
        const platformDir = path.join(prebuiltDir, platform);
        const infoPath = path.join(platformDir, 'platform-info.json');
        const binaryPath = path.join(platformDir, 'node_sqlite3.node');

        if (fs.existsSync(binaryPath)) {
            let info = { buildDate: 'Unknown', nodeVersion: 'Unknown' };
            if (fs.existsSync(infoPath)) {
                try {
                    info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                } catch (e) {
                    // 忽略解析错误
                }
            }

            const stats = fs.statSync(binaryPath);
            console.log(`📱 ${platform}:`);
            console.log(`   Binary:    ${binaryPath}`);
            console.log(`   Size:      ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Built:     ${info.buildDate}`);
            console.log(`   Node.js:   ${info.nodeVersion}`);
            console.log('');
        }
    }
}

async function cleanPrebuiltModules() {
    const prebuiltDir = path.join(__dirname, '../prebuilt/sqlite3');
    
    if (!fs.existsSync(prebuiltDir)) {
        console.log('📁 No prebuilt modules directory to clean');
        return;
    }

    const { rimraf } = require('rimraf');
    await rimraf(prebuiltDir);
    console.log('🧹 Cleaned prebuilt modules directory');
}

async function rebuildSQLite3() {
    try {
        console.log('🔨 Rebuilding SQLite3 module...');
        await instance.rebuildSQLite3();
        console.log('✅ Rebuild completed successfully!');
    } catch (error) {
        console.error('❌ Rebuild failed:', error.message);
        throw error;
    }
}

async function main() {
    const command = process.argv[2];

    if (!command || !commands[command]) {
        console.log('SQLite3 预编译模块管理工具');
        console.log('============================');
        console.log('');
        console.log('使用方法:');
        console.log('  node mgt/manage-sqlite3.js <command>');
        console.log('');
        console.log('可用命令:');
        for (const [cmd, desc] of Object.entries(commands)) {
            console.log(`  ${cmd.padEnd(10)} ${desc}`);
        }
        console.log('');
        console.log('示例:');
        console.log('  node mgt/manage-sqlite3.js info     # 显示平台信息');
        console.log('  node mgt/manage-sqlite3.js export   # 导出当前构建');
        console.log('  node mgt/manage-sqlite3.js list     # 列出预编译模块');
        return;
    }

    try {
        switch (command) {
            case 'info':
                await showPlatformInfo();
                break;
            case 'export':
                await exportCurrentBuild();
                break;
            case 'list':
                await listPrebuiltModules();
                break;
            case 'clean':
                await cleanPrebuiltModules();
                break;
            case 'rebuild':
                await rebuildSQLite3();
                break;
            default:
                console.error(`Unknown command: ${command}`);
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    showPlatformInfo,
    exportCurrentBuild,
    listPrebuiltModules,
    cleanPrebuiltModules,
    rebuildSQLite3
};
