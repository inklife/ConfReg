/**
 * 模拟登录 Ticket 缓存
 * 用于存储一次性登录票据，实现管理员模拟用户登录功能
 */

class SimulateLoginCache {
  constructor() {
    // 使用 Map 存储 ticket 数据
    // key: ticket (随机生成的字符串)
    // value: { userId, createdAt, used }
    this.cache = new Map();
    
    // 定期清理过期的ticket（每分钟清理一次）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 1分钟
  }

  /**
   * 生成随机 ticket
   * @returns {string} 32位随机字符串
   */
  generateTicket() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 创建一个新的登录 ticket
   * @param {number} userId - 用户ID
   * @returns {string} ticket
   */
  createTicket(userId) {
    const ticket = this.generateTicket();
    this.cache.set(ticket, {
      userId,
      createdAt: Date.now(),
      used: false
    });
    
    console.log(`[SimulateLogin] Created ticket for user ${userId}: ${ticket}`);
    return ticket;
  }

  /**
   * 验证并使用 ticket
   * @param {string} ticket - ticket字符串
   * @param {number} userId - 要验证的用户ID
   * @returns {boolean} 验证是否成功
   */
  validateAndUseTicket(ticket, userId) {
    const data = this.cache.get(ticket);
    
    if (!data) {
      console.log(`[SimulateLogin] Ticket not found: ${ticket}`);
      return false;
    }

    // 检查是否已使用
    if (data.used) {
      console.log(`[SimulateLogin] Ticket already used: ${ticket}`);
      return false;
    }

    // 检查是否过期（1分钟）
    const now = Date.now();
    const expirationTime = 60 * 1000; // 1分钟
    if (now - data.createdAt > expirationTime) {
      console.log(`[SimulateLogin] Ticket expired: ${ticket}`);
      this.cache.delete(ticket);
      return false;
    }

    // 检查 userId 是否匹配
    if (data.userId !== parseInt(userId)) {
      console.log(`[SimulateLogin] User ID mismatch for ticket ${ticket}: expected ${data.userId}, got ${userId}`);
      return false;
    }

    // 标记为已使用
    data.used = true;
    this.cache.set(ticket, data);
    
    console.log(`[SimulateLogin] Ticket validated and used: ${ticket} for user ${userId}`);
    
    // 延迟删除（5秒后删除，避免重复使用）
    setTimeout(() => {
      this.cache.delete(ticket);
      console.log(`[SimulateLogin] Ticket deleted: ${ticket}`);
    }, 5000);
    
    return true;
  }

  /**
   * 清理过期的 ticket
   */
  cleanup() {
    const now = Date.now();
    const expirationTime = 60 * 1000; // 1分钟
    let cleanedCount = 0;

    for (const [ticket, data] of this.cache.entries()) {
      if (now - data.createdAt > expirationTime) {
        this.cache.delete(ticket);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[SimulateLogin] Cleaned up ${cleanedCount} expired tickets`);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    return {
      totalTickets: this.cache.size,
      tickets: Array.from(this.cache.entries()).map(([ticket, data]) => ({
        ticket: ticket.substring(0, 8) + '...', // 只显示前8位
        userId: data.userId,
        createdAt: new Date(data.createdAt).toISOString(),
        used: data.used,
        age: Math.round((Date.now() - data.createdAt) / 1000) + 's'
      }))
    };
  }

  /**
   * 清理所有 ticket
   */
  clear() {
    this.cache.clear();
    console.log('[SimulateLogin] All tickets cleared');
  }

  /**
   * 停止清理定时器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    console.log('[SimulateLogin] Cache destroyed');
  }
}

// 创建单例实例
const simulateLoginCache = new SimulateLoginCache();

// 导出实例
module.exports = simulateLoginCache;
