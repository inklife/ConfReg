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

    // 检查内存压力，如果内存使用过高，暂停处理队列
    const memUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (memoryUsageMB > 700 || heapUsedMB > 500) {
      console.warn(`⏸️ 内存压力过高，暂停PDF队列处理 - RSS: ${memoryUsageMB}MB, Heap: ${heapUsedMB}MB`);
      // 等待5秒后再次尝试
      setTimeout(() => this.processQueue(), 5000);
      return;
    }

    const task = this.queue.shift();
    this.currentRunning++;

    try {
      console.log(`📄 开始PDF生成，当前队列: ${this.currentRunning}/${this.maxConcurrent}, 内存: ${memoryUsageMB}MB`);
      const result = await task.execute();
      task.resolve(result);
    } catch (error) {
      console.error('PDF生成失败:', error);
      task.reject(error);
    } finally {
      this.currentRunning--;
      
      // 生成完成后检查内存，如果使用过高则触发垃圾回收
      const finalMemUsage = process.memoryUsage();
      const finalMemoryUsageMB = Math.round(finalMemUsage.rss / 1024 / 1024);
      
      if (finalMemoryUsageMB > 600 && global.gc) {
        console.log('🗑️ PDF生成后触发垃圾回收...');
        global.gc();
      }
      
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

// 创建内存监控实例
const MemoryMonitor = require('../services/memoryMonitor');
const globalMemoryMonitor = new MemoryMonitor();

// 启动内存基线记录
globalMemoryMonitor.recordBaseline();

// 定期清理超时任务和内存检查
setInterval(() => {
  pdfQueue.cleanupExpiredTasks(30000); // 30秒超时
  
  // 检查内存健康状态
  if (globalMemoryMonitor.shouldPerformCleanup()) {
    console.log('🧹 自动触发内存清理...');
    globalMemoryMonitor.performMemoryCleanup();
  }
}, 10000); // 每10秒检查一次

// 每分钟记录内存使用情况
setInterval(() => {
  const report = globalMemoryMonitor.generateReport();
  if (report.healthStatus.level >= 1) {
    console.log('📊 内存监控报告:', {
      timestamp: report.timestamp,
      memory: report.current,
      health: report.healthStatus,
      pdfQueue: pdfQueue.getStats()
    });
  }
}, 60000); // 每分钟检查一次

// 内存监控中间件
const memoryMonitor = (req, res, next) => {
  const memUsage = process.memoryUsage();
  const memoryUsageMB = Math.round(memUsage.rss / 1024 / 1024);
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  // 分级内存限制策略（可通过环境变量调整）
  const MEMORY_WARNING_MB = parseInt(process.env.MEMORY_WARNING_MB) || 600;   // 警告阈值
  const MEMORY_LIMIT_MB = parseInt(process.env.MEMORY_LIMIT_MB) || 800;       // 严格限制阈值
  const HEAP_LIMIT_MB = parseInt(process.env.HEAP_LIMIT_MB) || 600;          // 堆内存限制
  
  // 记录详细内存信息
  if (memoryUsageMB > MEMORY_WARNING_MB || heapUsedMB > HEAP_LIMIT_MB) {
    console.warn(`⚠️ 内存使用警告 - RSS: ${memoryUsageMB}MB, Heap: ${heapUsedMB}MB, External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
    
    // 尝试垃圾回收
    if (global.gc) {
      console.log('🗑️ 执行垃圾回收...');
      global.gc();
      
      // 重新检查内存
      const newMemUsage = process.memoryUsage();
      const newMemoryUsageMB = Math.round(newMemUsage.rss / 1024 / 1024);
      console.log(`🧹 垃圾回收后内存: ${newMemoryUsageMB}MB (减少 ${memoryUsageMB - newMemoryUsageMB}MB)`);
    }
  }
  
  // 严格限制：超过800MB或堆内存超过600MB时拒绝请求
  if (memoryUsageMB > MEMORY_LIMIT_MB || heapUsedMB > HEAP_LIMIT_MB) {
    console.error(`❌ 内存使用过高，拒绝请求 - RSS: ${memoryUsageMB}MB > ${MEMORY_LIMIT_MB}MB 或 Heap: ${heapUsedMB}MB > ${HEAP_LIMIT_MB}MB`);
    
    return res.status(503).json({
      success: false,
      message: 'Server is under high memory pressure. Please try again in a few minutes.',
      memoryUsage: `RSS: ${memoryUsageMB}MB, Heap: ${heapUsedMB}MB`,
      retryAfter: '5 minutes'
    });
  }
  
  // 将内存信息添加到响应头（调试用）
  res.setHeader('X-Memory-Usage', `RSS:${memoryUsageMB}MB,Heap:${heapUsedMB}MB`);
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
  generatePDFWithQueue,
  globalMemoryMonitor
};
