const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const CONFIG_FILE_PATH = path.join(__dirname, '../../database/config.json');

/**
 * GET /api/config
 * 获取系统配置（包括价格和服务器时间）
 * 公开访问，无需认证
 */
router.get('/', async (req, res) => {
  try {
    // 读取配置文件
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    // 添加服务器时间信息
    const serverTime = new Date();
    const earlyBirdDeadline = new Date(config.deadlines.earlyBirdDeadline);
    const isEarlyBird = serverTime < earlyBirdDeadline;
    
    // 返回配置和服务器时间
    res.json({
      success: true,
      data: {
        ...config,
        serverTime: {
          current: serverTime.toISOString(),
          timezone: 'Asia/Shanghai',
          isEarlyBird: isEarlyBird,
          daysUntilDeadline: isEarlyBird ? Math.ceil((earlyBirdDeadline - serverTime) / (1000 * 60 * 60 * 24)) : 0
        }
      }
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
 * GET /api/config/announcement
 * 获取公告信息
 * 公开访问，无需认证
 */
router.get('/announcement', async (req, res) => {
  try {
    // 读取配置文件
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    // 提取公告信息
    const announcement = config.announcement || { enabled: false, message: '' };
    
    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error reading announcement config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read announcement',
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
