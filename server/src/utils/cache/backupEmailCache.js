const cacheManager = require('./cacheManager');

/**
 * 备用邮箱验证缓存管理器
 * 用于管理备用邮箱验证的token和过期时间
 */
class BackupEmailCache {
  constructor() {
    this.cache = cacheManager.generalCache;
    this.TTL = 30 * 60; // 30分钟过期
  }

  /**
   * 生成缓存键
   * @param {string} email - 邮箱地址
   * @returns {string}
   */
  _generateKey(email) {
    return `backup_email_verification:${email.toLowerCase()}`;
  }

  /**
   * 存储备用邮箱验证token
   * @param {string} email - 备用邮箱地址
   * @param {string} token - 验证token
   * @param {number} customTtl - 自定义过期时间（秒），默认30分钟
   * @returns {boolean}
   */
  setVerificationToken(email, token, customTtl = null) {
    try {
      const key = this._generateKey(email);
      const data = {
        token,
        email,
        created: Date.now(),
        expires: Date.now() + ((customTtl || this.TTL) * 1000)
      };
      
      const ttl = customTtl || this.TTL;
      const success = this.cache.set(key, data, ttl);
      
      if (success) {
        console.log(`[BackupEmailCache] Verification token set for: ${email}, expires in ${ttl} seconds`);
      }
      return success;
    } catch (error) {
      console.error('[BackupEmailCache] Error setting verification token:', error);
      return false;
    }
  }

  /**
   * 根据邮箱获取验证token数据
   * @param {string} email - 备用邮箱地址
   * @returns {object|null}
   */
  getVerificationToken(email) {
    try {
      const key = this._generateKey(email);
      const data = this.cache.get(key);
      
      if (data) {
        // 检查是否过期
        if (Date.now() > data.expires) {
          this.deleteVerificationToken(email);
          console.log(`[BackupEmailCache] Verification token expired for: ${email}`);
          return null;
        }
        console.log(`[BackupEmailCache] Verification token retrieved for: ${email}`);
        return data;
      }
      return null;
    } catch (error) {
      console.error('[BackupEmailCache] Error getting verification token:', error);
      return null;
    }
  }

  /**
   * 根据token查找验证数据
   * @param {string} token - 验证token
   * @returns {object|null}
   */
  findByToken(token) {
    try {
      const keys = this.cache.keys();
      const backupEmailKeys = keys.filter(key => key.startsWith('backup_email_verification:'));
      
      for (const key of backupEmailKeys) {
        const data = this.cache.get(key);
        if (data && data.token === token) {
          // 检查是否过期
          if (Date.now() > data.expires) {
            this.cache.del(key);
            console.log(`[BackupEmailCache] Token expired during lookup: ${token}`);
            continue;
          }
          console.log(`[BackupEmailCache] Token found for email: ${data.email}`);
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('[BackupEmailCache] Error finding token:', error);
      return null;
    }
  }

  /**
   * 验证token是否有效
   * @param {string} email - 备用邮箱地址
   * @param {string} token - 验证token
   * @returns {boolean}
   */
  validateToken(email, token) {
    try {
      const data = this.getVerificationToken(email);
      if (data && data.token === token && Date.now() <= data.expires) {
        console.log(`[BackupEmailCache] Token validated for: ${email}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[BackupEmailCache] Error validating token:', error);
      return false;
    }
  }

  /**
   * 删除验证token
   * @param {string} email - 备用邮箱地址
   * @returns {boolean}
   */
  deleteVerificationToken(email) {
    try {
      const key = this._generateKey(email);
      const count = this.cache.del(key);
      if (count > 0) {
        console.log(`[BackupEmailCache] Verification token deleted for: ${email}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[BackupEmailCache] Error deleting verification token:', error);
      return false;
    }
  }

  /**
   * 检查验证token是否存在
   * @param {string} email - 备用邮箱地址
   * @returns {boolean}
   */
  hasVerificationToken(email) {
    try {
      const key = this._generateKey(email);
      return this.cache.has(key);
    } catch (error) {
      console.error('[BackupEmailCache] Error checking verification token:', error);
      return false;
    }
  }

  /**
   * 获取token的剩余过期时间
   * @param {string} email - 备用邮箱地址
   * @returns {number|null} 剩余毫秒数，null表示不存在或已过期
   */
  getTokenTtl(email) {
    try {
      const data = this.getVerificationToken(email);
      if (data) {
        const remaining = data.expires - Date.now();
        return remaining > 0 ? remaining : null;
      }
      return null;
    } catch (error) {
      console.error('[BackupEmailCache] Error getting token TTL:', error);
      return null;
    }
  }

  /**
   * 获取所有备用邮箱验证记录
   * @returns {array}
   */
  getAllVerificationTokens() {
    try {
      const keys = this.cache.keys();
      const backupEmailKeys = keys.filter(key => key.startsWith('backup_email_verification:'));
      const tokens = [];
      
      for (const key of backupEmailKeys) {
        const data = this.cache.get(key);
        if (data) {
          // 检查是否过期
          if (Date.now() > data.expires) {
            this.cache.del(key);
            continue;
          }
          tokens.push({
            email: data.email,
            token: data.token,
            created: data.created,
            expires: data.expires,
            remainingMs: data.expires - Date.now()
          });
        }
      }
      
      return tokens;
    } catch (error) {
      console.error('[BackupEmailCache] Error getting all verification tokens:', error);
      return [];
    }
  }

  /**
   * 清空所有备用邮箱验证token
   * @returns {number} 删除的数量
   */
  clearAllVerificationTokens() {
    try {
      const keys = this.cache.keys();
      const backupEmailKeys = keys.filter(key => key.startsWith('backup_email_verification:'));
      let deletedCount = 0;
      
      for (const key of backupEmailKeys) {
        if (this.cache.del(key) > 0) {
          deletedCount++;
        }
      }
      
      console.log(`[BackupEmailCache] Cleared ${deletedCount} verification tokens`);
      return deletedCount;
    } catch (error) {
      console.error('[BackupEmailCache] Error clearing verification tokens:', error);
      return 0;
    }
  }

  /**
   * 清理过期的验证token
   * @returns {number} 清理的数量
   */
  cleanupExpiredTokens() {
    try {
      const keys = this.cache.keys();
      const backupEmailKeys = keys.filter(key => key.startsWith('backup_email_verification:'));
      let cleanedCount = 0;
      
      for (const key of backupEmailKeys) {
        const data = this.cache.get(key);
        if (data && Date.now() > data.expires) {
          if (this.cache.del(key) > 0) {
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`[BackupEmailCache] Cleaned up ${cleanedCount} expired verification tokens`);
      }
      return cleanedCount;
    } catch (error) {
      console.error('[BackupEmailCache] Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * 获取统计信息
   * @returns {object}
   */
  getStats() {
    try {
      const allTokens = this.getAllVerificationTokens();
      return {
        total: allTokens.length,
        tokensInfo: allTokens.map(token => ({
          email: token.email,
          created: new Date(token.created).toISOString(),
          expires: new Date(token.expires).toISOString(),
          remainingMinutes: Math.ceil(token.remainingMs / (1000 * 60))
        }))
      };
    } catch (error) {
      console.error('[BackupEmailCache] Error getting stats:', error);
      return { total: 0, tokensInfo: [] };
    }
  }
}

// 创建单例实例
const backupEmailCache = new BackupEmailCache();

module.exports = backupEmailCache;
