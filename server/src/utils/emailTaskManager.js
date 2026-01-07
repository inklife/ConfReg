/**
 * ICPADS 2025 邮件任务管理器
 * 用于管理群发邮件任务的创建、执行和进度追踪
 */

const fs = require('fs');
const path = require('path');
const emailService = require('./emailService');

// 任务文件存储路径
const TASKS_FILE_PATH = path.join(__dirname, '../../database/email_tasks.json');

// 任务状态枚举
const TaskStatus = {
  PENDING: 'pending',      // 等待执行
  RUNNING: 'running',      // 执行中
  COMPLETED: 'completed',  // 已完成
  FAILED: 'failed',        // 失败
  CANCELLED: 'cancelled'   // 已取消
};

// 支持的模板变量
const TEMPLATE_VARIABLES = {
  username: { description: '用户姓名', example: 'Zhang San' },
  email: { description: '用户邮箱', example: 'user@example.com' },
  registration_id: { description: '注册ID', example: '12345' },
  affiliation: { description: '单位名称', example: '北京大学' },
  product_code: { description: '注册产品代码', example: 'FULL-REGULAR' },
  payment_method: { description: '支付方式', example: 'domestic/international' },
  total_amount: { description: '总金额', example: '¥3000 / $450' },
  status: { description: '注册状态', example: 'approved' },
  date: { description: '当前日期', example: '2026-01-07' }
};

class EmailTaskManager {
  constructor() {
    this.currentTask = null;
    this.isProcessing = false;
    this.ensureTasksFile();
  }

  /**
   * 确保任务文件存在
   */
  ensureTasksFile() {
    const dir = path.dirname(TASKS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(TASKS_FILE_PATH)) {
      fs.writeFileSync(TASKS_FILE_PATH, JSON.stringify({ tasks: [] }, null, 2));
    }
  }

  /**
   * 读取所有任务
   */
  readTasks() {
    try {
      const content = fs.readFileSync(TASKS_FILE_PATH, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read tasks file:', error);
      return { tasks: [] };
    }
  }

  /**
   * 保存任务数据
   */
  saveTasks(data) {
    try {
      fs.writeFileSync(TASKS_FILE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save tasks file:', error);
    }
  }

  /**
   * 获取支持的模板变量列表
   */
  getTemplateVariables() {
    return TEMPLATE_VARIABLES;
  }

  /**
   * 替换模板变量
   */
  replaceTemplateVariables(template, userData) {
    let result = template;
    
    // 替换所有支持的模板变量
    for (const [key, value] of Object.entries(userData)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    }
    
    // 替换日期变量
    const dateRegex = /\{\{\s*date\s*\}\}/g;
    result = result.replace(dateRegex, new Date().toISOString().split('T')[0]);
    
    return result;
  }

  /**
   * 创建新的邮件任务
   */
  createTask(taskData) {
    const { 
      subject, 
      content, 
      recipients, 
      ccList = [], 
      filterType, 
      filterSubType,
      createdBy 
    } = taskData;

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task = {
      id: taskId,
      subject,
      content,
      recipients: recipients.map(r => ({
        email: r.email,
        userData: r,
        status: 'pending',
        sentAt: null,
        error: null
      })),
      ccList,
      filterType,
      filterSubType,
      totalCount: recipients.length,
      successCount: 0,
      failedCount: 0,
      status: TaskStatus.PENDING,
      createdBy,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null
    };

    // 保存任务
    const data = this.readTasks();
    data.tasks.unshift(task); // 新任务放在最前面
    
    // 只保留最近100个任务
    if (data.tasks.length > 100) {
      data.tasks = data.tasks.slice(0, 100);
    }
    
    this.saveTasks(data);

    return task;
  }

  /**
   * 获取任务详情
   */
  getTask(taskId) {
    const data = this.readTasks();
    return data.tasks.find(t => t.id === taskId);
  }

  /**
   * 获取任务列表
   */
  getTasks(page = 1, limit = 10) {
    const data = this.readTasks();
    const total = data.tasks.length;
    const start = (page - 1) * limit;
    const tasks = data.tasks.slice(start, start + limit);
    
    return {
      tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 更新任务状态
   */
  updateTask(taskId, updates) {
    const data = this.readTasks();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      return null;
    }
    
    data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
    this.saveTasks(data);
    
    return data.tasks[taskIndex];
  }

  /**
   * 更新收件人状态（使用索引精确匹配，避免重复邮箱问题）
   */
  updateRecipientStatus(taskId, recipientIndex, status, error = null) {
    const data = this.readTasks();
    const task = data.tasks.find(t => t.id === taskId);
    
    if (!task) return null;
    
    const recipient = task.recipients[recipientIndex];
    if (recipient) {
      recipient.status = status;
      recipient.sentAt = status === 'sent' ? new Date().toISOString() : null;
      recipient.error = error;
      
      // 更新计数
      task.successCount = task.recipients.filter(r => r.status === 'sent').length;
      task.failedCount = task.recipients.filter(r => r.status === 'failed').length;
    }
    
    this.saveTasks(data);
    return task;
  }

  /**
   * 执行邮件任务（群发单显）
   */
  async executeTask(taskId) {
    const task = this.getTask(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (this.isProcessing) {
      throw new Error('Another task is currently running');
    }
    
    this.isProcessing = true;
    this.currentTask = taskId;
    
    // 更新任务状态为执行中
    this.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      startedAt: new Date().toISOString()
    });
    
    try {
      // 遍历所有收件人，使用索引来精确追踪
      for (let i = 0; i < task.recipients.length; i++) {
        const recipient = task.recipients[i];
        
        // 跳过已处理的收件人
        if (recipient.status !== 'pending') {
          continue;
        }
        
        // 检查任务是否被取消
        const currentTask = this.getTask(taskId);
        if (currentTask.status === TaskStatus.CANCELLED) {
          break;
        }
        
        // 实现重试机制：每个邮箱最多重试1次，30秒后重试
        let retryCount = 0;
        let lastError = null;
        
        while (retryCount <= 1) { // 最多重试1次（总共尝试2次）
          try {
            // 替换模板变量
            const personalizedContent = this.replaceTemplateVariables(task.content, recipient.userData);
            const personalizedSubject = this.replaceTemplateVariables(task.subject, recipient.userData);
            
            // 构建邮件HTML
            const html = this.buildEmailHtml(personalizedContent, recipient.userData);
            
            // 发送邮件（添加30秒超时保护）
            const sendEmailPromise = emailService.sendEmail({
              to: recipient.email,
              subject: personalizedSubject,
              html: html,
              text: personalizedContent,
              cc: task.ccList.length > 0 ? task.ccList.join(',') : undefined
            });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
            );
            
            await Promise.race([sendEmailPromise, timeoutPromise]);
            
            // 更新收件人状态为已发送（使用索引）
            this.updateRecipientStatus(taskId, i, 'sent');
            
            console.log(`✅ Email sent successfully [${i + 1}/${task.recipients.length}]: ${recipient.email}${retryCount > 0 ? ` (重试${retryCount}次后成功)` : ''}`);
            
            // 发送间隔，避免被邮件服务器限流（3秒）
            await this.delay(3000);
            
            break; // 成功发送，跳出重试循环
            
          } catch (error) {
            lastError = error;
            retryCount++;
            
            if (retryCount <= 1) {
              // 还有重试机会，等待30秒后重试
              console.warn(`⚠️ Email send failed [${i + 1}/${task.recipients.length}] to ${recipient.email}, will retry in 30 seconds... (attempt ${retryCount}/2)`);
              await this.delay(30000); // 等待30秒
            } else {
              // 已达到最大重试次数，标记为失败
              console.error(`❌ Failed to send email [${i + 1}/${task.recipients.length}] to ${recipient.email} after ${retryCount} attempts:`, error.message);
              this.updateRecipientStatus(taskId, i, 'failed', `重试${retryCount}次后失败: ${error.message}`);
            }
          }
        }
      }
      
      // 检查最终状态
      const finalTask = this.getTask(taskId);
      const allSent = finalTask.recipients.every(r => r.status === 'sent' || r.status === 'failed');
      
      if (allSent) {
        this.updateTask(taskId, {
          status: finalTask.failedCount === 0 ? TaskStatus.COMPLETED : TaskStatus.COMPLETED,
          completedAt: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Task execution error:', error);
      this.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: error.message,
        completedAt: new Date().toISOString()
      });
    } finally {
      this.isProcessing = false;
      this.currentTask = null;
    }
    
    return this.getTask(taskId);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    const data = this.readTasks();
    const task = data.tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (task.status !== TaskStatus.RUNNING && task.status !== TaskStatus.PENDING) {
      throw new Error('Task cannot be cancelled');
    }
    
    // 将所有pending状态的收件人标记为cancelled
    let cancelledCount = 0;
    task.recipients.forEach((recipient, index) => {
      if (recipient.status === 'pending') {
        recipient.status = 'cancelled';
        recipient.error = '任务被管理员取消';
        cancelledCount++;
      }
    });
    
    task.status = TaskStatus.CANCELLED;
    task.completedAt = new Date().toISOString();
    task.cancelledCount = cancelledCount;
    
    this.saveTasks(data);
    
    console.log(`🛑 Task cancelled: ${taskId}, ${cancelledCount} recipients marked as cancelled`);
    
    return task;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取任务的失败收件人列表
   */
  getFailedRecipients(taskId) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    return task.recipients.filter(r => r.status === 'failed' || r.status === 'cancelled');
  }

  /**
   * 基于失败的收件人重试任务
   */
  async retryTask(taskId, createdBy = 'admin') {
    const originalTask = this.getTask(taskId);
    
    if (!originalTask) {
      throw new Error('Original task not found');
    }
    
    // 获取失败的收件人
    const failedRecipients = this.getFailedRecipients(taskId);
    
    if (failedRecipients.length === 0) {
      throw new Error('No failed recipients to retry');
    }
    
    // 创建新任务，使用失败的收件人
    const newTask = await this.createTask({
      subject: originalTask.subject,
      content: originalTask.content,
      recipients: failedRecipients.map(r => ({
        email: r.email,
        userData: r.userData
      })),
      ccList: originalTask.ccList || [],
      filterType: originalTask.filterType,
      filterSubType: originalTask.filterSubType,
      createdBy,
      isRetry: true,
      originalTaskId: taskId
    });
    
    console.log(`🔄 Retry task created: ${newTask.id} for ${failedRecipients.length} failed recipients from task ${taskId}`);
    
    // 立即执行新任务
    await this.executeTask(newTask.id);
    
    return newTask;
  }

  /**
   * 构建邮件HTML
   */
  buildEmailHtml(content, userData) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">ICPADS 2025</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">The 25th IEEE International Conference on Parallel and Distributed Systems</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="color: #555; font-size: 15px; line-height: 1.8;">
                ${content.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #888; font-size: 12px; text-align: center;">
                This email was sent from ICPADS 2025 Registration System.<br>
                If you have any questions, please contact us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * 获取当前正在执行的任务
   */
  getCurrentTask() {
    if (!this.currentTask) return null;
    return this.getTask(this.currentTask);
  }

  /**
   * 检查是否有任务正在执行
   */
  isTaskRunning() {
    return this.isProcessing;
  }

  /**
   * 删除任务（如果任务正在运行，先取消再删除）
   */
  deleteTask(taskId) {
    const data = this.readTasks();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      return false;
    }
    
    const task = data.tasks[taskIndex];
    
    // 如果任务正在运行，先取消
    if (task.status === TaskStatus.RUNNING) {
      console.log(`🛑 Cancelling running task before deletion: ${taskId}`);
      try {
        this.cancelTask(taskId);
      } catch (error) {
        console.error('Error cancelling task before deletion:', error);
        // 即使取消失败，也继续删除
      }
      // 重新读取数据（因为cancelTask已经保存过）
      const updatedData = this.readTasks();
      const updatedIndex = updatedData.tasks.findIndex(t => t.id === taskId);
      if (updatedIndex !== -1) {
        updatedData.tasks.splice(updatedIndex, 1);
        this.saveTasks(updatedData);
      }
    } else {
      // 任务未运行，直接删除
      data.tasks.splice(taskIndex, 1);
      this.saveTasks(data);
    }
    
    console.log(`🗑️ Task deleted: ${taskId}`);
    
    return true;
  }
}

// 导出单例
module.exports = new EmailTaskManager();
