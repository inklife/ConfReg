const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const os = require('os');
const { Worker } = require('worker_threads');
const pdfNotificationService = require('./pdfNotificationService');

/**
 * 异步 PDF 生成管理器
 * 解决长时间 PDF 生成阻塞主线程的问题
 */
class AsyncPDFManager {
  /**
   * 获取临时目录路径（只读）
   */
  get tempDir() {
    return this._tempDir;
  }

  constructor() {
    this.tasks = new Map(); // 存储任务状态
    this.workerPool = new Map(); // Worker池 (workerId -> workerInfo)
    this.taskQueue = []; // 任务队列
    this.maxConcurrentWorkers = 4; // 最大Worker数量
    this.nextWorkerId = 1; // Worker编号计数器
    this.workerIdleTimeout = 5 * 60 * 1000; // Worker空闲5分钟后销毁
    
    // 从环境变量读取临时目录配置，如果未设置则使用系统临时目录
    const customTempDir = process.env.CONFREG_PDF_TEMP_DIR;
    if (customTempDir && customTempDir.trim()) {
      this._tempDir = path.resolve(customTempDir.trim());
    } else {
      this._tempDir = path.join(os.tmpdir(), 'CONFREG_PDF'); // 统一PDF临时目录
    }
    
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5分钟清理一次
    
    console.log(`🏭 异步PDF管理器启动，最大并发Worker数量: ${this.maxConcurrentWorkers}`);
    
    // 确保临时目录存在（异步执行，不阻塞构造函数）
    this.ensureTempDir().catch(error => {
      console.error('初始化异步PDF临时目录失败:', error);
    });
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this._tempDir, { recursive: true });
      console.log(`📁 PDF临时目录已准备: ${this._tempDir}`);
    } catch (error) {
      console.error('创建PDF临时目录失败:', error);
      // 如果创建失败，回退到当前目录下的temp-pdf
      this._tempDir = path.join(__dirname, '../../temp-pdf');
      console.log(`⚠️ 回退到本地临时目录: ${this._tempDir}`);
      try {
        await fs.mkdir(this._tempDir, { recursive: true });
      } catch (fallbackError) {
        console.error('创建回退临时目录失败:', fallbackError);
      }
    }
  }



  /**
   * 生成唯一任务ID
   */
  generateTaskId() {
    return `pdf_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * 开始异步PDF生成
   * @param {string} type - PDF类型 ('receipt', 'confirmation', 'registration-info')
   * @param {Object} submission - 提交数据
   * @param {Object} options - PDF选项
   * @returns {string|Object} 任务ID或错误信息
   */
  async startPDFGeneration(type, submission, options = {}) {
    const userId = submission.userId || submission.user?.id;
    
    // 检查是否已有同一用户同一类型的正在进行的任务
    const existingTask = this.findExistingTask(userId, type);
    if (existingTask) {
      return {
        error: true,
        message: `您已有一个正在生成的${this.getTypeName(type)}任务`,
        existingTaskId: existingTask.id,
        status: existingTask.status,
        progress: existingTask.progress
      };
    }
    
    const taskId = this.generateTaskId();
    
    // 设置任务状态
    this.tasks.set(taskId, {
      id: taskId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      submissionId: submission.id,
      userId: userId
    });

    // 异步开始PDF生成（不等待）
    this.generatePDFAsync(taskId, type, submission, options).catch(error => {
      console.error(`异步PDF生成失败 (任务 ${taskId}):`, error);
      const failedTask = {
        ...this.tasks.get(taskId),
        status: 'failed',
        error: error.message,
        finishedAt: new Date()
      };
      this.tasks.set(taskId, failedTask);
      
      // 发送失败通知（作为双重保险）
      pdfNotificationService.notifyPDFStatus(failedTask.userId, failedTask);
    });

    return taskId;
  }

  /**
   * 查找用户的现有任务
   * @param {number} userId - 用户ID
   * @param {string} type - PDF类型
   * @returns {Object|null} 现有任务或null
   */
  findExistingTask(userId, type) {
    for (const task of this.tasks.values()) {
      if (task.userId === userId && 
          task.type === type && 
          (task.status === 'pending' || task.status === 'processing')) {
        return task;
      }
    }
    return null;
  }

  /**
   * 获取PDF类型的中文名称
   * @param {string} type - PDF类型
   * @returns {string} 中文名称
   */
  getTypeName(type) {
    const typeNames = {
      'receipt': '收据',
      'confirmation-letter': '确认函',
      'registration-info': '注册信息',
      'meal-voucher': '餐券'
    };
    return typeNames[type] || type;
  }

  /**
   * 异步PDF生成实现
   */
  async generatePDFAsync(taskId, type, submission, options) {
    try {
      // 更新状态为处理中
      this.tasks.set(taskId, {
        ...this.tasks.get(taskId),
        status: 'processing',
        progress: 20,
        startedAt: new Date()
      });

      // 使用Worker池生成PDF
      const filename = `${taskId}.pdf`;
      let filePath = path.join(this._tempDir, filename);
      
      // 确保临时目录存在
      try {
        await fs.mkdir(this._tempDir, { recursive: true });
      } catch (dirError) {
        console.warn(`创建临时目录失败，尝试回退: ${dirError.message}`);
        // 回退到本地临时目录
        const fallbackDir = path.join(__dirname, '../../temp-pdf');
        await fs.mkdir(fallbackDir, { recursive: true });
        filePath = path.join(fallbackDir, filename);
        console.log(`📁 使用回退目录: ${fallbackDir}`);
      }
      
      // 使用Worker池生成PDF
      const pdfBuffer = await this.generatePDFWithWorker(taskId, type, submission, options);
      
      // 保存PDF到文件
      await fs.writeFile(filePath, pdfBuffer);

      // 更新任务状态为完成
      const completedTask = {
        ...this.tasks.get(taskId),
        status: 'completed',
        progress: 100,
        finishedAt: new Date(),
        filename,
        filePath,
        fileSize: pdfBuffer.length
      };
      this.tasks.set(taskId, completedTask);

      // 发送完成通知
      pdfNotificationService.notifyPDFCompleted(completedTask.userId, completedTask);

      console.log(`✅ 异步PDF生成完成: 任务 ${taskId}, 大小: ${pdfBuffer.length} bytes`);

    } catch (error) {
      // 更新任务状态为失败
      const failedTask = {
        ...this.tasks.get(taskId),
        status: 'failed',
        progress: 0,
        error: error.message,
        finishedAt: new Date()
      };
      this.tasks.set(taskId, failedTask);
      
      // 发送失败通知
      pdfNotificationService.notifyPDFStatus(failedTask.userId, failedTask);
      
      console.error(`异步PDF生成失败 (任务 ${taskId}):`, error.message);
      // 不再抛出错误，因为错误已经被记录和通知
    }
  }

  /**
   * 获取可用的Worker，如果没有则创建新的Worker
   */
  async getAvailableWorker() {
    // 1. 查找空闲的Worker
    for (const [workerId, workerInfo] of this.workerPool.entries()) {
      if (workerInfo.status === 'idle') {
        return { workerId, workerInfo };
      }
    }

    // 2. 如果没有空闲Worker且未达到最大数量，创建新Worker
    if (this.workerPool.size < this.maxConcurrentWorkers) {
      const { workerId, workerInfo } = await this.createNewWorker();
      return { workerId, workerInfo };
    }

    // 3. 所有Worker都忙，需要等待
    return null;
  }

  /**
   * 创建新的Worker
   */
  async createNewWorker() {
    const workerId = this.nextWorkerId++;
    const workerPath = path.join(__dirname, './pdfWorker.js');
    const worker = new Worker(workerPath);

    const workerInfo = {
      id: workerId,
      worker: worker,
      status: 'idle', // idle, busy
      currentTask: null,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      tasksCompleted: 0,
      idleTimer: null
    };

    // 设置Worker事件监听
    this.setupWorkerEventListeners(workerId, workerInfo);

    this.workerPool.set(workerId, workerInfo);
    console.log(`🔧 创建新 PDF Worker #${workerId}，Worker池大小: ${this.workerPool.size}/${this.maxConcurrentWorkers}`);
    this.logCurrentWorkerStatus();

    return { workerId, workerInfo };
  }

  /**
   * 设置Worker事件监听器
   */
  setupWorkerEventListeners(workerId, workerInfo) {
    const worker = workerInfo.worker;

    worker.on('message', (result) => {
      this.handleWorkerMessage(workerId, result);
    });

    worker.on('error', (error) => {
      console.error(`❌ PDF Worker #${workerId} 发生错误:`, error.message);
      this.handleWorkerError(workerId, error);
    });

    worker.on('exit', (code) => {
      console.log(`🚪 PDF Worker #${workerId} 退出，代码: ${code}`);
      this.handleWorkerExit(workerId, code);
    });
  }

  /**
   * 处理Worker消息
   */
  handleWorkerMessage(workerId, result) {
    const workerInfo = this.workerPool.get(workerId);
    if (!workerInfo) return;

    const { taskId, success, pdfBuffer } = result;
    
    console.log(`✅ PDF Worker #${workerId} 完成任务 ${taskId}，PDF大小: ${pdfBuffer?.length || 0} bytes`);
    
    // 清除任务超时计时器
    if (workerInfo.taskTimeout) {
      clearTimeout(workerInfo.taskTimeout);
      workerInfo.taskTimeout = null;
    }
    
    // 更新Worker状态为空闲
    workerInfo.status = 'idle';
    workerInfo.currentTask = null;
    workerInfo.lastActiveAt = new Date();
    workerInfo.tasksCompleted++;
    
    // 设置空闲超时
    this.setWorkerIdleTimeout(workerId, workerInfo);
    
    // 解决当前任务的Promise
    if (workerInfo.currentPromise) {
      if (success) {
        const buffer = Buffer.from(pdfBuffer);
        workerInfo.currentPromise.resolve(buffer);
      } else {
        workerInfo.currentPromise.reject(new Error(result.error));
      }
      workerInfo.currentPromise = null;
    }

    this.logCurrentWorkerStatus();
    
    // 处理队列中的下一个任务
    this.processNextTask();
  }

  /**
   * 处理Worker错误
   */
  handleWorkerError(workerId, error) {
    const workerInfo = this.workerPool.get(workerId);
    if (!workerInfo) return;

    // 清除任务超时计时器
    if (workerInfo.taskTimeout) {
      clearTimeout(workerInfo.taskTimeout);
      workerInfo.taskTimeout = null;
    }

    if (workerInfo.currentPromise) {
      workerInfo.currentPromise.reject(error);
      workerInfo.currentPromise = null;
    }

    // 移除出错的Worker
    this.destroyWorker(workerId);
  }

  /**
   * 处理Worker退出
   */
  handleWorkerExit(workerId, code) {
    const workerInfo = this.workerPool.get(workerId);
    if (!workerInfo) return;

    // 清除任务超时计时器
    if (workerInfo.taskTimeout) {
      clearTimeout(workerInfo.taskTimeout);
      workerInfo.taskTimeout = null;
    }

    if (code !== 0 && workerInfo.currentPromise) {
      workerInfo.currentPromise.reject(new Error(`Worker #${workerId} 异常退出，代码: ${code}`));
      workerInfo.currentPromise = null;
    }

    // 移除退出的Worker
    this.destroyWorker(workerId);
  }

  /**
   * 设置Worker空闲超时
   */
  setWorkerIdleTimeout(workerId, workerInfo) {
    // 清除之前的超时器
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer);
    }

    // 设置新的空闲超时
    workerInfo.idleTimer = setTimeout(() => {
      console.log(`⏰ PDF Worker #${workerId} 空闲超时，销毁Worker (完成任务数: ${workerInfo.tasksCompleted})`);
      this.destroyWorker(workerId);
    }, this.workerIdleTimeout);
  }

  /**
   * 销毁Worker
   */
  destroyWorker(workerId) {
    const workerInfo = this.workerPool.get(workerId);
    if (!workerInfo) return;

    // 清除空闲超时器
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer);
    }
    
    // 清除任务超时计时器
    if (workerInfo.taskTimeout) {
      clearTimeout(workerInfo.taskTimeout);
    }

    // 关闭Worker
    try {
      workerInfo.worker.terminate();
    } catch (error) {
      console.warn(`关闭Worker时出错:`, error.message);
    }

    // 从Worker池中移除
    this.workerPool.delete(workerId);
    
    console.log(`🗑️ PDF Worker #${workerId} 已销毁，Worker池大小: ${this.workerPool.size}/${this.maxConcurrentWorkers}`);
    this.logCurrentWorkerStatus();
  }

  /**
   * 使用Worker池处理PDF生成任务
   */
  async generatePDFWithWorker(taskId, type, submission, options) {
    return new Promise(async (resolve, reject) => {
      // 等待可用的Worker
      let availableWorker = await this.getAvailableWorker();
      
      // 如果没有可用Worker，加入队列等待
      if (!availableWorker) {
        console.log(`⏳ 所有Worker都忙，任务 ${taskId} 加入等待队列`);
        this.taskQueue.push({
          taskId, type, submission, options, resolve, reject
        });
        return;
      }

      // 分配任务给Worker
      this.assignTaskToWorker(availableWorker.workerId, availableWorker.workerInfo, {
        taskId, type, submission, options, resolve, reject
      });
    });
  }

  /**
   * 将任务分配给Worker
   */
  assignTaskToWorker(workerId, workerInfo, task) {
    const { taskId, type, submission, options, resolve, reject } = task;

    // 更新Worker状态
    workerInfo.status = 'busy';
    workerInfo.currentTask = taskId;
    workerInfo.lastActiveAt = new Date();
    workerInfo.currentPromise = { resolve, reject };

    // 清除空闲超时器
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer);
      workerInfo.idleTimer = null;
    }

    console.log(`� PDF Worker #${workerId} 开始处理任务 ${taskId} (类型: ${type})`);
    this.logCurrentWorkerStatus();

    // 设置任务超时
    workerInfo.taskTimeout = setTimeout(() => {
      console.log(`⏰ PDF Worker #${workerId} 任务 ${taskId} 执行超时，强制终止Worker`);
      this.destroyWorker(workerId);
      reject(new Error(`PDF Worker #${workerId} 任务超时`));
    }, 60000); // 60秒超时

    // 发送任务数据给Worker
    workerInfo.worker.postMessage({
      taskId: taskId,
      type: type,
      workerId: workerId,
      data: {
        submission: this.serializeSubmission(submission),
        options: options
      }
    });
  }

  /**
   * 处理队列中的下一个任务
   */
  async processNextTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = await this.getAvailableWorker();
    if (!availableWorker) return;

    const task = this.taskQueue.shift();
    this.assignTaskToWorker(availableWorker.workerId, availableWorker.workerInfo, task);
  }

  /**
   * 序列化提交数据
   */
  serializeSubmission(submission) {
    // 如果已经是普通对象，直接返回
    if (!submission.toJSON) {
      return submission;
    }
    
    // 转换为普通对象
    const plainObject = submission.toJSON();
    
    // 确保日期对象被正确序列化
    if (plainObject.submission_time && typeof plainObject.submission_time === 'object') {
      plainObject.submission_time = plainObject.submission_time.toISOString();
    }
    
    if (plainObject.review_time && typeof plainObject.review_time === 'object') {
      plainObject.review_time = plainObject.review_time.toISOString();
    }
    
    return plainObject;
  }

  /**
   * 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Object|null} 任务状态（已删除的任务返回null）
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.deleted) {
      return null;
    }
    return task;
  }

  /**
   * 获取PDF文件
   * @param {string} taskId - 任务ID
   * @returns {Buffer|null} PDF缓冲区
   */
  async getPDFFile(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'completed') {
      return null;
    }

    // 从文件系统读取PDF文件
    if (task.filePath) {
      try {
        const pdfBuffer = await fs.readFile(task.filePath);
        return pdfBuffer;
      } catch (error) {
        console.error(`读取PDF文件失败 (任务 ${taskId}):`, error);
        return null;
      }
    }

    console.error(`PDF文件路径不存在 (任务 ${taskId})`);
    return null;
  }

  /**
   * 清理过期任务和文件
   */
  async cleanup() {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30分钟
    let cleanedFiles = 0;
    let cleanedTasks = 0;
    let deletedTasks = 0;
    
    for (const [taskId, task] of this.tasks.entries()) {
      const age = now - task.createdAt;
      let shouldDelete = false;
      
      // 条件1：任务超过30分钟
      if (age > maxAge) {
        shouldDelete = true;
      }
      
      // 条件2：任务被标记为删除且删除时间超过30分钟（给网速慢的用户足够的下载时间）
      if (task.deleted && task.deletedAt) {
        const deletedAge = now - task.deletedAt;
        if (deletedAge > maxAge) { // 30分钟后物理删除
          shouldDelete = true;
        }
      }
      
      if (shouldDelete) {
        // 删除文件系统中的PDF文件
        if (task.filePath) {
          try {
            await fs.unlink(task.filePath);
            cleanedFiles++;
          } catch (error) {
            console.warn(`删除PDF文件失败 (${task.filePath}):`, error.message);
          }
        }
        
        // 物理删除任务记录
        this.tasks.delete(taskId);
        
        if (task.deleted) {
          deletedTasks++;
        } else {
          cleanedTasks++;
        }
      }
    }
    
    if (cleanedTasks > 0 || deletedTasks > 0) {
      console.log(`🧹 清理PDF任务: ${cleanedTasks} 个过期任务, ${deletedTasks} 个已删除任务, ${cleanedFiles} 个PDF文件`);
    }
    
    // 检查并清理空的临时目录
    try {
      const files = await fs.readdir(this._tempDir);
      if (files.length === 0) {
        // 如果是系统临时目录下的子目录且为空，可以删除
        if (this._tempDir.includes(os.tmpdir()) && path.basename(this._tempDir) === 'CONFREG_PDF') {
          await fs.rmdir(this._tempDir);
          console.log(`🧹 删除空的PDF临时目录: ${this._tempDir}`);
        }
      }
    } catch (error) {
      // 忽略目录操作错误
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      totalTasks: this.tasks.size,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      deleted: 0
    };

    for (const task of this.tasks.values()) {
      if (task.deleted) {
        stats.deleted++;
      } else {
        stats[task.status]++;
      }
    }

    return stats;
  }

  /**
   * 获取指定用户的所有任务
   * @param {string} userId - 用户ID
   * @returns {Array} 用户的任务列表（不包括已删除的任务）
   */
  getUserTasks(userId) {
    const userTasks = [];
    
    for (const task of this.tasks.values()) {
      if ((task.userId === userId || task.userId === parseInt(userId)) && !task.deleted) {
        userTasks.push(task);
      }
    }
    
    // 按创建时间倒序排列
    return userTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * 标记任务为已下载状态
   * @param {string} taskId - 任务ID
   */
  async markTaskAsDownloaded(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // 更新任务状态为已下载
    task.status = 'downloaded';
    task.downloadedAt = new Date();
    
    // 通知前端任务已下载
    pdfNotificationService.notifyPDFDownloaded(task.userId, task);
    
    console.log(`📥 任务已标记为下载状态: ${taskId}`);
    return true;
  }

  /**
   * 清理指定任务（下载完成后调用）
   * @param {string} taskId - 任务ID
   */
  async cleanupTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // 逻辑删除：设置删除标记，前端API将不再返回此任务
    // 但任务记录和PDF文件保留，等待30分钟后物理删除（确保网速慢的用户也能完成下载）
    task.deleted = true;
    task.deletedAt = new Date();
    
    console.log(`✅ 已标记任务为删除: ${taskId} (30分钟后物理清理)`);
    return true;
  }

  /**
   * 关闭管理器
   */
  async shutdown() {
    console.log('🔄 关闭异步PDF管理器...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // 终止所有Worker池中的Worker
    for (const [workerId, workerInfo] of this.workerPool.entries()) {
      console.log(`🔄 关闭 PDF Worker #${workerId}...`);
      
      // 清除空闲超时器
      if (workerInfo.idleTimer) {
        clearTimeout(workerInfo.idleTimer);
      }
      
      try {
        await workerInfo.worker.terminate();
      } catch (error) {
        console.error(`终止Worker #${workerId}失败:`, error);
      }
    }
    
    this.workerPool.clear();
    this.taskQueue = [];
    
    console.log('✅ 异步PDF管理器已关闭');
  }

  /**
   * 获取PDF工作状态统计
   */
  getPDFWorkerStats() {
    const stats = this.getStats();
    
    // 统计Worker状态
    let busyWorkers = 0;
    let idleWorkers = 0;
    const workerDetails = [];
    
    for (const [workerId, workerInfo] of this.workerPool.entries()) {
      if (workerInfo.status === 'busy') {
        busyWorkers++;
      } else if (workerInfo.status === 'idle') {
        idleWorkers++;
      }
      
      workerDetails.push({
        id: workerId,
        status: workerInfo.status,
        currentTask: workerInfo.currentTask,
        createdAt: workerInfo.createdAt,
        lastActiveAt: workerInfo.lastActiveAt,
        tasksCompleted: workerInfo.tasksCompleted,
        uptime: Date.now() - workerInfo.createdAt.getTime()
      });
    }
    
    return {
      workers: {
        poolCapacity: this.maxConcurrentWorkers,
        totalCreated: this.workerPool.size,
        busy: busyWorkers,
        idle: idleWorkers,
        available: this.maxConcurrentWorkers - this.workerPool.size,
        workerDetails: workerDetails,
        nextWorkerId: this.nextWorkerId
      },
      queue: {
        pending: stats.pending,
        processing: stats.processing,
        waiting: this.taskQueue.length
      },
      stats: {
        totalTasks: stats.totalTasks,
        completed: stats.completed,
        failed: stats.failed
      }
    };
  }

  /**
   * 显示当前Worker状态 (用于调试)
   */
  logCurrentWorkerStatus() {
    console.log(`📊 当前Worker池状态:`);
    console.log(`   - Worker池容量: ${this.maxConcurrentWorkers}`);
    console.log(`   - 已创建Worker: ${this.workerPool.size}`);
    console.log(`   - 可创建数量: ${this.maxConcurrentWorkers - this.workerPool.size}`);
    console.log(`   - 等待队列: ${this.taskQueue.length} 个任务`);
    console.log(`   - 下一个Worker ID: ${this.nextWorkerId}`);
    
    if (this.workerPool.size > 0) {
      let busyCount = 0;
      let idleCount = 0;
      
      console.log(`   - Worker详情:`);
      this.workerPool.forEach((workerInfo, workerId) => {
        const uptime = Math.round((Date.now() - workerInfo.createdAt.getTime()) / 1000);
        const status = workerInfo.status === 'busy' ? 
          `工作中 (任务: ${workerInfo.currentTask})` : 
          `空闲 (已完成: ${workerInfo.tasksCompleted}个任务)`;
        
        console.log(`     * Worker #${workerId}: ${status}, 运行时间: ${uptime}s`);
        
        if (workerInfo.status === 'busy') busyCount++;
        else if (workerInfo.status === 'idle') idleCount++;
      });
      
      console.log(`   - 状态汇总: ${busyCount}工作, ${idleCount}空闲`);
    } else {
      console.log(`   - 当前没有Worker运行`);
    }
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    const stats = this.getPDFWorkerStats();
    const memUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      workers: stats.workers,
      queue: stats.queue,
      performance: stats.stats,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      }
    };
  }
}

// 创建全局实例
const asyncPDFManager = new AsyncPDFManager();

// 优雅关闭处理
process.on('SIGINT', async () => {
  await asyncPDFManager.shutdown();
});

process.on('SIGTERM', async () => {
  await asyncPDFManager.shutdown();
});

module.exports = asyncPDFManager;
