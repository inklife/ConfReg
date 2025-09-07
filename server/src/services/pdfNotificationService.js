const EventEmitter = require('events');

class PDFNotificationService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map(); // userId -> Set of response objects
  }

  // 添加客户端连接
  addClient(userId, res, connectionId = 'unknown') {
    console.log(`📡 新的SSE连接请求 - 用户ID: ${userId}, 连接ID: ${connectionId}`);
    
    // 初始化用户连接集合（如果不存在）
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    
    // 给响应对象添加连接ID标识
    res.connectionId = connectionId;
    
    // 直接添加新连接，不清理旧连接（支持多标签页）
    this.clients.get(userId).add(res);
    
    console.log(`📡 客户端连接 - 用户ID: ${userId}, 连接ID: ${connectionId}, 当前连接数: ${this.clients.get(userId).size}, 总连接数: ${this.getTotalConnections()}`);
    
    // 设置心跳，保持连接活跃
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
      } catch (error) {
        console.log(`💔 心跳失败，移除客户端 - 用户ID: ${userId}, 连接ID: ${connectionId}`);
        this.removeClient(userId, res);
        clearInterval(heartbeat);
      }
    }, 30000); // 30秒心跳

    // 存储心跳间隔ID到响应对象上，以便清理
    res.heartbeatInterval = heartbeat;
  }

  // 移除客户端连接
  removeClient(userId, res) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(res);
      
      const connectionId = res.connectionId || 'unknown';
      
      // 清理心跳间隔
      if (res.heartbeatInterval) {
        clearInterval(res.heartbeatInterval);
        delete res.heartbeatInterval;
      }
      
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
      
      console.log(`🔌 客户端断开 - 用户ID: ${userId}, 连接ID: ${connectionId}, 剩余连接数: ${this.clients.has(userId) ? this.clients.get(userId).size : 0}, 总连接数: ${this.getTotalConnections()}`);
    }
  }

  // 获取总连接数
  getTotalConnections() {
    let total = 0;
    for (const connections of this.clients.values()) {
      total += connections.size;
    }
    return total;
  }

  // 向特定用户发送PDF状态更新
  notifyPDFStatus(userId, taskData) {
    if (!this.clients.has(userId)) {
      console.log(`📡 用户 ${userId} 没有活跃连接，跳过通知`);
      return;
    }

    const clients = this.clients.get(userId);
    const message = {
      type: 'pdf_status',
      taskId: taskData.id,
      status: taskData.status,
      progress: taskData.progress,
      error: taskData.error,
      timestamp: Date.now()
    };

    const data = JSON.stringify(message);
    const sseMessage = `event: pdf_status\ndata: ${data}\n\n`;

    console.log(`📡 向用户 ${userId} 发送PDF状态通知:`, message);

    // 向所有该用户的连接发送消息
    for (const res of clients) {
      try {
        res.write(sseMessage);
      } catch (error) {
        console.error('发送SSE消息失败:', error);
        this.removeClient(userId, res);
      }
    }
  }

  // 向特定用户发送PDF完成通知
  notifyPDFCompleted(userId, taskData) {
    if (!this.clients.has(userId)) {
      console.log(`📡 用户 ${userId} 没有活跃连接，跳过完成通知`);
      return;
    }

    const clients = this.clients.get(userId);
    const message = {
      type: 'pdf_completed',
      taskId: taskData.id,
      documentType: taskData.type,
      downloadUrl: `/api/submissions/download_pdf/${taskData.id}`,
      timestamp: Date.now()
    };

    const data = JSON.stringify(message);
    const sseMessage = `event: pdf_completed\ndata: ${data}\n\n`;

    console.log(`📡 向用户 ${userId} 发送PDF完成通知:`, message);

    // 向所有该用户的连接发送消息
    for (const res of clients) {
      try {
        res.write(sseMessage);
      } catch (error) {
        console.error('发送SSE消息失败:', error);
        this.removeClient(userId, res);
      }
    }
  }

  // 向特定用户发送PDF下载完成通知
  notifyPDFDownloaded(userId, taskData) {
    if (!this.clients.has(userId)) {
      console.log(`📡 用户 ${userId} 没有活跃连接，跳过下载通知`);
      return;
    }

    const clients = this.clients.get(userId);
    const message = {
      type: 'pdf_downloaded',
      taskId: taskData.id,
      documentType: taskData.type,
      timestamp: Date.now()
    };

    const data = JSON.stringify(message);
    const sseMessage = `event: pdf_downloaded\ndata: ${data}\n\n`;

    console.log(`📡 向用户 ${userId} 发送PDF下载完成通知:`, message);

    // 向所有该用户的连接发送消息
    for (const res of clients) {
      try {
        res.write(sseMessage);
      } catch (error) {
        console.error('发送SSE消息失败:', error);
        this.removeClient(userId, res);
      }
    }
  }

  // 获取连接统计
  getStats() {
    const stats = {
      totalUsers: this.clients.size,
      totalConnections: 0,
      userConnections: {}
    };

    for (const [userId, connections] of this.clients) {
      const count = connections.size;
      stats.totalConnections += count;
      stats.userConnections[userId] = count;
    }

    return stats;
  }
}

// 创建单例实例
const pdfNotificationService = new PDFNotificationService();

module.exports = pdfNotificationService;
