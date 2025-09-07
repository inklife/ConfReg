const cacheManager = require('./cacheManager');

/**
 * AdminTokens 兼容性适配器
 * 提供与原 global.adminTokens (Map) 相同的 API 接口
 * 内部使用 CacheManager 实现
 */
class AdminTokensAdapter {
  constructor() {
    this.cache = cacheManager;
  }

  /**
   * 设置 token（兼容 Map.set）
   * @param {string} key - Token 字符串
   * @param {any} value - Token 数据
   * @returns {AdminTokensAdapter} 返回自身以支持链式调用
   */
  set(key, value) {
    this.cache.setAdminToken(key, value);
    return this;
  }

  /**
   * 获取 token（兼容 Map.get）
   * @param {string} key - Token 字符串
   * @returns {any} Token 数据
   */
  get(key) {
    return this.cache.getAdminToken(key);
  }

  /**
   * 删除 token（兼容 Map.delete）
   * @param {string} key - Token 字符串
   * @returns {boolean} 是否删除成功
   */
  delete(key) {
    return this.cache.deleteAdminToken(key) > 0;
  }

  /**
   * 检查 token 是否存在（兼容 Map.has）
   * @param {string} key - Token 字符串
   * @returns {boolean}
   */
  has(key) {
    return this.cache.hasAdminToken(key);
  }

  /**
   * 清空所有 token（兼容 Map.clear）
   */
  clear() {
    this.cache.clearAdminTokens();
  }

  /**
   * 获取 token 数量（兼容 Map.size）
   * @returns {number}
   */
  get size() {
    return this.cache.getAdminTokenKeys().length;
  }

  /**
   * 获取所有 token 键（兼容 Map.keys）
   * @returns {string[]}
   */
  keys() {
    return this.cache.getAdminTokenKeys();
  }

  /**
   * 获取所有 token 值（兼容 Map.values）
   * @returns {any[]}
   */
  values() {
    const keys = this.cache.getAdminTokenKeys();
    return keys.map(key => this.cache.getAdminToken(key)).filter(value => value !== undefined);
  }

  /**
   * 获取所有 token 条目（兼容 Map.entries）
   * @returns {Array<[string, any]>}
   */
  entries() {
    const keys = this.cache.getAdminTokenKeys();
    return keys.map(key => {
      const value = this.cache.getAdminToken(key);
      return value !== undefined ? [key, value] : null;
    }).filter(entry => entry !== null);
  }

  /**
   * 遍历所有 token（兼容 Map.forEach）
   * @param {function} callback - 回调函数
   * @param {any} thisArg - this 上下文
   */
  forEach(callback, thisArg) {
    const entries = this.entries();
    entries.forEach(([key, value]) => {
      callback.call(thisArg, value, key, this);
    });
  }

  /**
   * 支持 for...of 循环（兼容 Map[Symbol.iterator]）
   */
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }

  // ========== 扩展方法（非 Map 标准方法） ==========

  /**
   * 设置带过期时间的 token
   * @param {string} key - Token 字符串
   * @param {any} value - Token 数据
   * @param {number} ttlSeconds - 过期时间（秒）
   * @returns {AdminTokensAdapter}
   */
  setWithTTL(key, value, ttlSeconds) {
    this.cache.setAdminToken(key, value, ttlSeconds);
    return this;
  }

  /**
   * 获取 token 的剩余过期时间
   * @param {string} key - Token 字符串
   * @returns {number} 剩余秒数
   */
  getTTL(key) {
    return this.cache.getTtl(key, 'admin');
  }

  /**
   * 更新 token 的过期时间
   * @param {string} key - Token 字符串
   * @param {number} ttlSeconds - 新的过期时间（秒）
   * @returns {boolean}
   */
  updateTTL(key, ttlSeconds) {
    return this.cache.updateTtl(key, ttlSeconds, 'admin');
  }

  /**
   * 获取统计信息
   * @returns {object}
   */
  getStats() {
    return this.cache.getAdminTokenStats();
  }
}

// 创建单例实例
const adminTokens = new AdminTokensAdapter();

module.exports = adminTokens;
