/**
 * 跨平台 SQLite3 加载器
 * 自动检测平台并加载对应的预编译 SQLite3 模块
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

class CrossPlatformSQLite3 {
    constructor() {
        this.platform = this.detectPlatform();
        this.arch = this.detectArchitecture();
        this.sqlite3 = null;
        this.isLoaded = false;
    }

    /**
     * 检测操作系统平台
     */
    detectPlatform() {
        const platform = os.platform();
        switch (platform) {
            case 'win32':
                return 'windows';
            case 'darwin':
                return 'macos';
            case 'linux':
                return 'linux';
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    /**
     * 检测系统架构
     */
    detectArchitecture() {
        const arch = os.arch();
        switch (arch) {
            case 'x64':
            case 'x86_64':
                return 'x64';
            case 'x86':
            case 'ia32':
                return 'x86';
            case 'arm64':
                return 'arm64';
            case 'arm':
                return 'arm';
            default:
                return arch; // 保持原始架构名
        }
    }

    /**
     * 获取平台特定的模块路径
     */
    getPlatformModulePath() {
        const platformKey = `${this.platform}-${this.arch}`;
        
        // 预编译模块存放路径
        const prebuiltPath = path.join(__dirname, '../../prebuilt/sqlite3', platformKey, 'node_sqlite3.node');
        
        // 标准 node_modules 路径
        const standardPath = path.join(__dirname, '../../node_modules/sqlite3/build/Release/node_sqlite3.node');
        
        return {
            platformKey,
            prebuiltPath,
            standardPath
        };
    }

    /**
     * 检查预编译模块是否存在
     */
    checkPrebuiltModule() {
        const { prebuiltPath } = this.getPlatformModulePath();
        return fs.existsSync(prebuiltPath);
    }

    /**
     * 加载 SQLite3 模块
     */
    async loadSQLite3() {
        if (this.isLoaded && this.sqlite3) {
            return this.sqlite3;
        }

        const { platformKey, prebuiltPath, standardPath } = this.getPlatformModulePath();

        try {
            // 首先尝试加载预编译模块
            if (this.checkPrebuiltModule()) {
                console.log(`🔧 Loading prebuilt SQLite3 for ${platformKey}...`);
                // 只在使用预编译模块时设置环境变量
                this.setEnvironmentPaths();
                this.sqlite3 = this.loadPrebuiltModule(prebuiltPath);
                console.log(`✅ Successfully loaded prebuilt SQLite3 module`);
            }
            // 尝试自动构建
            else {
                console.log(`⚠️  No SQLite3 module found, attempting to rebuild...`);
                // 清除环境变量，确保干净的构建环境
                this.clearEnvironmentPaths();
                await this.rebuildSQLite3(); // 内置了自动移动功能
                
                // 构建完成后，应该有预编译模块了，尝试加载
                if (this.checkPrebuiltModule()) {
                    console.log(`🔧 Loading newly built prebuilt SQLite3 for ${platformKey}...`);
                    this.setEnvironmentPaths();
                    this.sqlite3 = this.loadPrebuiltModule(prebuiltPath);
                    console.log(`✅ Successfully loaded newly built SQLite3 module`);
                } else {
                    // 如果还是没有预编译模块，尝试直接 require
                    console.log(`🔄 Fallback to direct require of sqlite3...`);
                    this.sqlite3 = require('sqlite3');
                    console.log(`✅ Successfully loaded SQLite3 module via direct require`);
                }
            }

            this.isLoaded = true;
            return this.sqlite3;

        } catch (error) {
            console.error(`❌ Failed to load SQLite3 for ${platformKey}:`, error.message);
            throw new Error(`Cannot load SQLite3 module for ${platformKey}: ${error.message}`);
        }
    }

    /**
     * 加载预编译模块
     */
    loadPrebuiltModule(modulePath) {
        // 验证预编译模块是否可用
        if (!fs.existsSync(modulePath)) {
            throw new Error(`Prebuilt module not found: ${modulePath}`);
        }

        console.log(`🔧 [loadPrebuiltModule] Loading prebuilt SQLite3 from: ${modulePath}`);

        // 使用模块加载器拦截方法，确保返回完整的 sqlite3 对象
        const Module = require('module');
        const originalLoad = Module._load;
        const originalResolveFilename = Module._resolveFilename;
        
        // 保存原始缓存状态
        let sqlite3ModulePath;
        try {
            sqlite3ModulePath = require.resolve('sqlite3');
        } catch (e) {
            // 如果无法解析 sqlite3 模块，说明可能没有安装
            throw new Error('SQLite3 module not installed. Please run: npm install sqlite3');
        }
        const originalCache = require.cache[sqlite3ModulePath];
        
        let loadedSQLite3;
        
        try {
            // 清除所有相关的模块缓存
            this.clearSQLite3Cache();
            
            // 拦截 bindings 调用
            Module._load = function(request, parent) {
                if (request === 'bindings' && parent && parent.filename && parent.filename.includes('sqlite3')) {
                    console.log(`🔄 [loadPrebuiltModule] Intercepted bindings request, using: ${modulePath}`);
                    return function(opts) {
                        return require(modulePath);
                    };
                }
                return originalLoad.apply(this, arguments);
            };

            // 拦截二进制文件路径解析
            Module._resolveFilename = function(request, parent) {
                if ((request.includes('node_sqlite3.node') || request.includes('sqlite3.node')) && 
                    parent && parent.filename && parent.filename.includes('sqlite3')) {
                    console.log(`🔄 [loadPrebuiltModule] Intercepted node file request, redirecting to: ${modulePath}`);
                    return modulePath;
                }
                return originalResolveFilename.apply(this, arguments);
            };
            
            // 重新加载 sqlite3 模块
            loadedSQLite3 = require('sqlite3');
            console.log('✅ [loadPrebuiltModule] Successfully loaded SQLite3 with prebuilt module');
            
            // 验证加载的对象
            if (!loadedSQLite3 || !loadedSQLite3.Database) {
                throw new Error('Loaded SQLite3 module missing Database constructor');
            }
            
            console.log('✅ [loadPrebuiltModule] SQLite3 module validation passed');
            return loadedSQLite3;
            
        } catch (error) {
            console.error(`❌ Failed to load prebuilt module: ${error.message}`);
            
            // 如果是绑定文件错误，提供特定的错误信息
            if (error.message && error.message.includes('Could not locate the bindings file')) {
                throw new Error('SQLite3 bindings file not found. Module needs to be rebuilt.');
            }
            
            throw error;
        } finally {
            // 恢复原始状态
            Module._load = originalLoad;
            Module._resolveFilename = originalResolveFilename;
        }
    }

    /**
     * 清除 SQLite3 相关的模块缓存
     */
    clearSQLite3Cache() {
        // 需要清除的模块路径模式
        const cachePaths = Object.keys(require.cache).filter(path => 
            path.includes('sqlite3') || 
            path.includes('node_sqlite3.node') ||
            path.includes('bindings')
        );
        
        cachePaths.forEach(path => {
            delete require.cache[path];
        });
        
        if (cachePaths.length > 0) {
            console.log(`🧹 Cleared ${cachePaths.length} SQLite3-related cache entries`);
        }
    }

    /**
     * 自动重建 SQLite3 并导出到预编译位置
     */
    async rebuildSQLite3() {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            console.log('📦 Rebuilding SQLite3 module...');
            console.log('⏳ This may take a few minutes depending on your system...');
            
            const isWindows = process.platform === 'win32';
            const npmCommand = isWindows ? 'npm.cmd' : 'npm';
            
            // 优先使用预编译版本，不强制从源码编译
            const spawnOptions = {
                stdio: 'inherit',
                cwd: path.join(__dirname, '../..'),
                env: { 
                    ...process.env,
                    // 移除强制从源码编译的环境变量，优先使用预编译版本
                    npm_config_build_from_source: undefined
                },
                shell: isWindows // 在 Windows 上使用 shell
            };
            
            const rebuild = spawn(npmCommand, ['rebuild', 'sqlite3'], spawnOptions);

            rebuild.on('close', async (code) => {
                if (code === 0) {
                    console.log('✅ SQLite3 rebuild completed successfully');
                    
                    // 重建成功后自动导出到预编译位置
                    try {
                        await this.moveBuiltModuleToPrebuilt();
                        console.log('📦 Successfully moved rebuilt module to prebuilt location');
                        resolve();
                    } catch (exportError) {
                        console.warn(`⚠️  Failed to move rebuilt module: ${exportError.message}`);
                        // 即使移动失败，重建仍然算成功
                        resolve();
                    }
                } else {
                    console.error(`❌ SQLite3 rebuild failed with exit code ${code}`);
                    console.log('\n📋 重建失败可能的原因：');
                    console.log('   • 缺少构建工具（Visual Studio Build Tools、Python 等）');
                    console.log('   • 网络连接问题，无法下载依赖');
                    console.log('   • Node.js 版本不兼容');
                    console.log('   • 权限不足');
                    console.log('\n💡 建议尝试手动安装：');
                    console.log('   npm uninstall sqlite3 && npm install sqlite3');
                    reject(new Error(`SQLite3 rebuild failed with exit code ${code}`));
                }
            });

            rebuild.on('error', (error) => {
                console.error(`❌ Failed to start rebuild process: ${error.message}`);
                console.log('\n📋 无法启动重建进程可能的原因：');
                console.log('   • npm 命令不可用或路径错误');
                console.log('   • 工作目录权限问题');
                console.log('   • 系统环境配置问题');
                reject(new Error(`Failed to start rebuild process: ${error.message}`));
            });
        });
    }

    /**
     * 尝试重新安装 SQLite3（优先使用预编译版本）
     */
    async reinstallSQLite3() {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            console.log('📦 Reinstalling SQLite3 module (using prebuilt if available)...');
            console.log('⏳ This should be faster than rebuilding...');
            
            const isWindows = process.platform === 'win32';
            const npmCommand = isWindows ? 'npm.cmd' : 'npm';
            
            const spawnOptions = {
                stdio: 'inherit',
                cwd: path.join(__dirname, '../..'),
                env: { 
                    ...process.env,
                    // 确保使用预编译版本
                    npm_config_build_from_source: undefined
                },
                shell: isWindows
            };
            
            // 先卸载再安装
            const uninstall = spawn(npmCommand, ['uninstall', 'sqlite3'], spawnOptions);
            
            uninstall.on('close', (code) => {
                if (code !== 0) {
                    console.warn(`⚠️  Uninstall returned code ${code}, continuing with install...`);
                }
                
                // 重新安装
                const install = spawn(npmCommand, ['install', 'sqlite3'], spawnOptions);
                
                install.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ SQLite3 reinstall completed successfully');
                        resolve();
                    } else {
                        console.error(`❌ SQLite3 reinstall failed with exit code ${code}`);
                        reject(new Error(`SQLite3 reinstall failed with exit code ${code}`));
                    }
                });
                
                install.on('error', (error) => {
                    console.error(`❌ Failed to start reinstall process: ${error.message}`);
                    reject(error);
                });
            });
            
            uninstall.on('error', (error) => {
                console.error(`❌ Failed to start uninstall process: ${error.message}`);
                reject(error);
            });
        });
    }

    /**
     * 将构建好的模块移动到预编译位置
     * (内部调用 exportCurrentBuild 实现)
     */
    async moveBuiltModuleToPrebuilt() {
        // 直接调用 exportCurrentBuild 并强制移动文件
        return await this.exportCurrentBuild(true);
    }

    /**
     * 获取平台信息
     */
    getPlatformInfo() {
        return {
            platform: this.platform,
            arch: this.arch,
            node: process.version,
            platformKey: `${this.platform}-${this.arch}`,
            isLoaded: this.isLoaded,
            hasPrebuilt: this.checkPrebuiltModule()
        };
    }

    /**
     * 导出当前构建的模块（用于创建预编译包）
     * @param {boolean} moveFile - 是否移动文件而不是复制（默认为false）
     */
    async exportCurrentBuild(moveFile = false) {
        const { platformKey, standardPath } = this.getPlatformModulePath();
        
        if (!fs.existsSync(standardPath)) {
            throw new Error('No built SQLite3 module found to export');
        }

        const exportDir = path.join(__dirname, '../../prebuilt/sqlite3', platformKey);
        const exportPath = path.join(exportDir, 'node_sqlite3.node');

        // 创建目录
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        // 如果目标文件已存在，先备份
        if (fs.existsSync(exportPath)) {
            const backupPath = exportPath + '.backup.' + Date.now();
            fs.copyFileSync(exportPath, backupPath);
            console.log(`📋 Backed up existing module to: ${backupPath}`);
        }

        // 复制或移动文件
        if (moveFile) {
            // 移动文件（先复制再删除，确保安全）
            fs.copyFileSync(standardPath, exportPath);
            fs.unlinkSync(standardPath);
            console.log(`📦 Moved SQLite3 module from ${standardPath} to ${exportPath}`);
        } else {
            // 复制文件
            fs.copyFileSync(standardPath, exportPath);
            console.log(`📦 Copied SQLite3 module from ${standardPath} to ${exportPath}`);
        }
        
        // 创建平台信息文件
        const infoPath = path.join(exportDir, 'platform-info.json');
        const info = {
            ...this.getPlatformInfo(),
            buildDate: new Date().toISOString(),
            nodeVersion: process.version,
            sourceFile: standardPath,
            operation: moveFile ? 'moved' : 'copied'
        };
        fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));

        console.log(`📦 Exported SQLite3 module for ${platformKey} to:`);
        console.log(`   Binary: ${exportPath}`);
        console.log(`   Info:   ${infoPath}`);
        console.log(`   Operation: ${moveFile ? 'Moved' : 'Copied'}`);

        return exportPath;
    }

    /**
     * 设置环境变量强制指定 SQLite3 路径
     */
    setEnvironmentPaths() {
        const { platformKey, prebuiltPath } = this.getPlatformModulePath();
        
        if (fs.existsSync(prebuiltPath)) {
            // 设置环境变量影响 node-gyp 和 bindings 的查找
            process.env.SQLITE3_BINARY_PATH = prebuiltPath;
            process.env.npm_config_sqlite3_binary_host_mirror = path.dirname(prebuiltPath);
            
            console.log(`🔧 Set environment paths for ${platformKey}`);
            console.log(`   SQLITE3_BINARY_PATH: ${prebuiltPath}`);
        }
    }

    /**
     * 清除 SQLite3 相关的环境变量
     */
    clearEnvironmentPaths() {
        delete process.env.SQLITE3_BINARY_PATH;
        delete process.env.npm_config_sqlite3_binary_host_mirror;
        console.log('🧹 Cleared SQLite3 environment variables');
    }


    /**
     * 检测SQLite3 prebuilt是否存在，如果不存在则构建
     * 专门用于启动脚本
     */
    async ensureSQLite3Ready() {
        try {
            console.log('🔍 检查 SQLite3 模块状态...');
            // 首先尝试加载现有的 SQLite3
            await this.loadSQLite3();
            console.log('✅ SQLite3 模块已就绪');
            return true;

        } catch (error) {
            console.error('❌ SQLite3 准备失败:', error.message);
            console.error('\n🔧 所有自动修复尝试都失败了，请手动执行：');
            console.error('   npm uninstall sqlite3 && npm install sqlite3');
            console.error('   或者: npm rebuild sqlite3');
            console.error('\n💡 如果您的系统缺少构建工具，请考虑：');
            console.error('   1. 安装 Visual Studio Build Tools (Windows)');
            console.error('   2. 安装 Windows SDK');
            console.error('   3. 或使用预编译的 SQLite3 版本');
            process.exit(1);
        }
    }

    /**
     * 立即设置路径拦截（同步版本）
     * @param {string} binaryPath - 二进制文件路径
     * @param {boolean} persistent - 是否持久拦截（默认true，如果false则返回还原函数）
     */
    setupPathInterception(binaryPath, persistent = true) {
        try {
            console.log(`🔧 [setupPathInterception] Setting up immediate path interception for: ${binaryPath}`);
            
            // 设置环境变量
            process.env.SQLITE3_BINARY_PATH = binaryPath;
            
            // 预先加载二进制文件避免递归
            let preloadedBinary;
            try {
                preloadedBinary = require(binaryPath);
                console.log('✅ [setupPathInterception] Successfully preloaded binary module');
            } catch (preloadError) {
                console.error(`❌ Failed to preload binary: ${preloadError.message}`);
                return false;
            }
            
            // 立即设置模块拦截
            const Module = require('module');
            const originalRequire = Module.prototype.require;
            
            // 先获取真正的 bindings 模块的引用
            let originalBindings;
            try {
                originalBindings = originalRequire.call(module, 'bindings');
            } catch (err) {
                console.log('⚠️  Bindings module not found, creating fallback');
                originalBindings = null;
            }
            
            Module.prototype.require = function(id) {
                if (id === 'bindings') {
                    return function(opts) {
                        if (opts && (opts.module_name === 'node_sqlite3' || opts === 'node_sqlite3')) {
                            console.log(`🔄 [setupPathInterception] Intercepted bindings request, using preloaded module`);
                            return preloadedBinary;
                        }
                        // 对于其他 bindings 请求，使用原始的 bindings 模块
                        if (originalBindings) {
                            return originalBindings(opts);
                        } else {
                            // 如果原始 bindings 不可用，尝试直接加载
                            return originalRequire.call(this, 'bindings')(opts);
                        }
                    };
                }
                
                // 拦截直接的 node_sqlite3.node 请求，返回预加载的模块
                if (id.includes('node_sqlite3.node') || id === binaryPath) {
                    console.log(`🔄 [setupPathInterception] Intercepted node file request, using preloaded module`);
                    return preloadedBinary;
                }
                
                return originalRequire.call(this, id);
            };
            
            // 清理模块缓存中的 SQLite3 相关模块（除了我们预加载的）
            const cacheKeys = Object.keys(require.cache);
            let clearedCount = 0;
            cacheKeys.forEach(key => {
                if (key.includes('sqlite3') && !key.includes('cross-platform-sqlite3') && key !== binaryPath) {
                    delete require.cache[key];
                    clearedCount++;
                }
            });
            
            if (clearedCount > 0) {
                console.log(`🧹 Cleared ${clearedCount} SQLite3-related cache entries`);
            }
            
            // 如果不是持久拦截，返回还原函数
            if (!persistent) {
                return function restore() {
                    Module.prototype.require = originalRequire;
                    delete process.env.SQLITE3_BINARY_PATH;
                    console.log('🔄 [setupPathInterception] Restored original module require function');
                };
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Failed to setup path interception: ${error.message}`);
            return false;
        }
    }
}

// 创建单例实例
const crossPlatformSQLite3 = new CrossPlatformSQLite3();

module.exports = {
    CrossPlatformSQLite3,
    loadSQLite3: () => crossPlatformSQLite3.loadSQLite3(),
    getPlatformInfo: () => crossPlatformSQLite3.getPlatformInfo(),
    exportCurrentBuild: (moveFile = false) => crossPlatformSQLite3.exportCurrentBuild(moveFile),
    ensureSQLite3Ready: () => crossPlatformSQLite3.ensureSQLite3Ready(),
    reinstallSQLite3: () => crossPlatformSQLite3.reinstallSQLite3(),
    instance: crossPlatformSQLite3
};
