const rateLimit = require('express-rate-limit');

// PDF下载专用的速率限制器
const pdfDownloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 8, // 每个用户15分钟内最多下载8个PDF
  message: {
    success: false,
    message: 'Too many PDF download requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 基于用户ID和IP地址生成限制键
    return `pdf_download_${req.session?.userId || 'anonymous'}_${req.ip}`;
  },
  skip: (req) => {
    // 管理员请求跳过限制（可选）
    return req.session?.user?.role === 'admin' || req.session?.user?.is_superuser;
  }
});

// 全局PDF生成并发控制
class PDFGenerationQueue {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.currentRunning = 0;
    this.queue = [];
  }

  async add(pdfGenerationFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: pdfGenerationFunction,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.currentRunning >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    this.currentRunning++;

    try {
      console.log(`📄 开始PDF生成，当前队列: ${this.currentRunning}/${this.maxConcurrent}`);
      const result = await task.execute();
      task.resolve(result);
    } catch (error) {
      console.error('PDF生成失败:', error);
      task.reject(error);
    } finally {
      this.currentRunning--;
      // 处理下一个任务
      setImmediate(() => this.processQueue());
    }
  }

  getStats() {
    return {
      running: this.currentRunning,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }

  // 清理超时任务
  cleanupExpiredTasks(timeoutMs = 60000) {
    const now = Date.now();
    const beforeCount = this.queue.length;
    
    this.queue = this.queue.filter(task => {
      if (now - task.timestamp > timeoutMs) {
        task.reject(new Error('PDF generation request timeout'));
        return false;
      }
      return true;
    });

    if (this.queue.length !== beforeCount) {
      console.log(`🧹 清理了 ${beforeCount - this.queue.length} 个超时的PDF生成任务`);
    }
  }
}

// 创建全局PDF生成队列
const pdfQueue = new PDFGenerationQueue(3); // 最多3个并发PDF生成

// 定期清理超时任务
setInterval(() => {
  pdfQueue.cleanupExpiredTasks(30000); // 30秒超时
}, 10000); // 每10秒检查一次

// 内存监控中间件
const memoryMonitor = (req, res, next) => {
  const memUsage = process.memoryUsage();
  const memoryUsageMB = Math.round(memUsage.rss / 1024 / 1024);
  
  // 如果内存使用超过500MB，拒绝新的PDF请求
  const MEMORY_LIMIT_MB = 500;
  
  if (memoryUsageMB > MEMORY_LIMIT_MB) {
    console.warn(`⚠️ 内存使用过高: ${memoryUsageMB}MB > ${MEMORY_LIMIT_MB}MB`);
    
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    return res.status(503).json({
      success: false,
      message: 'Server is under high memory pressure. Please try again later.',
      memoryUsage: `${memoryUsageMB}MB`
    });
  }
  
  // 将内存信息添加到响应头（调试用）
  res.setHeader('X-Memory-Usage', `${memoryUsageMB}MB`);
  res.setHeader('X-PDF-Queue', JSON.stringify(pdfQueue.getStats()));
  
  next();
};

// 增强的PDF生成函数
async function generatePDFWithQueue(pdfGenerationFunction) {
  return pdfQueue.add(pdfGenerationFunction);
}

// 导出保护措施
module.exports = {
  pdfDownloadLimiter,
  pdfQueue,
  memoryMonitor,
  generatePDFWithQueue
};
