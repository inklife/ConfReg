/**
 * USTC Pan 下载链接服务
 * 自动获取 USTC Pan 分享文件的真实下载链接
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const { getChromiumExecutablePath } = require('../utils/cross-platform-chromium');
const cacheManager = require('../utils/cache/cacheManager');

// 缓存配置
const CACHE_DURATION = 45 * 60; // 45 分钟 (秒)
const CACHE_PREFIX = 'panustc:';

// 保持浏览器实例
let globalBrowser = null;
let browserLastUsed = Date.now();
const BROWSER_IDLE_TIMEOUT = 1 * 60 * 1000; // 1 分钟无操作则关闭浏览器

/**
 * 获取或创建浏览器实例
 */
async function getBrowser() {
    // 如果浏览器存在但超时未使用，关闭它
    if (globalBrowser && (Date.now() - browserLastUsed > BROWSER_IDLE_TIMEOUT)) {
        console.log('[PanUstc] Browser idle timeout, closing...');
        try {
            await globalBrowser.close();
        } catch (e) {
            console.error('[PanUstc] Error closing idle browser:', e.message);
        }
        globalBrowser = null;
    }

    // 如果浏览器不存在或已关闭，创建新的
    if (!globalBrowser || !globalBrowser.isConnected()) {
        console.log('[PanUstc] Launching new browser instance...');
        
        try {
            const executablePath = getChromiumExecutablePath();
            
            globalBrowser = await puppeteer.launch({
                headless: 'new',
                executablePath,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                defaultViewport: { width: 1280, height: 800 }
            });

            console.log('[PanUstc] Browser launched successfully');
        } catch (error) {
            console.error('[PanUstc] Failed to launch browser:', error);
            throw new Error('Failed to launch browser: ' + error.message);
        }
    }

    browserLastUsed = Date.now();
    return globalBrowser;
}

/**
 * 获取 USTC Pan 下载链接
 * @param {string} hash - USTC Pan 分享链接的 hash
 * @returns {Promise<string>} 真实下载链接
 */
async function getDownloadLink(hash) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const url = `https://pan.ustc.edu.cn/share/index/${hash}`;
    
    console.log(`[PanUstc] Processing hash: ${hash}`);
    
    try {
        // 设置超时和错误处理
        page.setDefaultTimeout(30000);
        
        // 监听页面错误
        page.on('pageerror', err => {
            console.error('[PanUstc] Page error:', err.message);
        });

        page.on('error', err => {
            console.error('[PanUstc] Page crash:', err.message);
        });

        // 打开链接
        console.log(`[PanUstc] Navigating to: ${url}`);
        await page.goto(url, { 
            waitUntil: 'networkidle0', 
            timeout: 60000 
        });
        
        // XPath 选择器 - 下载按钮
        const xpath = '//*[@id="app"]/div/div/div[2]/div[2]/div/div[2]/div/div[3]/div/div/div/div[1]/div[1]/div/div/div[7]/div/span[3]';
        
        // 等待元素出现
        let elementHandle;
        try {
            console.log('[PanUstc] Waiting for download button...');
            elementHandle = await page.waitForSelector(`xpath/${xpath}`, { timeout: 15000 });
        } catch (e) {
            console.log('[PanUstc] Primary selector failed, trying fallback...');
            // 备用方案：使用传统的 $x 方法
            const handles = await page.$x(xpath);
            if (handles.length > 0) {
                elementHandle = handles[0];
            }
        }

        if (!elementHandle) {
            throw new Error('Download button not found on page');
        }

        console.log('[PanUstc] Download button found');

        // 设置 CDP 会话拦截下载事件
        const client = await page.target().createCDPSession();
        await client.send('Page.enable');
        
        // 设置下载行为 - 使用 deny 阻止实际下载，只捕获下载链接
        await client.send('Browser.setDownloadBehavior', {
            behavior: 'deny',
            eventsEnabled: true
        });

        // 创建 Promise 监听下载事件
        const downloadPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for download event'));
            }, 20000);

            const handler = (event) => {
                console.log('[PanUstc] Download event detected:', event.url);
                clearTimeout(timeout);
                resolve(event.url);
            };

            // 监听多个可能的下载事件
            client.on('Page.downloadWillBegin', handler);
            client.on('Browser.downloadWillBegin', handler);
        });

        // 模拟用户操作：悬停后点击
        console.log('[PanUstc] Clicking download button...');
        await elementHandle.hover();
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
        await elementHandle.click();

        // 等待下载链接
        const downloadUrl = await downloadPromise;
        console.log('[PanUstc] Download link obtained successfully');
        
        return downloadUrl;

    } catch (error) {
        console.error('[PanUstc] Error processing hash:', hash, error.message);
        throw error;
    } finally {
        // 关闭页面（会中断正在进行的下载）
        try {
            await page.close();
        } catch (e) {
            console.error('[PanUstc] Error closing page:', e.message);
        }
    }
}

/**
 * 从缓存获取下载链接（如果存在且未过期）
 * @param {string} hash - USTC Pan 分享链接的 hash
 * @returns {string|null} 缓存的下载链接或 null
 */
function getCachedLink(hash) {
    const cacheKey = `${CACHE_PREFIX}${hash}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
        console.log(`[PanUstc] Cache hit for hash: ${hash}`);
        return cached.url;
    }
    
    return null;
}

/**
 * 缓存下载链接
 * @param {string} hash - USTC Pan 分享链接的 hash
 * @param {string} url - 真实下载链接
 */
function cacheLink(hash, url) {
    const cacheKey = `${CACHE_PREFIX}${hash}`;
    cacheManager.set(cacheKey, { url, timestamp: Date.now() }, CACHE_DURATION);
    console.log(`[PanUstc] Cached link for hash: ${hash}, TTL: ${CACHE_DURATION}s`);
}

/**
 * 获取下载链接（优先从缓存获取）
 * @param {string} hash - USTC Pan 分享链接的 hash
 * @returns {Promise<string>} 真实下载链接
 */
async function getOrFetchDownloadLink(hash) {
    // 1. 尝试从缓存获取
    const cachedLink = getCachedLink(hash);
    if (cachedLink) {
        return cachedLink;
    }

    // 2. 缓存不存在，获取新链接
    console.log(`[PanUstc] Cache miss for hash: ${hash}, fetching...`);
    const downloadUrl = await getDownloadLink(hash);

    // 3. 缓存结果
    cacheLink(hash, downloadUrl);

    return downloadUrl;
}

/**
 * 清理资源
 */
async function cleanup() {
    if (globalBrowser) {
        console.log('[PanUstc] Closing browser...');
        try {
            await globalBrowser.close();
        } catch (e) {
            console.error('[PanUstc] Error closing browser:', e.message);
        }
        globalBrowser = null;
    }
}

/**
 * 定期检查并关闭空闲的浏览器
 */
function startIdleBrowserChecker() {
    setInterval(async () => {
        if (globalBrowser && (Date.now() - browserLastUsed > BROWSER_IDLE_TIMEOUT)) {
            console.log('[PanUstc] Browser idle check: closing unused browser');
            await cleanup();
        }
    }, 5 * 60 * 1000); // 每 5 分钟检查一次
}

// 启动空闲检查器
startIdleBrowserChecker();

// 监听进程退出事件，清理资源
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
    getOrFetchDownloadLink,
    getDownloadLink,
    getCachedLink,
    cacheLink,
    cleanup
};
