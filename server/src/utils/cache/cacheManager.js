const NodeCache = require('node-cache');

/**
 * 类 Redis 缓存管理器
 * 基于 node-cache 包实现，提供类似 Redis 的功能
 * 用于替代 global.adminTokens 的实现
 */
class CacheManager {
  constructor() {
    // 初始化不同用途的缓存实例
    this.adminTokenCache = new NodeCache({
      stdTTL: 300, // 默认5分钟过期 (300秒)
      checkperiod: 60, // 每60秒检查一次过期项
      useClones: false, // 不克隆对象，提高性能
      deleteOnExpire: true, // 过期时自动删除
      maxKeys: 1000 // 最大缓存1000个token
    });

    // 密码重置缓存实例
    this.passwordResetCache = new NodeCache({
      stdTTL: 900, // 默认15分钟过期 (900秒)
      checkperiod: 120, // 每2分钟检查一次过期项
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 500 // 最大缓存500个重置请求
    });

    // 通用缓存实例（可用于其他用途）
    this.generalCache = new NodeCache({
      stdTTL: 600, // 默认10分钟过期
      checkperiod: 120, // 每2分钟检查一次过期项
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 5000
    });

    // 监听事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // Admin Token 缓存事件
    this.adminTokenCache.on('expired', (key, value) => {
      console.log(`[CacheManager] Admin token expired: ${key}`);
    });

    this.adminTokenCache.on('del', (key, value) => {
      console.log(`[CacheManager] Admin token deleted: ${key}`);
    });

    // 密码重置缓存事件
    this.passwordResetCache.on('expired', (key, value) => {
      console.log(`[CacheManager] Password reset token expired: ${key}`);
    });

    this.passwordResetCache.on('del', (key, value) => {
      console.log(`[CacheManager] Password reset token deleted: ${key}`);
    });

    // 通用缓存事件
    this.generalCache.on('expired', (key, value) => {
      console.log(`[CacheManager] General cache expired: ${key}`);
    });
  }

  // ========== Admin Token 相关方法 ==========

  /**
   * 设置 admin token
   * @param {string} token - Token 字符串
   * @param {object} data - Token 数据
   * @param {number} ttl - 过期时间（秒），不传则使用默认值
   */
  setAdminToken(token, data, ttl = null) {
    try {
      const success = ttl ? 
        this.adminTokenCache.set(token, data, ttl) : 
        this.adminTokenCache.set(token, data);
      
      if (success) {
        console.log(`[CacheManager] Admin token set: ${token}, TTL: ${ttl || 'default'}`);
      }
      return success;
    } catch (error) {
      console.error('[CacheManager] Error setting admin token:', error);
      return false;
    }
  }

  /**
   * 获取 admin token
   * @param {string} token - Token 字符串
   * @returns {object|undefined} Token 数据
   */
  getAdminToken(token) {
    try {
      const data = this.adminTokenCache.get(token);
      if (data) {
        console.log(`[CacheManager] Admin token retrieved: ${token}`);
      }
      return data;
    } catch (error) {
      console.error('[CacheManager] Error getting admin token:', error);
      return undefined;
    }
  }

  /**
   * 删除 admin token
   * @param {string} token - Token 字符串
   * @returns {number} 删除的数量
   */
  deleteAdminToken(token) {
    try {
      const count = this.adminTokenCache.del(token);
      if (count > 0) {
        console.log(`[CacheManager] Admin token deleted: ${token}`);
      }
      return count;
    } catch (error) {
      console.error('[CacheManager] Error deleting admin token:', error);
      return 0;
    }
  }

  /**
   * 检查 admin token 是否存在
   * @param {string} token - Token 字符串
   * @returns {boolean}
   */
  hasAdminToken(token) {
    try {
      return this.adminTokenCache.has(token);
    } catch (error) {
      console.error('[CacheManager] Error checking admin token:', error);
      return false;
    }
  }

  /**
   * 获取所有 admin token 的键
   * @returns {string[]}
   */
  getAdminTokenKeys() {
    try {
      return this.adminTokenCache.keys();
    } catch (error) {
      console.error('[CacheManager] Error getting admin token keys:', error);
      return [];
    }
  }

  /**
   * 清空所有 admin token
   */
  clearAdminTokens() {
    try {
      this.adminTokenCache.flushAll();
      console.log('[CacheManager] All admin tokens cleared');
    } catch (error) {
      console.error('[CacheManager] Error clearing admin tokens:', error);
    }
  }

  /**
   * 获取 admin token 统计信息
   * @returns {object}
   */
  getAdminTokenStats() {
    try {
      return this.adminTokenCache.getStats();
    } catch (error) {
      console.error('[CacheManager] Error getting admin token stats:', error);
      return {};
    }
  }

  // ========== 密码重置相关方法 ==========

  /**
   * 设置密码重置 token
   * @param {string} email - 用户邮箱作为键
   * @param {object} data - 重置数据 { token, expires, userId, username }
   * @param {number} ttl - 过期时间（秒），不传则使用默认值15分钟
   */
  setPasswordResetToken(email, data, ttl = null) {
    try {
      const key = `password_reset:${email.toLowerCase()}`;
      const success = ttl ? 
        this.passwordResetCache.set(key, data, ttl) : 
        this.passwordResetCache.set(key, data);
      
      if (success) {
        console.log(`[CacheManager] Password reset token set for: ${email}, TTL: ${ttl || 'default'}`);
      }
      return success;
    } catch (error) {
      console.error('[CacheManager] Error setting password reset token:', error);
      return false;
    }
  }

  /**
   * 根据邮箱获取密码重置 token
   * @param {string} email - 用户邮箱
   * @returns {object|undefined} 重置数据
   */
  getPasswordResetToken(email) {
    try {
      const key = `password_reset:${email.toLowerCase()}`;
      const data = this.passwordResetCache.get(key);
      if (data) {
        console.log(`[CacheManager] Password reset token retrieved for: ${email}`);
      }
      return data;
    } catch (error) {
      console.error('[CacheManager] Error getting password reset token:', error);
      return undefined;
    }
  }

  /**
   * 根据 token 查找密码重置数据
   * @param {string} token - 重置 token
   * @returns {object|undefined} 重置数据，包含邮箱信息
   */
  findPasswordResetByToken(token) {
    try {
      const keys = this.passwordResetCache.keys();
      for (const key of keys) {
        const data = this.passwordResetCache.get(key);
        if (data && data.token === token) {
          const email = key.replace('password_reset:', '');
          console.log(`[CacheManager] Password reset token found for: ${email}`);
          return { ...data, email };
        }
      }
      return undefined;
    } catch (error) {
      console.error('[CacheManager] Error finding password reset token:', error);
      return undefined;
    }
  }

  /**
   * 验证密码重置 token（根据邮箱和token）
   * @param {string} email - 用户邮箱
   * @param {string} token - 重置 token
   * @returns {object|null} 验证成功返回数据，失败返回null
   */
  validatePasswordResetToken(email, token) {
    try {
      const data = this.getPasswordResetToken(email);
      if (data && data.token === token && data.expires > Date.now()) {
        console.log(`[CacheManager] Password reset token validated for: ${email}`);
        return data;
      }
      return null;
    } catch (error) {
      console.error('[CacheManager] Error validating password reset token:', error);
      return null;
    }
  }

  /**
   * 删除密码重置 token
   * @param {string} email - 用户邮箱
   * @returns {number} 删除的数量
   */
  deletePasswordResetToken(email) {
    try {
      const key = `password_reset:${email.toLowerCase()}`;
      const count = this.passwordResetCache.del(key);
      if (count > 0) {
        console.log(`[CacheManager] Password reset token deleted for: ${email}`);
      }
      return count;
    } catch (error) {
      console.error('[CacheManager] Error deleting password reset token:', error);
      return 0;
    }
  }

  /**
   * 检查密码重置 token 是否存在
   * @param {string} email - 用户邮箱
   * @returns {boolean}
   */
  hasPasswordResetToken(email) {
    try {
      const key = `password_reset:${email.toLowerCase()}`;
      return this.passwordResetCache.has(key);
    } catch (error) {
      console.error('[CacheManager] Error checking password reset token:', error);
      return false;
    }
  }

  /**
   * 获取所有密码重置 token 的键
   * @returns {string[]} 邮箱列表
   */
  getPasswordResetTokenKeys() {
    try {
      const keys = this.passwordResetCache.keys();
      return keys.map(key => key.replace('password_reset:', ''));
    } catch (error) {
      console.error('[CacheManager] Error getting password reset token keys:', error);
      return [];
    }
  }

  /**
   * 清空所有密码重置 token
   */
  clearPasswordResetTokens() {
    try {
      this.passwordResetCache.flushAll();
      console.log('[CacheManager] All password reset tokens cleared');
    } catch (error) {
      console.error('[CacheManager] Error clearing password reset tokens:', error);
    }
  }

  /**
   * 获取密码重置 token 统计信息
   * @returns {object}
   */
  getPasswordResetStats() {
    try {
      return this.passwordResetCache.getStats();
    } catch (error) {
      console.error('[CacheManager] Error getting password reset stats:', error);
      return {};
    }
  }

  // ========== 通用缓存方法 ==========

  /**
   * 设置通用缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   */
  set(key, value, ttl = null) {
    try {
      const success = ttl ? 
        this.generalCache.set(key, value, ttl) : 
        this.generalCache.set(key, value);
      
      if (success) {
        console.log(`[CacheManager] Cache set: ${key}, TTL: ${ttl || 'default'}`);
      }
      return success;
    } catch (error) {
      console.error('[CacheManager] Error setting cache:', error);
      return false;
    }
  }

  /**
   * 获取通用缓存
   * @param {string} key - 缓存键
   * @returns {any}
   */
  get(key) {
    try {
      return this.generalCache.get(key);
    } catch (error) {
      console.error('[CacheManager] Error getting cache:', error);
      return undefined;
    }
  }

  /**
   * 删除通用缓存
   * @param {string} key - 缓存键
   * @returns {number}
   */
  delete(key) {
    try {
      return this.generalCache.del(key);
    } catch (error) {
      console.error('[CacheManager] Error deleting cache:', error);
      return 0;
    }
  }

  /**
   * 检查通用缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    try {
      return this.generalCache.has(key);
    } catch (error) {
      console.error('[CacheManager] Error checking cache:', error);
      return false;
    }
  }

  /**
   * 获取 token 的剩余过期时间
   * @param {string} key - Token 字符串
   * @param {'admin'|'general'|'password_reset'} type - 缓存类型
   * @returns {number} 剩余秒数，-1表示永不过期，undefined表示不存在
   */
  getTtl(key, type = 'general') {
    try {
      let cache;
      switch (type) {
        case 'admin':
          cache = this.adminTokenCache;
          break;
        case 'password_reset':
          cache = this.passwordResetCache;
          key = key.includes('password_reset:') ? key : `password_reset:${key.toLowerCase()}`;
          break;
        default:
          cache = this.generalCache;
      }
      return cache.getTtl(key);
    } catch (error) {
      console.error('[CacheManager] Error getting TTL:', error);
      return undefined;
    }
  }

  /**
   * 更新 TTL
   * @param {string} key - 缓存键
   * @param {number} ttl - 新的过期时间（秒）
   * @param {'admin'|'general'|'password_reset'} type - 缓存类型
   * @returns {boolean}
   */
  updateTtl(key, ttl, type = 'general') {
    try {
      let cache;
      switch (type) {
        case 'admin':
          cache = this.adminTokenCache;
          break;
        case 'password_reset':
          cache = this.passwordResetCache;
          key = key.includes('password_reset:') ? key : `password_reset:${key.toLowerCase()}`;
          break;
        default:
          cache = this.generalCache;
      }
      return cache.ttl(key, ttl);
    } catch (error) {
      console.error('[CacheManager] Error updating TTL:', error);
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  clearAll() {
    try {
      this.adminTokenCache.flushAll();
      this.passwordResetCache.flushAll();
      this.generalCache.flushAll();
      console.log('[CacheManager] All caches cleared');
    } catch (error) {
      console.error('[CacheManager] Error clearing all caches:', error);
    }
  }

  /**
   * 获取所有统计信息
   * @returns {object}
   */
  getAllStats() {
    try {
      return {
        adminTokens: this.adminTokenCache.getStats(),
        passwordReset: this.passwordResetCache.getStats(),
        general: this.generalCache.getStats()
      };
    } catch (error) {
      console.error('[CacheManager] Error getting stats:', error);
      return {};
    }
  }

  /**
   * 关闭缓存管理器
   */
  close() {
    try {
      this.adminTokenCache.close();
      this.passwordResetCache.close();
      this.generalCache.close();
      console.log('[CacheManager] Cache manager closed');
    } catch (error) {
      console.error('[CacheManager] Error closing cache manager:', error);
    }
  }
}

// 创建单例实例
const cacheManager = new CacheManager();

module.exports = cacheManager;
