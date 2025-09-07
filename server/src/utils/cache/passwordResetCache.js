const cacheManager = require('./cacheManager');

/**
 * 密码重置缓存适配器
 * 提供密码重置功能的缓存管理
 */
class PasswordResetCache {
  constructor() {
    this.cache = cacheManager;
  }

  /**
   * 设置密码重置数据
   * @param {string} email - 用户邮箱
   * @param {string} token - 重置 token
   * @param {number} expiresTimestamp - 过期时间戳
   * @param {object} userData - 用户数据 { userId, username, fullname }
   * @param {number} ttlSeconds - 过期时间（秒），默认15分钟
   * @returns {boolean}
   */
  setResetData(email, token, expiresTimestamp, userData = {}, ttlSeconds = 900) {
    const resetData = {
      token,
      expires: expiresTimestamp,
      userId: userData.userId,
      username: userData.username,
      fullname: userData.fullname,
      createdAt: Date.now()
    };
    
    return this.cache.setPasswordResetToken(email, resetData, ttlSeconds);
  }

  /**
   * 根据邮箱获取重置数据
   * @param {string} email - 用户邮箱
   * @returns {object|null}
   */
  getResetData(email) {
    return this.cache.getPasswordResetToken(email);
  }

  /**
   * 根据 token 查找重置数据
   * @param {string} token - 重置 token
   * @returns {object|null}
   */
  findByToken(token) {
    return this.cache.findPasswordResetByToken(token);
  }

  /**
   * 验证重置 token
   * @param {string} email - 用户邮箱（可选）
   * @param {string} token - 重置 token
   * @returns {object|null} 验证成功返回完整数据，失败返回null
   */
  validateToken(email, token) {
    // 如果提供了邮箱，使用邮箱验证
    if (email) {
      return this.cache.validatePasswordResetToken(email, token);
    }
    
    // 否则通过 token 查找
    const data = this.cache.findPasswordResetByToken(token);
    if (data && data.expires > Date.now()) {
      return data;
    }
    
    return null;
  }

  /**
   * 删除重置数据
   * @param {string} email - 用户邮箱
   * @returns {boolean}
   */
  deleteResetData(email) {
    return this.cache.deletePasswordResetToken(email) > 0;
  }

  /**
   * 检查重置数据是否存在
   * @param {string} email - 用户邮箱
   * @returns {boolean}
   */
  hasResetData(email) {
    return this.cache.hasPasswordResetToken(email);
  }

  /**
   * 清理过期的重置数据（手动清理，通常缓存会自动处理）
   */
  cleanupExpired() {
    const emails = this.cache.getPasswordResetTokenKeys();
    let cleanedCount = 0;
    
    emails.forEach(email => {
      const data = this.cache.getPasswordResetToken(email);
      if (data && data.expires <= Date.now()) {
        this.cache.deletePasswordResetToken(email);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`[PasswordResetCache] Manually cleaned ${cleanedCount} expired reset tokens`);
    }
    
    return cleanedCount;
  }

  /**
   * 获取所有重置请求的邮箱列表
   * @returns {string[]}
   */
  getAllEmails() {
    return this.cache.getPasswordResetTokenKeys();
  }

  /**
   * 获取重置缓存统计信息
   * @returns {object}
   */
  getStats() {
    return this.cache.getPasswordResetStats();
  }

  /**
   * 清空所有重置数据
   */
  clearAll() {
    this.cache.clearPasswordResetTokens();
  }

  /**
   * 生成重置 token（6位数字码）
   * @returns {string}
   */
  generateResetCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 生成重置 token（32位随机字符串）
   * @returns {string}
   */
  generateResetToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 获取默认过期时间戳（15分钟后）
   * @returns {number}
   */
  getDefaultExpireTime() {
    return Date.now() + (15 * 60 * 1000); // 15分钟
  }

  /**
   * 批量设置重置数据（用于迁移）
   * @param {Array} resetDataArray - 重置数据数组
   * @returns {number} 成功设置的数量
   */
  batchSetResetData(resetDataArray) {
    let successCount = 0;
    
    resetDataArray.forEach(item => {
      const { email, token, expires, userData, ttl } = item;
      if (this.setResetData(email, token, expires, userData, ttl)) {
        successCount++;
      }
    });
    
    console.log(`[PasswordResetCache] Batch set ${successCount}/${resetDataArray.length} reset data`);
    return successCount;
  }
}

// 创建单例实例
const passwordResetCache = new PasswordResetCache();

module.exports = passwordResetCache;
