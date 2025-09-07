#!/usr/bin/env node
/**
 * Chromium 下载工具
 * 支持多线程、断点续传、自动重试和进度监控
 */

const { ensureChromiumReady, detectPlatform, getChromiumExecutablePath } = require('./cross-platform-chromium');

async function main() {
    console.log('🚀 Chromium 下载工具');
    console.log('================');
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const options = {
        threads: 8,      // 默认8线程
        retries: 5,      // 默认重试5次
        timeout: 120000, // 默认2分钟超时
        force: false     // 强制重新下载
    };
    
    // 解析参数
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--threads':
            case '-t':
                options.threads = parseInt(args[++i]) || 8;
                break;
            case '--retries':
            case '-r':
                options.retries = parseInt(args[++i]) || 5;
                break;
            case '--timeout':
                options.timeout = parseInt(args[++i]) * 1000 || 120000;
                break;
            case '--force':
            case '-f':
                options.force = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }
    
    console.log('⚙️  下载配置:');
    console.log(`   📊 线程数: ${options.threads}`);
    console.log(`   🔄 重试次数: ${options.retries}`);
    console.log(`   ⏱️  超时: ${options.timeout/1000}s`);
    console.log(`   🔧 强制下载: ${options.force ? '是' : '否'}`);
    console.log('');
    
    try {
        if (options.force) {
            // 强制重新下载，先删除现有文件
            const path = require('path');
            const fs = require('fs').promises;
            const { existsSync } = require('fs');
            
            const platformId = detectPlatform();
            const serverRoot = path.resolve(__dirname, '../../');
            const chromiumDir = path.join(serverRoot, 'prebuilt', 'chromium', platformId);
            
            if (existsSync(chromiumDir)) {
                console.log('🗑️  删除现有 Chromium 文件...');
                await fs.rmdir(chromiumDir, { recursive: true });
            }
        }
        
        const executablePath = await ensureChromiumReady(options);
        
        console.log('');
        console.log('🎉 Chromium 准备完成！');
        console.log(`📁 可执行文件: ${executablePath}`);
        
        // 验证可执行文件
        const { spawn } = require('child_process');
        console.log('🔍 验证 Chromium 版本...');
        
        const versionProcess = spawn(executablePath, ['--version'], { 
            stdio: 'pipe',
            timeout: 10000 
        });
        
        let versionOutput = '';
        versionProcess.stdout.on('data', (data) => {
            versionOutput += data.toString();
        });
        
        versionProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${versionOutput.trim()}`);
            } else {
                console.warn('⚠️  无法获取 Chromium 版本信息');
            }
        });
        
        versionProcess.on('error', (error) => {
            console.warn('⚠️  验证版本时出错:', error.message);
        });
        
    } catch (error) {
        console.error('❌ 下载失败:', error.message);
        console.error('');
        console.error('💡 解决建议:');
        console.error('  1. 检查网络连接');
        console.error('  2. 使用代理或镜像');
        console.error('  3. 增加重试次数: --retries 10');
        console.error('  4. 减少线程数: --threads 4');
        console.error('  5. 手动下载并解压到 prebuilt/chromium 目录');
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
Chromium 下载工具

用法: node download-chromium.js [选项]

选项:
  -t, --threads <num>    下载线程数 (默认: 8)
  -r, --retries <num>    最大重试次数 (默认: 5)
  --timeout <seconds>    下载超时时间，秒 (默认: 120)
  -f, --force           强制重新下载
  -h, --help            显示帮助信息

示例:
  node download-chromium.js                    # 使用默认配置
  node download-chromium.js -t 4 -r 10         # 4线程，最多重试10次
  node download-chromium.js --force            # 强制重新下载
  node download-chromium.js --timeout 300      # 设置5分钟超时

注意:
  - 支持断点续传，意外中断后可直接重新运行
  - 建议在网络不稳定时减少线程数
  - 大文件下载建议增加超时时间
    `);
}

// 处理进程信号
process.on('SIGINT', () => {
    console.log('\n\n⚠️  下载被中断');
    console.log('💡 可以重新运行命令继续下载（支持断点续传）');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n⚠️  下载被终止');
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}

module.exports = main;
