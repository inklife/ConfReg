/**
 * ICPADS 2025 加密配置文件
 * 统一管理密码哈希和其他加密相关的配置
 */

/**
 * 获取 bcrypt salt rounds 配置
 * @returns {number} salt rounds 数值
 */
const getSaltRounds = () => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);
  
  // 验证 salt rounds 是否在合理范围内
  if (isNaN(saltRounds) || saltRounds < 4 || saltRounds > 20) {
    console.warn('⚠️ BCRYPT_SALT_ROUNDS is not set or invalid, using default value: 10');
    return 10;
  }
  
  return saltRounds;
};

/**
 * 获取会话密钥
 * @returns {string} 会话密钥
 */
const getSessionSecret = () => {
  return process.env.SESSION_SECRET || 'default-session-secret';
};

module.exports = {
  getSaltRounds,
  getSessionSecret,
  
  // 导出常量以便其他模块使用
  SALT_ROUNDS: getSaltRounds(),
  SESSION_SECRET: getSessionSecret()
};
