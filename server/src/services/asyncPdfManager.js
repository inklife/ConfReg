const { generateReceiptPDF, generateConfirmationLetterPDF, generateRegistrationInfoPDF } = require('./pdfService');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const os = require('os');
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
    this.results = new Map(); // 存储生成结果（临时）
    
    // 从环境变量读取临时目录配置，如果未设置则使用系统临时目录
    const customTempDir = process.env.CONFREG_PDF_TEMP_DIR;
    if (customTempDir && customTempDir.trim()) {
      this._tempDir = path.resolve(customTempDir.trim());
    } else {
      this._tempDir = path.join(os.tmpdir(), 'CONFREG_PDF'); // 使用系统临时目录
    }
    
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5分钟清理一次
    
    // 确保临时目录存在
    this.ensureTempDir();
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
      this.tasks.set(taskId, {
        ...this.tasks.get(taskId),
        status: 'failed',
        error: error.message,
        finishedAt: new Date()
      });
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
      'confirmation': '确认函',
      'registration-info': '注册信息'
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

      let pdfBuffer;
      
      // 根据类型调用相应的生成函数
      switch (type) {
        case 'receipt':
          pdfBuffer = await generateReceiptPDF(submission, options);
          break;
        case 'confirmation':
          pdfBuffer = await generateConfirmationLetterPDF(submission, options);
          break;
        case 'registration-info':
          pdfBuffer = await generateRegistrationInfoPDF(submission, options);
          break;
        default:
          throw new Error(`未知的PDF类型: ${type}`);
      }

      // 将PDF保存到临时文件
      const filename = `${taskId}.pdf`;
      const filePath = path.join(this._tempDir, filename);
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
      
      throw error;
    }
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

    try {
      const pdfBuffer = await fs.readFile(task.filePath);
      return pdfBuffer;
    } catch (error) {
      console.error(`读取PDF文件失败 (任务 ${taskId}):`, error);
      return null;
    }
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
        // 删除临时文件
        if (task.filePath) {
          try {
            await fs.unlink(task.filePath);
            cleanedFiles++;
          } catch (error) {
            // 忽略文件删除错误（文件可能已经不存在）
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
      console.log(`🧹 清理PDF任务: ${cleanedTasks} 个过期任务, ${deletedTasks} 个已删除任务, ${cleanedFiles} 个文件`);
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
    // 但任务记录保留，文件路径信息保留，等待30分钟后物理删除（确保网速慢的用户也能完成下载）
    task.deleted = true;
    task.deletedAt = new Date();
    
    console.log(`✅ 已标记任务为删除: ${taskId} (30分钟后物理清理)`);
    return true;
  }

  /**
   * 关闭管理器
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 创建全局实例
const asyncPDFManager = new AsyncPDFManager();

// 优雅关闭处理
process.on('SIGINT', () => {
  asyncPDFManager.shutdown();
});

process.on('SIGTERM', () => {
  asyncPDFManager.shutdown();
});

module.exports = asyncPDFManager;
