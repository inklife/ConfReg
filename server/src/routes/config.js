const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { emailConfig } = require('../config/email');

const CONFIG_FILE_PATH = path.join(__dirname, '../../database/config.json');

// 会议名称（从配置中读取）
const CONFERENCE_NAME = emailConfig.conference.name;
const CONFERENCE_NAME_SHORT = emailConfig.conference.nameShort;

// 公开配置的白名单（只有这些键可以通过 :key 参数访问）
const PUBLIC_CONFIG_KEYS = [
  'announcement',
  'registrationFees',
  'deadlines',
  'paymentMethods',
  'mealOptions',
  'conferenceInfo'
];

/**
 * 验证配置键的安全性
 * 防止原型污染和路径遍历攻击
 */
function isValidConfigKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // 防止原型污染
  if (['__proto__', 'constructor', 'prototype'].includes(key.toLowerCase())) {
    return false;
  }
  
  // 防止路径遍历
  if (key.includes('..') || key.includes('/') || key.includes('\\')) {
    return false;
  }
  
  // 只允许字母、数字、下划线和连字符
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return false;
  }
  
  // 检查是否在白名单中
  return PUBLIC_CONFIG_KEYS.includes(key);
}

/**
 * 读取并增强配置数据
 */
async function getEnhancedConfig() {
  const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
  const config = JSON.parse(configData);
  
  // 添加服务器时间信息
  const serverTime = new Date();
  const earlyBirdDeadline = new Date(config.deadlines?.earlyBirdDeadline || serverTime);
  const isEarlyBird = serverTime < earlyBirdDeadline;
  
  return {
    ...config,
    conference: {
      name: CONFERENCE_NAME,
      nameShort: CONFERENCE_NAME_SHORT
    },
    serverTime: {
      current: serverTime.toISOString(),
      timezone: 'Asia/Shanghai',
      isEarlyBird: isEarlyBird,
      daysUntilDeadline: isEarlyBird ? Math.ceil((earlyBirdDeadline - serverTime) / (1000 * 60 * 60 * 24)) : 0
    }
  };
}

/**
 * GET /api/config
 * 获取完整的系统配置（包括价格、会议名称和服务器时间）
 * 公开访问，无需认证
 */
router.get('/', async (req, res) => {
  try {
    const enhancedConfig = await getEnhancedConfig();
    
    res.json({
      success: true,
      data: enhancedConfig
    });
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read configuration',
      error: error.message
    });
  }
});

/**
 * GET /api/config/:key
 * 获取配置的特定子键
 * 公开访问，无需认证
 * 示例: /api/config/announcement, /api/config/registrationFees
 * 
 * 注意：此路由必须放在 /admin 之前，因为 Express 按定义顺序匹配路由
 * 但 /admin 使用中间件区分，所以实际上 /admin 会被特殊处理
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // 验证 key 的安全性
    if (!isValidConfigKey(key)) {
      return res.status(400).json({
        success: false,
        message: `Invalid configuration key: ${key}`,
        availableKeys: PUBLIC_CONFIG_KEYS
      });
    }
    
    // 读取配置
    const enhancedConfig = await getEnhancedConfig();
    
    // 获取指定的子配置
    const subConfig = enhancedConfig[key];
    
    if (subConfig === undefined) {
      return res.status(404).json({
        success: false,
        message: `Configuration key not found: ${key}`,
        availableKeys: PUBLIC_CONFIG_KEYS
      });
    }
    
    res.json({
      success: true,
      key: key,
      data: subConfig
    });
  } catch (error) {
    console.error(`Error reading config key [${req.params.key}]:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to read configuration',
      error: error.message
    });
  }
});

/**
 * GET /api/config/admin
 * 获取完整配置（用于管理后台编辑）
 * 需要管理员权限
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    // requireAdmin 中间件已经验证了管理员权限
    
    // 读取配置文件
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error reading config for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read configuration',
      error: error.message
    });
  }
});

/**
 * PUT /api/config/admin
 * 更新配置
 * 需要管理员权限
 */
router.put('/admin', requireAdmin, async (req, res) => {
  try {
    // requireAdmin 中间件已经验证了管理员权限
    
    const newConfig = req.body;
    
    // 验证配置格式
    if (!newConfig.registrationFees || !newConfig.deadlines) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration format. Must include registrationFees and deadlines.'
      });
    }
    
    // 验证 early bird deadline 格式
    try {
      new Date(newConfig.deadlines.earlyBirdDeadline);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid earlyBirdDeadline format. Must be a valid ISO 8601 date string.'
      });
    }
    
    // 备份当前配置到专门的备份文件夹
    const backupDir = path.join(__dirname, '../../database/backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(backupDir, `config.backup.${timestamp}.json`);
    
    try {
      // 确保备份目录存在
      await fs.mkdir(backupDir, { recursive: true });
      
      // 读取并备份当前配置
      const currentConfig = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
      await fs.writeFile(backupPath, currentConfig, 'utf8');
      console.log('Configuration backup created:', backupPath);
    } catch (error) {
      console.error('Warning: Failed to create backup:', error);
    }
    
    // 保存新配置
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: newConfig
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message
    });
  }
});

module.exports = router;
