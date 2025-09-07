const { getPDFWorkerPoolStats, getHealthStatus } = require('./pdfService');

/**
 * 内存使用监控工具
 */
class MemoryMonitor {
  constructor() {
    this.baseline = null;
    this.history = [];
    this.maxHistory = 100;
  }

  // 记录基线内存使用
  recordBaseline() {
    this.baseline = process.memoryUsage();
    console.log('📊 基线内存使用记录:');
    this.logMemoryUsage(this.baseline, '基线');
  }

  // 获取当前内存使用
  getCurrentMemory() {
    return process.memoryUsage();
  }

  // 记录内存使用历史
  recordMemoryUsage(label = '') {
    const memory = this.getCurrentMemory();
    const record = {
      timestamp: Date.now(),
      label,
      memory,
      rssFormatted: this.formatBytes(memory.rss),
      heapUsedFormatted: this.formatBytes(memory.heapUsed)
    };

    this.history.push(record);
    
    // 保持历史记录不超过最大数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return record;
  }

  // 比较当前内存与基线
  compareWithBaseline() {
    if (!this.baseline) {
      console.log('⚠️ 未设置基线内存，请先调用recordBaseline()');
      return null;
    }

    const current = this.getCurrentMemory();
    const comparison = {
      rss: {
        current: current.rss,
        baseline: this.baseline.rss,
        diff: current.rss - this.baseline.rss,
        diffFormatted: this.formatBytes(current.rss - this.baseline.rss, true)
      },
      heapUsed: {
        current: current.heapUsed,
        baseline: this.baseline.heapUsed,
        diff: current.heapUsed - this.baseline.heapUsed,
        diffFormatted: this.formatBytes(current.heapUsed - this.baseline.heapUsed, true)
      }
    };

    return comparison;
  }

  // 格式化字节数
  formatBytes(bytes, showSign = false) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = Math.abs(bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    const sign = showSign ? (bytes >= 0 ? '+' : '-') : '';
    return `${sign}${value.toFixed(2)} ${units[unitIndex]}`;
  }

  // 日志内存使用
  logMemoryUsage(memory = null, label = '') {
    if (!memory) {
      memory = this.getCurrentMemory();
    }

    console.log(`📊 ${label} 内存使用:`);
    console.log(`   RSS: ${this.formatBytes(memory.rss)}`);
    console.log(`   Heap Total: ${this.formatBytes(memory.heapTotal)}`);
    console.log(`   Heap Used: ${this.formatBytes(memory.heapUsed)}`);
    console.log(`   External: ${this.formatBytes(memory.external)}`);
  }

  // 生成内存报告
  generateReport() {
    const current = this.getCurrentMemory();
    const comparison = this.compareWithBaseline();
    const pdfStats = getPDFWorkerPoolStats();
    const healthStatus = getHealthStatus();

    const report = {
      timestamp: new Date().toISOString(),
      current: {
        rss: this.formatBytes(current.rss),
        heapTotal: this.formatBytes(current.heapTotal),
        heapUsed: this.formatBytes(current.heapUsed),
        external: this.formatBytes(current.external)
      },
      comparison: comparison ? {
        rssDiff: comparison.rss.diffFormatted,
        heapUsedDiff: comparison.heapUsed.diffFormatted
      } : null,
      pdfWorkers: pdfStats,
      healthStatus: healthStatus
    };

    return report;
  }

  // 监控PDF生成过程的内存使用
  async monitorPDFGeneration(pdfFunction, label = 'PDF生成') {
    console.log(`🔍 开始监控: ${label}`);
    
    const beforeMemory = this.recordMemoryUsage(`${label} - 开始前`);
    console.log(`   开始前内存: RSS ${beforeMemory.rssFormatted}, Heap ${beforeMemory.heapUsedFormatted}`);
    
    const startTime = Date.now();
    
    try {
      const result = await pdfFunction();
      
      const afterMemory = this.recordMemoryUsage(`${label} - 完成后`);
      const duration = Date.now() - startTime;
      const memoryDiff = afterMemory.memory.rss - beforeMemory.memory.rss;
      
      console.log(`✅ ${label} 完成:`);
      console.log(`   耗时: ${duration}ms`);
      console.log(`   完成后内存: RSS ${afterMemory.rssFormatted}, Heap ${afterMemory.heapUsedFormatted}`);
      console.log(`   内存变化: ${this.formatBytes(memoryDiff, true)}`);
      
      return result;
      
    } catch (error) {
      const errorMemory = this.recordMemoryUsage(`${label} - 错误后`);
      const duration = Date.now() - startTime;
      
      console.error(`❌ ${label} 失败:`);
      console.error(`   耗时: ${duration}ms`);
      console.error(`   错误后内存: RSS ${errorMemory.rssFormatted}, Heap ${errorMemory.heapUsedFormatted}`);
      
      throw error;
    }
  }

  // 启动定期内存监控
  startPeriodicMonitoring(intervalMs = 60000) {
    console.log(`📊 启动定期内存监控，间隔: ${intervalMs}ms`);
    
    setInterval(() => {
      const report = this.generateReport();
      console.log('📊 定期内存报告:');
      console.log(`   当前时间: ${report.timestamp}`);
      console.log(`   RSS: ${report.current.rss}`);
      console.log(`   Heap Used: ${report.current.heapUsed}`);
      console.log(`   PDF Workers: ${report.pdfWorkers.workers.total} (可用: ${report.pdfWorkers.workers.available})`);
      
      if (report.comparison) {
        console.log(`   与基线比较: RSS ${report.comparison.rssDiff}, Heap ${report.comparison.heapUsedDiff}`);
      }
    }, intervalMs);
  }
}

module.exports = MemoryMonitor;
