const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

class PDFWorkerPool {
  constructor(maxWorkers = Math.min(os.cpus().length, 4), lazyInit = true) {
    this.maxWorkers = maxWorkers;
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.workerStats = new Map();
    this.lazyInit = lazyInit;
    this.workerIdleTimeout = 5 * 60 * 1000; // 5分钟空闲超时
    this.minWorkers = 0; // 最小保持的Worker数量
    this.isShuttingDown = false; // 添加关闭标志
    
    if (!lazyInit) {
      // 立即初始化所有worker
      this.initializeWorkers();
    }
    
    // 定期清理超时任务和空闲Worker
    this.cleanupInterval = setInterval(() => {
      this.cleanupTimeoutTasks();
      this.cleanupIdleWorkers();
    }, 30000); // 每30秒检查一次
  }

  initializeWorkers() {
    const workerScript = path.join(__dirname, 'pdfWorker.js');
    
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker(i);
    }
  }

  async createWorker(workerId = null) {
    const workerScript = path.join(__dirname, 'pdfWorker.js');
    
    // 如果没有指定workerId，生成一个新的
    if (workerId === null) {
      workerId = this.workers.length;
    }
    
    try {
      const worker = new Worker(workerScript);
      const workerIdString = `worker_${workerId}`;
      
      worker.workerId = workerIdString;
      worker.isAvailable = true;
      worker.currentTask = null;
      worker.lastUsed = Date.now();
      worker.createdAt = Date.now();
      
      this.workers.push(worker);
      this.availableWorkers.push(worker);
      this.workerStats.set(workerIdString, {
        tasksCompleted: 0,
        totalTime: 0,
        errors: 0,
        created: Date.now()
      });

      // 监听worker消息
      worker.on('message', (result) => {
        this.handleWorkerMessage(worker, result);
      });

      // 监听worker错误
      worker.on('error', (error) => {
        this.handleWorkerError(worker, error);
      });

      // 监听worker退出
      worker.on('exit', (code) => {
        this.handleWorkerExit(worker, code);
      });

      console.log(`✅ PDF Worker ${workerIdString} 创建成功 (总数: ${this.workers.length})`);
      return worker;
      
    } catch (error) {
      console.error(`❌ 创建 PDF Worker ${workerId} 失败:`, error);
      return null;
    }
  }

  // 清理空闲Worker
  cleanupIdleWorkers() {
    const now = Date.now();
    const workersToRemove = [];
    
    // 只有当Worker数量超过最小数量时才清理
    if (this.workers.length <= this.minWorkers) {
      return;
    }
    
    this.availableWorkers.forEach(worker => {
      const idleTime = now - worker.lastUsed;
      if (idleTime > this.workerIdleTimeout && this.workers.length > this.minWorkers) {
        workersToRemove.push(worker);
      }
    });
    
    workersToRemove.forEach(worker => {
      this.removeWorker(worker);
      console.log(`🧹 清理空闲Worker ${worker.workerId}，空闲时间: ${Math.round((now - worker.lastUsed) / 1000)}秒`);
    });
  }

  // 移除Worker
  removeWorker(worker) {
    // 标记为正常移除，避免触发重启
    worker.isBeingRemoved = true;
    
    // 从可用列表中移除
    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    // 从workers列表中移除
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex > -1) {
      this.workers.splice(workerIndex, 1);
    }

    // 移除统计信息
    this.workerStats.delete(worker.workerId);

    // 终止worker
    worker.terminate();
  }

  async generatePDF(taskData) {
    return new Promise((resolve, reject) => {
      const task = {
        id: this.generateTaskId(),
        data: taskData,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout: 150000 // 150秒超时（为了测试120秒延迟）
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  async processQueue() {
    // 处理所有等待的任务
    while (this.taskQueue.length > 0) {
      // 如果没有可用Worker但还能创建新Worker
      if (this.availableWorkers.length === 0 && this.workers.length < this.maxWorkers) {
        console.log(`📄 按需创建新Worker，当前: ${this.workers.length}/${this.maxWorkers}，队列: ${this.taskQueue.length}`);
        await this.createWorker();
      }

      // 如果仍然没有可用Worker，等待或跳出
      if (this.availableWorkers.length === 0) {
        console.log(`⏳ 所有Worker忙碌，队列中还有 ${this.taskQueue.length} 个任务等待`);
        break; // 没有可用Worker且已达最大数量，等待Worker释放
      }

      const worker = this.availableWorkers.pop();
      const task = this.taskQueue.shift();

      worker.isAvailable = false;
      worker.currentTask = task;
      worker.lastUsed = Date.now(); // 记录最后使用时间

      // 设置任务超时
      task.timeoutId = setTimeout(() => {
        this.handleTaskTimeout(worker, task);
      }, task.timeout);

      // 发送任务到worker
      try {
        worker.postMessage({
          taskId: task.id,
          type: task.data.type,
          data: task.data
        });
        
        console.log(`📄 任务 ${task.id} 分配给 ${worker.workerId} (剩余队列: ${this.taskQueue.length})`);
      } catch (error) {
        this.handleWorkerError(worker, error);
      }
    }
  }

  handleWorkerMessage(worker, result) {
    const task = worker.currentTask;
    if (!task) return;

    // 清除超时
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
    }

    // 更新统计
    const stats = this.workerStats.get(worker.workerId);
    stats.tasksCompleted++;
    stats.totalTime += Date.now() - task.createdAt;

    // 释放worker并更新最后使用时间
    worker.isAvailable = true;
    worker.currentTask = null;
    worker.lastUsed = Date.now();
    this.availableWorkers.push(worker);

    if (result.success) {
      console.log(`✅ 任务 ${task.id} 完成 (${worker.workerId})`);
      task.resolve(Buffer.from(result.pdfBuffer));
    } else {
      console.error(`❌ 任务 ${task.id} 失败:`, result.error);
      stats.errors++;
      task.reject(new Error(result.error));
    }

    // 处理下一个任务
    setImmediate(() => this.processQueue());
  }

  handleWorkerError(worker, error) {
    console.error(`❌ Worker ${worker.workerId} 错误:`, error);
    
    const task = worker.currentTask;
    if (task) {
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }
      task.reject(error);
    }

    // 重启worker
    this.restartWorker(worker);
  }

  handleWorkerExit(worker, code) {
    // 如果是正常移除，不要重启
    if (worker.isBeingRemoved) {
      console.log(`✅ Worker ${worker.workerId} 正常退出 (清理空闲Worker)`);
      return;
    }
    
    console.warn(`⚠️ Worker ${worker.workerId} 退出，代码: ${code}`);
    
    const task = worker.currentTask;
    if (task) {
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }
      task.reject(new Error(`Worker exited with code ${code}`));
    }

    // 重启worker
    this.restartWorker(worker);
  }

  handleTaskTimeout(worker, task) {
    console.warn(`⏰ 任务 ${task.id} 超时 (${worker.workerId})`);
    
    task.reject(new Error('PDF generation timeout'));
    
    // 终止worker并重启
    this.restartWorker(worker);
  }

  restartWorker(worker) {
    // 如果正在关闭，不要重启Worker
    if (this.isShuttingDown) {
      console.log(`🔄 跳过重启 Worker ${worker.workerId}，正在关闭中`);
      return;
    }
    
    try {
      // 从可用列表中移除
      const availableIndex = this.availableWorkers.indexOf(worker);
      if (availableIndex > -1) {
        this.availableWorkers.splice(availableIndex, 1);
      }

      // 从workers列表中移除
      const workerIndex = this.workers.indexOf(worker);
      if (workerIndex > -1) {
        this.workers.splice(workerIndex, 1);
      }

      // 终止worker
      worker.terminate();

      // 创建新worker
      setTimeout(() => {
        // 再次检查是否正在关闭
        if (this.isShuttingDown) {
          return;
        }
        
        const workerScript = path.join(__dirname, 'pdfWorker.js');
        const newWorker = new Worker(workerScript);
        
        newWorker.workerId = worker.workerId;
        newWorker.isAvailable = true;
        newWorker.currentTask = null;
        newWorker.lastUsed = Date.now();
        newWorker.createdAt = Date.now();

        this.workers.push(newWorker);
        this.availableWorkers.push(newWorker);

        // 重新绑定事件监听器
        newWorker.on('message', (result) => {
          this.handleWorkerMessage(newWorker, result);
        });

        newWorker.on('error', (error) => {
          this.handleWorkerError(newWorker, error);
        });

        newWorker.on('exit', (code) => {
          this.handleWorkerExit(newWorker, code);
        });

        console.log(`🔄 Worker ${worker.workerId} 重启成功`);
        
        // 继续处理队列
        this.processQueue();
      }, 1000);

    } catch (error) {
      console.error(`❌ 重启 Worker ${worker.workerId} 失败:`, error);
    }
  }

  cleanupTimeoutTasks() {
    const now = Date.now();
    const beforeCount = this.taskQueue.length;
    
    this.taskQueue = this.taskQueue.filter(task => {
      if (now - task.createdAt > task.timeout) {
        task.reject(new Error('Task timeout in queue'));
        return false;
      }
      return true;
    });

    if (this.taskQueue.length !== beforeCount) {
      console.log(`🧹 清理了 ${beforeCount - this.taskQueue.length} 个超时队列任务`);
    }
  }

  generateTaskId() {
    return `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    const totalTasks = Array.from(this.workerStats.values())
      .reduce((sum, stats) => sum + stats.tasksCompleted, 0);
    
    const totalErrors = Array.from(this.workerStats.values())
      .reduce((sum, stats) => sum + stats.errors, 0);

    return {
      workers: {
        total: this.workers.length,
        available: this.availableWorkers.length,
        busy: this.workers.length - this.availableWorkers.length
      },
      queue: {
        pending: this.taskQueue.length
      },
      stats: {
        totalTasks,
        totalErrors,
        errorRate: totalTasks > 0 ? (totalErrors / totalTasks * 100).toFixed(2) + '%' : '0%'
      },
      workerDetails: Object.fromEntries(this.workerStats)
    };
  }

  async shutdown() {
    console.log('🔄 关闭 PDF Worker Pool...');
    
    // 设置关闭标志
    this.isShuttingDown = true;
    
    // 清理定时器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // 拒绝所有排队的任务
    this.taskQueue.forEach(task => {
      task.reject(new Error('Server shutting down'));
    });
    this.taskQueue = [];

    // 终止所有workers
    const shutdownPromises = this.workers.map(worker => {
      return new Promise((resolve) => {
        worker.once('exit', resolve);
        worker.terminate();
      });
    });

    await Promise.all(shutdownPromises);
    
    // 清理数据
    this.workers = [];
    this.availableWorkers = [];
    this.workerStats.clear();
    
    console.log('✅ PDF Worker Pool 已关闭');
  }
}

module.exports = PDFWorkerPool;
