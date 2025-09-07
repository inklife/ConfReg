#!/usr/bin/env node
/**
 * 跨平台 Chromium 管理工具
 * 自动检测平台并下载对应的 Chromium 二进制文件
 */

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const { createWriteStream, existsSync } = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipeline = promisify(pipeline);

// 全局下载统计
let downloadStats = {
    totalBytes: 0,
    downloadedBytes: 0,
    startTime: 0,
    chunks: [],
    isActive: false,
    progressFile: null // 添加进度文件路径
};

/**
 * 保存下载进度到文件
 */
async function saveProgress() {
    if (!downloadStats.progressFile) return;
    
    try {
        const progressInfo = {
            totalSize: downloadStats.totalBytes,
            chunks: downloadStats.chunks.map(c => ({
                start: c.start || 0,
                end: c.end || 0,
                index: c.index || 0,
                downloaded: c.downloaded || 0,
                total: c.total || 0
            })),
            timestamp: Date.now(),
            strategy: 'multithread',
            downloadedBytes: downloadStats.downloadedBytes
        };
        
        await fs.writeFile(downloadStats.progressFile, JSON.stringify(progressInfo, null, 2));
    } catch (error) {
        console.warn('保存进度文件失败:', error.message);
    }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 */
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
        return `${mins}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * 显示下载进度
 */
function showDownloadProgress() {
    if (!downloadStats.isActive) return;
    
    const now = Date.now();
    const elapsed = (now - downloadStats.startTime) / 1000;
    
    // 确保进度不超过100%
    const rawProgress = downloadStats.totalBytes > 0 ? 
        (downloadStats.downloadedBytes / downloadStats.totalBytes * 100) : 0;
    const progress = Math.min(100, Math.max(0, rawProgress));
    
    const speed = elapsed > 0 ? downloadStats.downloadedBytes / elapsed : 0;
    
    // 计算剩余时间，确保不为负数
    let eta = 0;
    if (speed > 0 && downloadStats.downloadedBytes < downloadStats.totalBytes) {
        eta = Math.max(0, (downloadStats.totalBytes - downloadStats.downloadedBytes) / speed);
    }
    
    const progressBar = '='.repeat(Math.max(0, Math.floor(progress / 2))) + 
                       '-'.repeat(Math.max(0, 50 - Math.floor(progress / 2)));
    
    // 显示的下载字节数不超过总大小
    const displayDownloaded = Math.min(downloadStats.downloadedBytes, downloadStats.totalBytes);
    
    process.stdout.write(
        `\r📥 [${progressBar}] ${progress.toFixed(1)}% ` +
        `| ${formatBytes(displayDownloaded)}/${formatBytes(downloadStats.totalBytes)} ` +
        `| 速度: ${formatBytes(speed)}/s ` +
        `| 剩余: ${formatTime(eta)} ` +
        `| 线程: ${downloadStats.chunks.filter(c => c.active).length}/${downloadStats.chunks.length}`
    );
}

/**
 * 启动进度监控
 */
function startProgressMonitor() {
    downloadStats.isActive = true;
    downloadStats.startTime = Date.now();
    
    let progressSaveCounter = 0;
    
    const interval = setInterval(async () => {
        if (!downloadStats.isActive) {
            clearInterval(interval);
            return;
        }
        
        showDownloadProgress();
        
        // 每10次更新（5秒）保存一次进度
        progressSaveCounter++;
        if (progressSaveCounter >= 10) {
            progressSaveCounter = 0;
            await saveProgress();
        }
    }, 500); // 每500ms更新一次
    
    return interval;
}

/**
 * 检测当前平台信息
 */
function detectPlatform() {
    const platform = os.platform();
    const arch = os.arch();
    
    console.log(`🔍 检测到系统平台: ${platform}, 架构: ${arch}`);
    
    // 平台映射表
    const platformMap = {
        'win32': {
            'x64': 'windows-x64',
            'x32': 'windows-x32'
        },
        'darwin': {
            'x64': 'macos-x64',
            'arm64': 'macos-arm64'
        },
        'linux': {
            'x64': 'linux-x64',
            'arm64': 'linux-arm64'
        }
    };
    
    if (!platformMap[platform] || !platformMap[platform][arch]) {
        throw new Error(`不支持的平台: ${platform}-${arch}`);
    }
    
    return platformMap[platform][arch];
}

/**
 * 获取 Chromium 下载 URL
 */
function getChromiumDownloadInfo(platformId) {
    // 使用兼容版本的 Chromium 
    // 这些版本经过测试，与当前 puppeteer-core 兼容
    const chromiumConfig = {
        'windows-x64': {
            url: 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win_x64%2F1230501%2Fchrome-win.zip?generation=1701250567654085&alt=media',
            executable: 'chrome-win/chrome.exe',
            revision: '1230501'
        },
        'windows-x32': {
            url: 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win%2F1226644%2Fchrome-win.zip?generation=1700446540937405&alt=media',
            executable: 'chrome-win/chrome.exe',
            revision: '1226644'
        },
        'macos-x64': {
            url: 'https://storage.googleapis.com/chromium-browser-snapshots/Mac/1511947/chrome-mac.zip',
            executable: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
            revision: '1511947'
        },
        'macos-arm64': {
            url: 'https://storage.googleapis.com/chromium-browser-snapshots/Mac_Arm/1511950/chrome-mac.zip',
            executable: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
            revision: '1511950'
        },
        'linux-x64': {
            url: 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F1231300%2Fchrome-linux.zip?generation=1701355787197325&alt=media',
            executable: 'chrome-linux/chrome',
            revision: '1231300'
        },
        'linux-arm64': {
            url: null, // 暂不支持，提示用户手动下载
            executable: 'chrome-linux/chrome',
            revision: null
        }
    };
    
    return chromiumConfig[platformId];
}

/**
 * 获取 Chromium 本地路径
 */
function getChromiumPaths(platformId) {
    const serverRoot = path.resolve(__dirname, '../../');
    const chromiumDir = path.join(serverRoot, 'prebuilt', 'chromium', platformId);
    const downloadInfo = getChromiumDownloadInfo(platformId);
    const executablePath = path.join(chromiumDir, downloadInfo.executable);
    
    return {
        chromiumDir,
        executablePath,
        downloadInfo
    };
}

/**
 * 检查 Chromium 是否存在
 */
async function checkChromiumExists(platformId) {
    const { executablePath } = getChromiumPaths(platformId);
    
    try {
        await fs.access(executablePath);
        console.log(`✅ Chromium 已存在: ${executablePath}`);
        return true;
    } catch (error) {
        console.log(`❌ Chromium 不存在: ${executablePath}`);
        return false;
    }
}

/**
 * 获取文件大小
 */
async function getFileSize(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await new Promise((resolve, reject) => {
                const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (response) => {
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        return getFileSize(response.headers.location, retries - i - 1)
                            .then(resolve)
                            .catch(reject);
                    }
                    
                    if (response.statusCode === 200) {
                        const size = parseInt(response.headers['content-length'] || '0');
                        resolve(size);
                    } else {
                        reject(new Error(`获取文件大小失败，状态码: ${response.statusCode}`));
                    }
                });
                
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('获取文件大小超时'));
                });
                req.end();
            });
        } catch (error) {
            console.warn(`获取文件大小失败 (尝试 ${i + 1}/${retries}):`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

/**
 * 下载文件片段（流式写入，支持实时保存）
 */
async function downloadChunkStreaming(url, start, end, chunkIndex, totalChunks, tempFilePath, retries = 3) {
    // 初始化下载统计中的片段信息
    if (!downloadStats.chunks[chunkIndex]) {
        downloadStats.chunks[chunkIndex] = {
            start,
            end,
            index: chunkIndex,
            downloaded: 0,
            total: end - start + 1,
            active: false
        };
    }
    
    for (let i = 0; i < retries; i++) {
        try {
            downloadStats.chunks[chunkIndex].active = true;
            
            return await new Promise((resolve, reject) => {
                const headers = {
                    'Range': `bytes=${start}-${end}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                };
                
                const req = https.request(url, { 
                    method: 'GET', 
                    headers, 
                    timeout: 30000 
                }, (response) => {
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        downloadStats.chunks[chunkIndex].active = false;
                        return downloadChunkStreaming(response.headers.location, start, end, chunkIndex, totalChunks, tempFilePath, retries - i - 1)
                            .then(resolve)
                            .catch(reject);
                    }
                    
                    if (response.statusCode !== 206 && response.statusCode !== 200) {
                        downloadStats.chunks[chunkIndex].active = false;
                        return reject(new Error(`下载片段失败，状态码: ${response.statusCode}`));
                    }
                    
                    let downloadedSize = 0;
                    let currentPosition = start;
                    const writeBuffer = [];
                    
                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        writeBuffer.push({ data: chunk, position: currentPosition });
                        currentPosition += chunk.length;
                        
                        // 更新全局统计 - 只增加新下载的字节
                        downloadStats.downloadedBytes += chunk.length;
                        downloadStats.chunks[chunkIndex].downloaded = downloadedSize;
                    });
                    
                    response.on('end', async () => {
                        try {
                            // 批量写入数据到指定位置
                            await writeChunkToFile(tempFilePath, writeBuffer);
                            downloadStats.chunks[chunkIndex].active = false;
                            
                            // 立即保存进度（重要片段完成时）
                            await saveProgress();
                            
                            resolve({ chunkIndex, start, end, downloadedSize });
                        } catch (error) {
                            downloadStats.chunks[chunkIndex].active = false;
                            reject(error);
                        }
                    });
                    
                    response.on('error', (error) => {
                        downloadStats.chunks[chunkIndex].active = false;
                        reject(error);
                    });
                });
                
                req.on('error', (error) => {
                    downloadStats.chunks[chunkIndex].active = false;
                    reject(error);
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    downloadStats.chunks[chunkIndex].active = false;
                    reject(new Error(`下载片段 ${chunkIndex + 1} 超时`));
                });
                req.end();
            });
        } catch (error) {
            downloadStats.chunks[chunkIndex].active = false;
            console.warn(`\n⚠️  片段 ${chunkIndex + 1} 失败 (尝试 ${i + 1}/${retries}):`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

/**
 * 线程安全地写入数据块到文件的指定位置
 */
async function writeChunkToFile(filePath, writeBuffer) {
    // 使用独立的文件句柄进行位置写入
    let fileHandle = null;
    try {
        fileHandle = await fs.open(filePath, 'r+'); // 以读写模式打开
        
        for (const { data, position } of writeBuffer) {
            await fileHandle.write(data, 0, data.length, position);
        }
    } finally {
        if (fileHandle) {
            await fileHandle.close();
        }
    }
}

/**
 * 下载文件片段（内存模式，兼容旧版本）
 */
async function downloadChunk(url, start, end, chunkIndex, totalChunks, retries = 3) {
    // 初始化下载统计中的片段信息
    if (!downloadStats.chunks[chunkIndex]) {
        downloadStats.chunks[chunkIndex] = {
            downloaded: 0,
            total: end - start + 1,
            active: false
        };
    }
    
    for (let i = 0; i < retries; i++) {
        try {
            downloadStats.chunks[chunkIndex].active = true;
            
            return await new Promise((resolve, reject) => {
                const headers = {
                    'Range': `bytes=${start}-${end}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                };
                
                const req = https.request(url, { 
                    method: 'GET', 
                    headers, 
                    timeout: 30000 
                }, (response) => {
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        downloadStats.chunks[chunkIndex].active = false;
                        return downloadChunk(response.headers.location, start, end, chunkIndex, totalChunks, retries - i - 1)
                            .then(resolve)
                            .catch(reject);
                    }
                    
                    if (response.statusCode !== 206 && response.statusCode !== 200) {
                        downloadStats.chunks[chunkIndex].active = false;
                        return reject(new Error(`下载片段失败，状态码: ${response.statusCode}`));
                    }
                    
                    const chunks = [];
                    let downloadedSize = 0;
                    
                    response.on('data', (chunk) => {
                        chunks.push(chunk);
                        downloadedSize += chunk.length;
                        
                        // 更新全局统计
                        downloadStats.downloadedBytes += chunk.length;
                        downloadStats.chunks[chunkIndex].downloaded = downloadedSize;
                    });
                    
                    response.on('end', () => {
                        downloadStats.chunks[chunkIndex].active = false;
                        const buffer = Buffer.concat(chunks);
                        resolve({ buffer, chunkIndex, start, end });
                    });
                    
                    response.on('error', (error) => {
                        downloadStats.chunks[chunkIndex].active = false;
                        reject(error);
                    });
                });
                
                req.on('error', (error) => {
                    downloadStats.chunks[chunkIndex].active = false;
                    reject(error);
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    downloadStats.chunks[chunkIndex].active = false;
                    reject(new Error(`下载片段 ${chunkIndex + 1} 超时`));
                });
                req.end();
            });
        } catch (error) {
            downloadStats.chunks[chunkIndex].active = false;
            console.warn(`\n⚠️  片段 ${chunkIndex + 1} 失败 (尝试 ${i + 1}/${retries}):`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

/**
 * 多线程下载文件（支持断点续传）
 */
async function downloadFile(url, destination, options = {}) {
    const {
        threads = 4,
        retries = 3,
        timeout = 60000,
        resumeDownload = true
    } = options;
    
    console.log(`📥 开始下载: ${url}`);
    console.log(`🔧 配置: ${threads} 线程, 最大重试 ${retries} 次, 超时 ${timeout/1000}s`);
    
    // 检查是否有未完成的下载
    const tempFile = `${destination}.tmp`;
    const progressFile = `${destination}.progress`;
    let existingSize = 0;
    let savedProgress = null;
    
    // 重置下载统计
    downloadStats = {
        totalBytes: 0,
        downloadedBytes: 0,
        startTime: 0,
        chunks: [],
        isActive: false,
        progressFile: progressFile // 设置进度文件路径
    };
    
    if (resumeDownload && existsSync(tempFile)) {
        try {
            const stats = await fs.stat(tempFile);
            existingSize = stats.size;
            console.log(`🔄 检测到未完成下载，已下载: ${formatBytes(existingSize)}`);
            
            // 尝试读取进度信息
            if (existsSync(progressFile)) {
                const progressData = await fs.readFile(progressFile, 'utf8');
                savedProgress = JSON.parse(progressData);
                console.log(`📊 读取到下载进度信息，线程数: ${savedProgress.chunks?.length || 0}`);
            }
        } catch (error) {
            console.warn('检查临时文件失败:', error.message);
            existingSize = 0;
            savedProgress = null;
        }
    }
    
    let progressInterval;
    
    try {
        // 获取文件总大小
        console.log('🔍 获取文件信息...');
        const totalSize = await getFileSize(url);
        console.log(`📁 文件大小: ${formatBytes(totalSize)}`);
        
        // 设置下载统计
        downloadStats.totalBytes = totalSize;
        downloadStats.downloadedBytes = existingSize; // 从已下载大小开始
        
        if (savedProgress && savedProgress.chunks) {
            // 如果有保存的进度，恢复分片信息
            downloadStats.chunks = savedProgress.chunks.map(chunk => ({
                ...chunk,
                active: false // 重置活跃状态
            }));
        }
        
        // 如果文件已完整下载，重命名并返回
        if (existingSize >= totalSize && existingSize > 0) {
            console.log('✅ 文件已完整下载，重命名中...');
            await fs.rename(tempFile, destination);
            // 清理进度文件
            if (existsSync(progressFile)) {
                await fs.unlink(progressFile).catch(() => {});
            }
            console.log(`✅ 下载完成: ${destination}`);
            return;
        }
        
        // 根据情况选择下载策略
        let useMultithread = true;
        let chunks = [];
        
        if (savedProgress && savedProgress.chunks && savedProgress.totalSize === totalSize) {
            // 有有效的进度信息，使用保存的分片信息
            console.log('� 使用已保存的分片进度信息');
            chunks = savedProgress.chunks.filter(chunk => chunk.downloaded < chunk.total);
            
            // 重新计算已下载的总字节数
            const totalDownloaded = savedProgress.chunks.reduce((sum, chunk) => sum + chunk.downloaded, 0);
            downloadStats.downloadedBytes = totalDownloaded;
            console.log(`📊 根据进度文件重新计算，已下载: ${formatBytes(totalDownloaded)}`);
            
            if (chunks.length === 0) {
                console.log('✅ 所有分片已完成，验证文件完整性...');
                useMultithread = false;
            }
        } else if (existingSize > 0) {
            // 有未完成下载但没有进度信息，使用单线程续传
            console.log('⚠️  没有分片进度信息，使用单线程续传以确保数据完整性');
            useMultithread = false;
            chunks = [{
                start: existingSize,
                end: totalSize - 1,
                index: 0,
                downloaded: 0,
                total: totalSize - existingSize
            }];
        } else {
            // 全新下载，使用多线程
            console.log('🆕 全新下载，计算多线程分片...');
            const chunkSize = Math.ceil(totalSize / threads);
            
            for (let i = 0; i < threads; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize - 1, totalSize - 1);
                
                if (start <= end) {
                    chunks.push({
                        start,
                        end,
                        index: i,
                        downloaded: 0,
                        total: end - start + 1
                    });
                }
            }
        }
        
        if (chunks.length === 0) {
            throw new Error('没有需要下载的分片');
        }
        
        // 创建或验证临时文件
        if (existingSize === 0) {
            const tempFileHandle = await fs.open(tempFile, 'w');
            await tempFileHandle.close();
            console.log(`� 创建新的临时文件: ${tempFile}`);
        } else {
            console.log(`📝 续传模式，当前文件大小: ${formatBytes(existingSize)}`);
        }
        
        console.log(`�🚀 开始 ${chunks.length} 线程下载...`);
        console.log(`📊 下载策略: ${useMultithread ? '多线程' : '单线程续传'}`);
        
        // 保存进度信息
        const progressInfo = {
            totalSize,
            chunks: chunks.map(c => ({ ...c })),
            timestamp: Date.now(),
            strategy: useMultithread ? 'multithread' : 'single'
        };
        await fs.writeFile(progressFile, JSON.stringify(progressInfo, null, 2));
        
        // 启动进度监控
        progressInterval = startProgressMonitor();
        
        // 开始下载
        if (useMultithread) {
            // 多线程并行下载
            const downloadPromises = chunks.map(chunk => 
                downloadChunkStreaming(url, chunk.start, chunk.end, chunk.index, chunks.length, tempFile, retries)
            );
            await Promise.all(downloadPromises);
        } else {
            // 单线程续传
            await downloadChunkStreaming(url, chunks[0].start, chunks[0].end, 0, 1, tempFile, retries);
        }
        
        // 停止进度监控
        downloadStats.isActive = false;
        if (progressInterval) clearInterval(progressInterval);
        
        // 保存最终进度
        await saveProgress();
        
        // 验证文件大小
        const finalStats = await fs.stat(tempFile);
        if (finalStats.size !== totalSize) {
            throw new Error(`文件大小不匹配: 期望 ${formatBytes(totalSize)}, 实际 ${formatBytes(finalStats.size)}`);
        }
        
        // 重命名为最终文件
        await fs.rename(tempFile, destination);
        
        // 清理进度文件
        if (existsSync(progressFile)) {
            await fs.unlink(progressFile).catch(() => {});
        }
        
        console.log(`\n✅ 下载完成: ${destination}`);
        console.log(`📊 最终大小: ${formatBytes(totalSize)}`);
        
        const totalTime = (Date.now() - downloadStats.startTime) / 1000;
        const avgSpeed = totalSize / totalTime;
        console.log(`⚡ 平均速度: ${formatBytes(avgSpeed)}/s`);
        console.log(`⏱️  总用时: ${formatTime(totalTime)}`);
        
    } catch (error) {
        // 停止进度监控
        downloadStats.isActive = false;
        if (progressInterval) clearInterval(progressInterval);
        
        // 保存错误时的进度
        await saveProgress();
        
        console.error(`\n❌ 下载失败:`, error.message);
        
        // 保留临时文件以便断点续传
        if (existsSync(destination)) {
            await fs.unlink(destination).catch(() => {});
        }
        
        console.log(`💾 临时文件已保存: ${tempFile}`);
        if (existsSync(progressFile)) {
            console.log(`📊 进度文件已保存: ${progressFile}`);
        }
        console.log(`🔄 可重新运行命令继续下载`);
        
        throw error;
    }
}

/**
 * 解压 ZIP 文件
 */
async function extractZip(zipPath, extractDir) {
    console.log(`📦 解压文件: ${zipPath} -> ${extractDir}`);
    
    // 使用 Node.js 内置的解压功能（通过子进程）
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
        let unzipCommand;
        let args;
        
        if (process.platform === 'win32') {
            // Windows 使用 PowerShell 的 Expand-Archive
            unzipCommand = 'powershell';
            args = [
                '-Command', 
                `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`
            ];
        } else {
            // Unix 系统使用 unzip
            unzipCommand = 'unzip';
            args = ['-o', zipPath, '-d', extractDir];
        }
        
        console.log(`执行解压命令: ${unzipCommand} ${args.join(' ')}`);
        
        const unzip = spawn(unzipCommand, args, { 
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true 
        });
        
        let stdout = '';
        let stderr = '';
        
        unzip.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        
        unzip.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        
        unzip.on('close', (code) => {
            if (code === 0) {
                console.log('✅ 解压完成');
                resolve();
            } else {
                console.error('解压输出:', stdout);
                console.error('解压错误:', stderr);
                reject(new Error(`解压失败，退出码: ${code}`));
            }
        });
        
        unzip.on('error', (error) => {
            console.error('解压进程错误:', error);
            reject(error);
        });
    });
}

/**
 * 下载并安装 Chromium
 */
async function downloadChromium(platformId, options = {}) {
    const { chromiumDir, downloadInfo } = getChromiumPaths(platformId);

    // Alpine Linux 检测与系统 chromium-browser 软链逻辑
    const isLinux = process.platform === 'linux';
    const fsSync = require('fs');
    const { execSync } = require('child_process');
    let isAlpine = false;
    if (isLinux) {
        try {
            isAlpine = fsSync.existsSync('/etc/alpine-release');
        } catch (e) {
            isAlpine = false;
        }
    }

    if (isLinux && isAlpine && platformId === 'linux-x64') {
        // Alpine Linux，优先查找 /usr/bin/chromium-browser
        const systemChromium = '/usr/bin/chromium-browser';
        const symlinkTarget = path.join(chromiumDir, 'chrome-linux');
        const symlinkPath = path.join(symlinkTarget, 'chrome');
        await fs.mkdir(symlinkTarget, { recursive: true });
        if (fsSync.existsSync(systemChromium)) {
            // 存在则软链
            if (fsSync.existsSync(symlinkPath)) {
                await fs.unlink(symlinkPath);
            }
            await fs.symlink(systemChromium, symlinkPath);
            console.log(`✅ 检测到 Alpine Linux，已软链系统 chromium-browser 到: ${symlinkPath}`);
            return;
        } else {
            // 不存在则尝试自动安装
            console.warn('⚠️ 检测到 Alpine Linux，未检测到 /usr/bin/chromium-browser，尝试自动安装...');
            try {
                execSync('apk add --no-cache chromium', { stdio: 'inherit' });
            } catch (e) {
                console.error('❌ 自动安装 chromium 失败，请手动运行: apk add --no-cache chromium');
            }
            // 再次检测
            if (fsSync.existsSync(systemChromium)) {
                if (fsSync.existsSync(symlinkPath)) {
                    await fs.unlink(symlinkPath);
                }
                await fs.symlink(systemChromium, symlinkPath);
                console.log(`✅ 已自动安装并软链系统 chromium-browser 到: ${symlinkPath}`);
                return;
            } else {
                console.error('❌ 依然未检测到 /usr/bin/chromium-browser，请手动安装 chromium。');
                throw new Error('Alpine Linux 环境下未检测到 chromium-browser，请手动安装。');
            }
        }
    }

    // 非 Alpine 或其他平台，继续原有下载逻辑
    // 下载配置
    const downloadOptions = {
        threads: options.threads || 8,        // 使用 8 线程
        retries: options.retries || 5,        // 最大重试 5 次
        timeout: options.timeout || 120000,   // 2分钟超时
        resumeDownload: true,                 // 启用断点续传
        ...options
    };

    try {
        // 检查是否支持自动下载
        if (!downloadInfo.url) {
            const manualInstructions = getManualDownloadInstructions(platformId);
            throw new Error(`当前平台 (${platformId}) 暂不支持自动下载。\n${manualInstructions}`);
        }

        console.log(`📥 开始下载 Chromium (版本: ${downloadInfo.revision})...`);
        console.log(`🎯 目标平台: ${platformId}`);

        // 确保目录存在
        await fs.mkdir(chromiumDir, { recursive: true });

        // 下载文件
        const zipPath = path.join(chromiumDir, 'chromium.zip');
        console.log(`📂 下载路径: ${zipPath}`);

        let downloadAttempt = 0;
        const maxDownloadAttempts = 3;

        while (downloadAttempt < maxDownloadAttempts) {
            try {
                downloadAttempt++;
                console.log(`\n🚀 开始第 ${downloadAttempt} 次下载尝试...`);

                await downloadFile(downloadInfo.url, zipPath, downloadOptions);
                break; // 下载成功，退出循环

            } catch (downloadError) {
                console.error(`❌ 第 ${downloadAttempt} 次下载失败:`, downloadError.message);

                if (downloadAttempt >= maxDownloadAttempts) {
                    throw downloadError;
                }

                console.log(`⏳ 等待 ${downloadAttempt * 2} 秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, downloadAttempt * 2000));
            }
        }

        // 验证下载的文件
        console.log('🔍 验证下载文件...');
        const zipStats = await fs.stat(zipPath);
        console.log(`📊 下载文件大小: ${(zipStats.size / 1024 / 1024).toFixed(2)} MB`);

        if (zipStats.size < 1024 * 1024) { // 小于 1MB 可能是错误页面
            throw new Error('下载的文件过小，可能下载失败');
        }

        // 解压文件
        console.log('📦 开始解压文件...');
        await extractZip(zipPath, chromiumDir);

        // 验证解压结果
        const { executablePath } = getChromiumPaths(platformId);
        if (!existsSync(executablePath)) {
            throw new Error(`解压后未找到可执行文件: ${executablePath}`);
        }

        // 删除 ZIP 文件
        console.log('🧹 清理下载文件...');
        await fs.unlink(zipPath);

        console.log(`✅ Chromium 安装完成: ${chromiumDir}`);
        console.log(`🔧 可执行文件: ${executablePath}`);

    } catch (error) {
        console.error(`❌ Chromium 下载失败:`, error.message);
        console.error('💡 建议操作:');
        console.error('  1. 检查网络连接');
        console.error('  2. 稍后重试下载');
        console.error('  3. 手动下载并解压到指定目录');
        console.error('  4. 或使用系统已安装的 Chrome 浏览器');
        throw error;
    }
}

/**
 * 获取手动下载说明
 */
function getManualDownloadInstructions(platformId) {
    const { chromiumDir, downloadInfo } = getChromiumPaths(platformId);
    
    const instructions = `
手动下载说明：
1. 当前平台：${platformId}
2. 请访问 Chromium 下载页面：https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html
3. 选择对应的平台和版本号
4. 下载 ZIP 文件并解压到：${chromiumDir}
5. 确保可执行文件路径为：${path.join(chromiumDir, downloadInfo.executable)}

或者，您可以使用系统已安装的 Chrome 浏览器，程序会自动检测。
    `.trim();
    
    return instructions;
}

/**
 * 确保 Chromium 准备就绪
 */
async function ensureChromiumReady(options = {}) {
    try {
        console.log('🔍 检查 Chromium 状态...');
        
        const platformId = detectPlatform();
        const exists = await checkChromiumExists(platformId);
        
        if (!exists) {
            console.log('📥 预构建 Chromium 不存在，尝试下载...');
            
            try {
                await downloadChromium(platformId, options);
                console.log('✅ Chromium 下载并安装完成');
            } catch (downloadError) {
                console.warn('⚠️  Chromium 下载失败，尝试查找系统安装的版本...');
                console.warn('下载错误:', downloadError.message);
                
                // 查找系统安装的 Chrome
                const systemChrome = findSystemChrome();
                if (systemChrome) {
                    console.log('✅ 找到系统 Chrome，将使用系统版本');
                    return systemChrome;
                } else {
                    throw new Error('无法下载 Chromium，且系统中未找到可用的 Chrome 浏览器');
                }
            }
        }
        
        const executablePath = getChromiumExecutablePath();
        console.log('✅ Chromium 准备就绪');
        return executablePath;
        
    } catch (error) {
        console.error('❌ Chromium 检查失败:', error.message);
        throw error;
    }
}

/**
 * 查找系统中已安装的 Chromium/Chrome
 */
function findSystemChrome() {
    const possiblePaths = [];
    
    if (process.platform === 'win32') {
        possiblePaths.push(
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files\\Chromium\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
        );
    } else if (process.platform === 'darwin') {
        possiblePaths.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/usr/local/bin/chrome',
            '/usr/local/bin/chromium'
        );
        
        // 检查通过 Homebrew 安装的版本
        try {
            const { execSync } = require('child_process');
            const brewChrome = execSync('which chrome 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
            if (brewChrome && existsSync(brewChrome)) {
                possiblePaths.unshift(brewChrome);
            }
            
            const brewChromium = execSync('which chromium 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
            if (brewChromium && existsSync(brewChromium)) {
                possiblePaths.unshift(brewChromium);
            }
        } catch (error) {
            // 忽略 execSync 错误
        }
    } else {
        possiblePaths.push(
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium'
        );
    }
    
    for (const chromePath of possiblePaths) {
        if (existsSync(chromePath)) {
            console.log(`🔍 找到系统 Chrome: ${chromePath}`);
            
            // 在 macOS 上测试 Chrome 是否能正常启动
            if (process.platform === 'darwin') {
                try {
                    const { execSync } = require('child_process');
                    const testResult = execSync(`"${chromePath}" --headless --disable-gpu --no-sandbox --dump-dom "data:text/html,<html><body>test</body></html>" 2>/dev/null`, 
                        { encoding: 'utf8', timeout: 10000 });
                    if (testResult.includes('<body>test</body>')) {
                        console.log(`✅ 系统 Chrome 测试通过: ${chromePath}`);
                        return chromePath;
                    } else {
                        console.warn(`⚠️  系统 Chrome 测试失败: ${chromePath}`);
                        continue;
                    }
                } catch (testError) {
                    console.warn(`⚠️  系统 Chrome 测试出错: ${chromePath} - ${testError.message}`);
                    continue;
                }
            } else {
                return chromePath;
            }
        }
    }
    
    return null;
}

/**
 * 获取当前平台的 Chromium 可执行文件路径
 */
function getChromiumExecutablePath() {
    try {
        const platformId = detectPlatform();
        const { executablePath } = getChromiumPaths(platformId);
        
        if (existsSync(executablePath)) {
            console.log(`✅ 使用预构建 Chromium: ${executablePath}`);
            
            // 在 macOS 上，确保 Chromium 有正确的权限和属性
            if (process.platform === 'darwin') {
                try {
                    const { execSync } = require('child_process');
                    // 确保执行权限
                    execSync(`chmod +x "${executablePath}"`, { stdio: 'ignore' });
                    
                    // 移除隔离属性
                    try {
                        execSync(`xattr -rd com.apple.quarantine "${executablePath.replace('/Contents/MacOS/Chromium', '')}" 2>/dev/null`, { stdio: 'ignore' });
                        console.log(`🔓 已移除 Chromium 的 quarantine 属性`);
                    } catch (e) {
                        // 忽略 xattr 错误
                    }
                } catch (error) {
                    console.warn('设置 Chromium 权限时出现问题:', error.message);
                }
            }
            
            return executablePath;
        }
        
        // 如果预构建的不存在，尝试查找系统安装的
        const systemChrome = findSystemChrome();
        if (systemChrome) {
            console.log(`⚠️  预构建 Chromium 不存在，使用系统 Chrome: ${systemChrome}`);
            return systemChrome;
        }
        
        throw new Error(`未找到可用的 Chromium/Chrome: ${executablePath}`);
        
    } catch (error) {
        console.error('❌ 获取 Chromium 路径失败:', error.message);
        throw error;
    }
}

module.exports = {
    detectPlatform,
    checkChromiumExists,
    downloadChromium,
    ensureChromiumReady,
    getChromiumExecutablePath,
    findSystemChrome,
    getManualDownloadInstructions
};

// 如果是直接运行此脚本
if (require.main === module) {
    ensureChromiumReady().catch(console.error);
}
