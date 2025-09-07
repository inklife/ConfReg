/**
 * 用户名验证工具
 * 提供敏感用户名检查、格式验证等功能
 */

/**
 * 敏感/保留用户名列表
 * 这些用户名不允许用户注册或使用
 */
const RESERVED_USERNAMES = [
  // 系统管理员相关
  'admin', 'administrator', 'root', 'superuser', 'super',
  'sysadmin', 'system', 'systemadmin', 'sa', 'sudo',
  
  // 服务账户相关
  'service', 'daemon', 'nobody', 'guest', 'anonymous',
  'user', 'default', 'test', 'demo', 'sample',
  
  // API和系统端点
  'api', 'www', 'ftp', 'mail', 'email', 'smtp', 'pop',
  'imap', 'dns', 'dhcp', 'proxy', 'gateway', 'router',
  
  // 应用程序相关
  'app', 'application', 'server', 'client', 'web',
  'mobile', 'desktop', 'frontend', 'backend',
  
  // 数据库相关
  'database', 'db', 'mysql', 'postgres', 'sqlite',
  'mongodb', 'redis', 'cache',
  
  // 会议系统相关
  'icpads', 'conference', 'submit', 'submission', 'review',
  'reviewer', 'author', 'editor', 'moderator', 'chair',
  'organizer', 'committee', 'program', 'track',
  
  // 常见服务名
  'support', 'help', 'info', 'contact', 'feedback',
  'sales', 'marketing', 'business', 'legal', 'security',
  
  // 技术术语
  'null', 'undefined', 'void', 'delete', 'update',
  'insert', 'select', 'drop', 'create', 'alter',
  
  // 其他保留词
  'about', 'home', 'index', 'main', 'public', 'private',
  'login', 'logout', 'register', 'signup', 'signin',
  'profile', 'settings', 'config', 'configuration',
  'dashboard', 'panel', 'console', 'control',
  
  // 常见的误用词
  'password', 'pass', 'pwd', 'secret', 'token',
  'key', 'auth', 'session', 'cookie'
];

/**
 * 检查用户名是否为敏感/保留用户名
 * @param {string} username - 要检查的用户名
 * @returns {boolean} 如果是敏感用户名返回true
 */
function isReservedUsername(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }
  
  const normalizedUsername = username.toLowerCase().trim();
  
  // 精确匹配
  if (RESERVED_USERNAMES.includes(normalizedUsername)) {
    return true;
  }
  
  // 检查是否以保留词开头（针对 admin1, root123 等变体）
  const reservedPrefixes = ['admin', 'root', 'system', 'super'];
  for (const prefix of reservedPrefixes) {
    if (normalizedUsername.startsWith(prefix)) {
      return true;
    }
  }
  
  // 检查是否包含多个连续的敏感词组合
  const sensitivePatterns = [
    /^(admin|root|system|super).*(admin|root|system|super)$/i,
    /^.*(admin|root|system|super)$/i
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(normalizedUsername)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 验证用户名格式和内容
 * @param {string} username - 要验证的用户名
 * @returns {Object} 验证结果 { isValid: boolean, errors: string[] }
 */
function validateUsername(username) {
  const errors = [];
  
  // 基本格式检查
  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
    return { isValid: false, errors };
  }
  
  const trimmedUsername = username.trim();
  
  // 长度检查
  if (trimmedUsername.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (trimmedUsername.length > 150) {
    errors.push('Username cannot exceed 150 characters');
  }
  
  // 字符检查
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
    errors.push('Username can only contain letters, numbers, underscore, dot and dash');
  }
  
  // 禁止的字符
  if (trimmedUsername.includes(' ')) {
    errors.push('Username cannot contain spaces');
  }
  
  if (trimmedUsername.includes('@')) {
    errors.push('Username cannot contain @ symbol');
  }
  
  // 不能以特殊字符开头或结尾
  if (/^[._-]/.test(trimmedUsername)) {
    errors.push('Username cannot start with dot, underscore or dash');
  }
  
  if (/[._-]$/.test(trimmedUsername)) {
    errors.push('Username cannot end with dot, underscore or dash');
  }
  
  // 不能包含连续的特殊字符
  if (/[._-]{2,}/.test(trimmedUsername)) {
    errors.push('Username cannot contain consecutive special characters');
  }
  
  // 敏感用户名检查
  if (isReservedUsername(trimmedUsername)) {
    errors.push('This username is reserved and cannot be used');
  }
  
  // 不能全是数字
  if (/^\d+$/.test(trimmedUsername)) {
    errors.push('Username cannot consist entirely of numbers');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 获取所有保留用户名列表（用于前端提示）
 * @returns {string[]} 保留用户名数组
 */
function getReservedUsernames() {
  return [...RESERVED_USERNAMES];
}

/**
 * 生成用户名建议（当用户输入的用户名被保留时）
 * @param {string} attemptedUsername - 用户尝试的用户名
 * @returns {string[]} 建议的用户名列表
 */
function generateUsernameSuggestions(attemptedUsername) {
  if (!attemptedUsername || typeof attemptedUsername !== 'string') {
    return [];
  }
  
  const base = attemptedUsername.toLowerCase().trim();
  const suggestions = [];
  
  // 添加数字后缀
  for (let i = 1; i <= 5; i++) {
    const suggestion = `${base}${i}`;
    if (!isReservedUsername(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  // 添加年份后缀
  const currentYear = new Date().getFullYear();
  const yearSuggestion = `${base}${currentYear}`;
  if (!isReservedUsername(yearSuggestion) && !suggestions.includes(yearSuggestion)) {
    suggestions.push(yearSuggestion);
  }
  
  // 添加用户前缀
  const userPrefixSuggestion = `user_${base}`;
  if (!isReservedUsername(userPrefixSuggestion)) {
    suggestions.push(userPrefixSuggestion);
  }
  
  // 添加下划线变体
  const underscoreSuggestion = `${base}_user`;
  if (!isReservedUsername(underscoreSuggestion)) {
    suggestions.push(underscoreSuggestion);
  }
  
  return suggestions.slice(0, 5); // 最多返回5个建议
}

module.exports = {
  isReservedUsername,
  validateUsername,
  getReservedUsernames,
  generateUsernameSuggestions,
  RESERVED_USERNAMES
};
