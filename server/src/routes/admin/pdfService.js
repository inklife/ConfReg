const express = require('express');
const { getPDFWorkerPoolStats, getHealthStatus } = require('../../services/pdfService');
const { requireAdmin } = require('../../middleware/auth');

const router = express.Router();

/**
 * 获取PDF服务健康状态
 * GET /api/admin/pdf-service/health
 */
router.get('/health', requireAdmin, (req, res) => {
  try {
    const healthStatus = getHealthStatus();
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('获取PDF服务健康状态失败:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get PDF service health status',
      error: error.message
    });
  }
});

/**
 * 获取PDF工作池详细统计
 * GET /api/admin/pdf-service/stats
 */
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const stats = getPDFWorkerPoolStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取PDF工作池统计失败:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get PDF worker pool stats',
      error: error.message
    });
  }
});

/**
 * 获取系统资源使用情况
 * GET /api/admin/pdf-service/resources
 */
router.get('/resources', requireAdmin, (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    res.json({
      success: true,
      data: {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers,
          // 格式化显示
          formatted: {
            rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
          }
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      }
    });
  } catch (error) {
    console.error('获取系统资源使用情况失败:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system resources',
      error: error.message
    });
  }
});

/**
 * 强制垃圾回收（仅在开发环境或紧急情况下使用）
 * POST /api/admin/pdf-service/gc
 */
router.post('/gc', requireAdmin, (req, res) => {
  try {
    if (global.gc) {
      const beforeMem = process.memoryUsage();
      global.gc();
      const afterMem = process.memoryUsage();
      
      res.json({
        success: true,
        message: 'Garbage collection completed',
        data: {
          before: {
            heapUsed: Math.round(beforeMem.heapUsed / 1024 / 1024) + 'MB',
            rss: Math.round(beforeMem.rss / 1024 / 1024) + 'MB'
          },
          after: {
            heapUsed: Math.round(afterMem.heapUsed / 1024 / 1024) + 'MB',
            rss: Math.round(afterMem.rss / 1024 / 1024) + 'MB'
          },
          freed: {
            heap: Math.round((beforeMem.heapUsed - afterMem.heapUsed) / 1024 / 1024) + 'MB',
            rss: Math.round((beforeMem.rss - afterMem.rss) / 1024 / 1024) + 'MB'
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Garbage collection is not exposed. Start Node.js with --expose-gc flag.'
      });
    }
  } catch (error) {
    console.error('执行垃圾回收失败:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform garbage collection',
      error: error.message
    });
  }
});

module.exports = router;
