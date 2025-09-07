const express = require('express');
const { Op, literal, fn, col } = require('sequelize');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const RegistrationSubmission = require('../models/RegistrationSubmission');
const User = require('../models/User');
const { RefundRequest } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getPDFWorkerPoolStats, getHealthStatus } = require('../services/pdfService');
const asyncPDFManager = require('../services/asyncPdfManager');
const { sequelize } = require('../config/database');

// 导入其他管理员路由
const adminInvoiceRoutes = require('./admin-invoices');
const adminTransferRoutes = require('./admin-transfers');

const execAsync = promisify(exec);

const router = express.Router();

// 配置文件上传
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      'text/plain',
      'text/csv', 
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/x-sqlite3',
      'application/octet-stream'
    ];
    
    const allowedExtensions = ['.txt', '.csv', '.xlsx', '.xls', '.sqlite', '.sqlite3', '.db'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。仅支持 .txt, .csv, .xlsx, .xls, .sqlite, .sqlite3, .db 文件。'));
    }
  }
});

/**
 * 获取真实的CPU使用率
 * @returns {Promise<number>} CPU使用率百分比
 */
async function getRealCPUUsage() {
  try {
    const platform = os.platform();
    let command;
    
    if (platform === 'darwin' || platform === 'linux') {
      // macOS 和 Linux 使用 top 命令
      command = `top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//'`;
      if (platform === 'linux') {
        // Linux 使用不同的命令
        command = `top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'`;
      }
    } else if (platform === 'win32') {
      // Windows 使用 wmic 命令
      command = `wmic cpu get loadpercentage /value | findstr "LoadPercentage"`;
    } else {
      // 其他平台回退到负载平均值
      const loadAverage = os.loadavg()[0];
      const cpuCount = os.cpus().length;
      return Math.min(Math.round((loadAverage / cpuCount) * 100), 100);
    }

    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      // Windows 输出格式: LoadPercentage=15
      const match = stdout.match(/LoadPercentage=(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } else if (platform === 'darwin') {
      // macOS 输出可能是: "15.2% user"
      const match = stdout.match(/([\d.]+)/);
      return match ? Math.round(parseFloat(match[1])) : 0;
    } else {
      // Linux
      const match = stdout.match(/([\d.]+)/);
      return match ? Math.round(parseFloat(match[1])) : 0;
    }
  } catch (error) {
    console.error('获取CPU使用率失败:', error);
    // 回退到负载平均值
    const loadAverage = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    return Math.min(Math.round((loadAverage / cpuCount) * 100), 100);
  }
}

/**
 * 获取真实的内存使用率
 * @returns {Promise<number>} 内存使用率百分比
 */
async function getRealMemoryUsage() {
  try {
    const platform = os.platform();
    
    if (platform === 'darwin') {
      // macOS: 使用 memory_pressure 命令获取准确的内存使用率
      try {
        const { stdout } = await execAsync('memory_pressure');
        const freePercentMatch = stdout.match(/System-wide memory free percentage:\s*(\d+)%/);
        if (freePercentMatch) {
          const freePercent = parseInt(freePercentMatch[1]);
          const usedPercent = 100 - freePercent;
          return Math.min(usedPercent, 99);
        }
      } catch (e) {
        console.log('memory_pressure命令不可用，使用备用方法');
      }
      
      // 备用方法：使用top命令获取内存信息
      try {
        const { stdout } = await execAsync('top -l 1 -s 0 | grep PhysMem');
        // 输出格式类似: PhysMem: 15G used (2532M wired), 1235M unused.
        const usedMatch = stdout.match(/(\d+(?:\.\d+)?)([KMGT])\s+used/);
        const unusedMatch = stdout.match(/(\d+(?:\.\d+)?)([KMGT])\s+unused/);
        
        if (usedMatch && unusedMatch) {
          const usedValue = parseFloat(usedMatch[1]);
          const usedUnit = usedMatch[2];
          const unusedValue = parseFloat(unusedMatch[1]);
          const unusedUnit = unusedMatch[2];
          
          // 转换为MB
          const unitMultiplier = { K: 0.001, M: 1, G: 1024, T: 1024 * 1024 };
          const usedMB = usedValue * (unitMultiplier[usedUnit] || 1);
          const unusedMB = unusedValue * (unitMultiplier[unusedUnit] || 1);
          const totalMB = usedMB + unusedMB;
          
          if (totalMB > 0) {
            return Math.min(Math.round((usedMB / totalMB) * 100), 99);
          }
        }
      } catch (e) {
        console.log('top命令获取内存信息失败，使用Node.js API');
      }
      
      // 最后备用方法：Node.js API，但限制最大值
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const usage = Math.round((usedMemory / totalMemory) * 100);
      
      // 如果Node.js API显示使用率过高，返回一个更合理的值
      return Math.min(usage, 85);
      
    } else if (platform === 'linux') {
      // Linux 使用 free 命令
      const { stdout } = await execAsync(`free | grep Mem | awk '{printf "%.0f", ($2-$7)/$2 * 100.0}'`);
      return Math.min(parseInt(stdout.trim()) || 0, 99);
      
    } else if (platform === 'win32') {
      // Windows 使用 wmic 命令
      const { stdout } = await execAsync(`wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value`);
      const totalMatch = stdout.match(/TotalVisibleMemorySize=(\d+)/);
      const freeMatch = stdout.match(/FreePhysicalMemory=(\d+)/);
      
      if (totalMatch && freeMatch) {
        const total = parseInt(totalMatch[1]);
        const free = parseInt(freeMatch[1]);
        const used = total - free;
        return Math.min(Math.round((used / total) * 100), 99);
      }
    }
    
    // 默认回退到 Node.js 内置方法
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return Math.min(Math.round((usedMemory / totalMemory) * 100), 85);
    
  } catch (error) {
    console.error('获取内存使用率失败:', error);
    // 回退到 Node.js 内置方法，返回保守值
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return Math.min(Math.round((usedMemory / totalMemory) * 100), 75); // 出错时返回一个更保守的值
  }
}

/**
 * 检查进程是否运行
 * @param {string} processName 进程名称
 * @returns {Promise<string>} 进程状态 'online' | 'offline'
 */
async function checkProcessStatus(processName) {
  try {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = `tasklist /FI "IMAGENAME eq ${processName}" | findstr "${processName}"`;
    } else {
      command = `ps aux | grep "${processName}" | grep -v grep`;
    }

    const { stdout } = await execAsync(command);
    return stdout.trim().length > 0 ? 'online' : 'offline';
  } catch (error) {
    return 'offline';
  }
}

// 获取系统状态（管理员）
router.get('/system-status', requireAdmin, async (req, res) => {
  try {
    // 并行获取系统信息
    const [cpuUsage, memoryUsage] = await Promise.all([
      getRealCPUUsage(),
      getRealMemoryUsage()
    ]);

    // 获取PDF Worker状态
    let pdfWorkerStatus = 'unknown';
    let pdfQueueCount = 0;
    let pdfProcessingCount = 0;
    let asyncPdfStats = {};
    
    try {
      const pdfHealth = getHealthStatus();
      const pdfStats = getPDFWorkerPoolStats();
      
      // 根据实际worker状态设置状态文本
      const totalWorkers = pdfStats.workers.total || 0;
      const busyWorkers = pdfStats.workers.busy || 0;
      const availableWorkers = pdfStats.workers.available || 0;
      
      if (pdfHealth.status !== 'healthy') {
        pdfWorkerStatus = 'error';
      } else if (busyWorkers > 0) {
        // 有worker在工作，显示正在工作的worker数量
        pdfWorkerStatus = `${busyWorkers}working`;
      } else if (totalWorkers > 0) {
        // 有worker但都空闲，显示空闲的worker数量
        pdfWorkerStatus = `${totalWorkers}idle`;
      } else {
        // 没有worker（按需创建模式下的初始状态），显示"空闲"
        pdfWorkerStatus = 'idle';
      }
      
      pdfQueueCount = pdfStats.queue.pending || 0;
      pdfProcessingCount = pdfStats.workers.busy || 0;
      
      // 获取异步PDF任务统计
      asyncPdfStats = asyncPDFManager.getStats();
    } catch (pdfError) {
      console.error('获取PDF Worker状态失败:', pdfError);
      pdfWorkerStatus = 'error';
    }

    // 检查当前服务器进程状态（当前进程肯定在运行）
    // 已删除进程状态检查

    // 获取系统信息
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    const systemStatus = {
      cpuUsage, // 真实CPU使用率
      memoryUsage, // 真实内存使用率
      pdfWorkerStatus,
      pdfQueueCount,
      pdfProcessingCount,
      asyncPdfTasks: asyncPdfStats, // 异步PDF任务统计
      pdfTempDir: asyncPDFManager.tempDir, // PDF临时目录路径
      uptime: Math.floor(process.uptime()),
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: Math.round(totalMemory / 1024 / 1024), // MB
        freeMemory: Math.round(freeMemory / 1024 / 1024), // MB
        cpuCount: os.cpus().length,
        hostname: os.hostname(),
        loadAverage: os.loadavg()
      }
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取PDF Worker详细状态（管理员）
router.get('/pdf-worker-status', requireAdmin, async (req, res) => {
  try {
    const pdfHealth = getHealthStatus();
    const pdfStats = getPDFWorkerPoolStats();
    
    res.json({
      success: true,
      data: {
        health: pdfHealth,
        stats: pdfStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get PDF worker status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: {
        health: { status: 'error' },
        stats: { 
          workers: { total: 0, active: 0, idle: 0 },
          queue: { pending: 0, completed: 0, failed: 0 }
        }
      }
    });
  }
});

// 获取所有注册提交（管理员）
router.get('/submissions', requireAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let where = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }

    // 搜索功能：支持姓名和邮箱搜索
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm) {
        where[Op.or] = [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } }
        ];
      }
    }

    const offset = (page - 1) * limit;
    const submissions = await RegistrationSubmission.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'fullname']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['username', 'fullname']
        }
      ],
      order: [['submission_time', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const total = await RegistrationSubmission.count({ where });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: submissions.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 审核注册提交（管理员）
router.put('/submissions/:id/review', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve or reject'
      });
    }

    const submission = await RegistrationSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    submission.status = action === 'approve' ? 'approved' : 'rejected';
    submission.review_notes = notes;
    submission.reviewed_by_id = req.session.userId;
    submission.review_time = new Date();

    await submission.save();

    res.json({
      success: true,
      message: `Submission ${submission.status} successfully`,
      data: submission
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取单个注册详情（管理员）
router.get('/submissions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await RegistrationSubmission.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'fullname', 'role']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['username', 'fullname']
        }
      ]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.json({
      success: true,
      data: submission
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 批准注册提交（管理员）
router.post('/submissions/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;

    const submission = await RegistrationSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    submission.status = 'approved';
    submission.review_notes = notes;
    submission.reviewed_by_id = req.session.userId;
    submission.review_time = new Date();

    await submission.save();

    res.json({
      success: true,
      message: 'Submission approved successfully',
      data: submission
    });

  } catch (error) {
    console.error('Approve submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 拒绝注册提交（管理员）
router.post('/submissions/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;

    const submission = await RegistrationSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    submission.status = 'rejected';
    submission.review_notes = notes;
    submission.reviewed_by_id = req.session.userId;
    submission.review_time = new Date();

    await submission.save();

    res.json({
      success: true,
      message: 'Submission rejected successfully',
      data: submission
    });

  } catch (error) {
    console.error('Reject submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 重新审核注册提交（管理员）
router.post('/submissions/:id/re-review', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await RegistrationSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // 重置为待审核状态
    submission.status = 'pending';
    submission.review_notes = '';
    submission.reviewed_by_id = null;
    submission.review_time = null;

    await submission.save();

    res.json({
      success: true,
      message: 'Submission reset to pending review successfully',
      data: submission
    });

  } catch (error) {
    console.error('Re-review submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取统计数据（管理员）
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    // 使用 RegistrationSubmission 模型的 getStats 方法获取完整统计
    const completStats = await RegistrationSubmission.getStats();

    // 状态统计
    const statusStats = await RegistrationSubmission.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('product_price')), 'totalPayment']
      ],
      group: ['status'],
      raw: true
    });

    const stats = {
      pending: completStats.pending || 0,
      approved: completStats.approved || 0,
      rejected: completStats.rejected || 0,
      totalPayment: completStats.total_payment || 0,
      totalRegistrations: completStats.total || 0,
      students: completStats.students || 0,
      members: completStats.members || 0,
      approvedPayment: completStats.approved_payment || 0,
      approvalRate: completStats.approval_rate || 0,
      product_stats: completStats.product_stats || []
    };

    // 每日统计（最近7天）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await RegistrationSubmission.findAll({
      attributes: [
        [fn('DATE', col('submission_time')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        submission_time: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: [fn('DATE', col('submission_time'))],
      order: [[fn('DATE', col('submission_time')), 'ASC']],
      raw: true
    });

    stats.dailyStats = dailyStats.map(item => ({
      date: item.date,
      count: parseInt(item.count)
    }));

    // 获取待处理的转让和退款数量
    try {
      const refundCount = await RefundRequest.count({
        where: {
          status: 'pending'
        }
      });
      stats.pendingRefunds = refundCount;
    } catch (refundError) {
      console.log('RefundRequest table not found or error:', refundError.message);
      stats.pendingRefunds = 0;
    }

    try {
      const { AttendeeTransfer } = require('../models');
      const transferCount = await AttendeeTransfer.count({
        where: {
          status: 'pending'
        }
      });
      stats.pendingTransfers = transferCount;
    } catch (transferError) {
      console.log('AttendeeTransfer table not found or error:', transferError.message);
      stats.pendingTransfers = 0;
    }

    // 计算今日新增注册
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayRegistrations = await RegistrationSubmission.count({
      where: {
        submission_time: {
          [Op.gte]: todayStart
        }
      }
    });
    stats.todayRegistrations = todayRegistrations;

    // 计算本周新增注册
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekRegistrations = await RegistrationSubmission.count({
      where: {
        submission_time: {
          [Op.gte]: weekStart
        }
      }
    });
    stats.weekRegistrations = weekRegistrations;

    // 增加月度统计
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthRegistrations = await RegistrationSubmission.count({
      where: {
        submission_time: {
          [Op.gte]: monthStart
        }
      }
    });
    stats.monthRegistrations = monthRegistrations;

    // 计算平均处理时间（天）
    const processedSubmissions = await RegistrationSubmission.findAll({
      attributes: [
        'submission_time',
        'review_time'
      ],
      where: {
        status: ['approved', 'rejected'],
        review_time: {
          [Op.ne]: null
        }
      },
      raw: true
    });

    if (processedSubmissions.length > 0) {
      const totalProcessingTime = processedSubmissions.reduce((total, submission) => {
        const submissionTime = new Date(submission.submission_time);
        const reviewTime = new Date(submission.review_time);
        const diffInDays = (reviewTime - submissionTime) / (1000 * 60 * 60 * 24);
        return total + diffInDays;
      }, 0);
      
      stats.averageProcessingTime = (totalProcessingTime / processedSubmissions.length).toFixed(1);
    } else {
      stats.averageProcessingTime = 0;
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取支付统计（管理员）
router.get('/payments', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    
    // 今日
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayPayment = await RegistrationSubmission.findAll({
      attributes: [
        [fn('SUM', col('product_price')), 'total']
      ],
      where: {
        status: 'approved',
        review_time: {
          [Op.gte]: todayStart
        }
      },
      raw: true
    });

    // 本周
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekPayment = await RegistrationSubmission.findAll({
      attributes: [
        [fn('SUM', col('product_price')), 'total']
      ],
      where: {
        status: 'approved',
        review_time: {
          [Op.gte]: weekStart
        }
      },
      raw: true
    });

    // 本月
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthPayment = await RegistrationSubmission.findAll({
      attributes: [
        [fn('SUM', col('product_price')), 'total']
      ],
      where: {
        status: 'approved',
        review_time: {
          [Op.gte]: monthStart
        }
      },
      raw: true
    });

    // 总计
    const totalPayment = await RegistrationSubmission.findAll({
      attributes: [
        [fn('SUM', col('product_price')), 'total']
      ],
      where: {
        status: 'approved'
      },
      raw: true
    });

    res.json({
      success: true,
      data: {
        today: parseFloat(todayPayment[0]?.total) || 0,
        week: parseFloat(weekPayment[0]?.total) || 0,
        month: parseFloat(monthPayment[0]?.total) || 0,
        total: parseFloat(totalPayment[0]?.total) || 0
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取所有用户（管理员）
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    let where = {};
    
    // 角色筛选逻辑
    if (role && ['user', 'admin'].includes(role)) {
      if (role === 'admin') {
        // 管理员：is_superuser为true 或 role为admin 或 username为admin
        where[Op.or] = [
          { is_superuser: true },
          { role: 'admin' },
          { username: 'admin' }
        ];
      } else {
        // 普通用户：不是管理员的用户
        where[Op.and] = [
          { 
            [Op.or]: [
              { is_superuser: false },
              { is_superuser: null }
            ]
          },
          { 
            [Op.or]: [
              { role: 'user' },
              { role: null }
            ]
          },
          { username: { [Op.ne]: 'admin' } }
        ];
      }
    }

    // 搜索功能
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
      
      // 如果已经有where条件，需要合并
      if (Object.keys(where).length > 0) {
        where = {
          [Op.and]: [where, searchCondition]
        };
      } else {
        where = searchCondition;
      }
    }

    const offset = (page - 1) * limit;
    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['date_joined', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const total = await User.count({ where });

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: users.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取单个用户详情（管理员）
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 获取用户的注册记录
    const submissions = await RegistrationSubmission.findAll({
      where: { userId: id },
      order: [['submission_time', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        user,
        submissions
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 冻结用户（管理员）
router.post('/users/:id/freeze', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 不能冻结自己
    if (user.id === req.session.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot freeze yourself'
      });
    }

    // 不能冻结超级管理员
    if (user.is_superuser) {
      return res.status(400).json({
        success: false,
        message: 'Cannot freeze superuser'
      });
    }

    // 不能冻结默认admin用户
    if (user.username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot freeze default admin user'
      });
    }

    user.is_active = false;
    await user.save();

    res.json({
      success: true,
      message: 'User frozen successfully',
      data: user
    });

  } catch (error) {
    console.error('Freeze user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 解冻用户（管理员）
router.post('/users/:id/unfreeze', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.is_active = true;
    await user.save();

    res.json({
      success: true,
      message: 'User unfrozen successfully',
      data: user
    });

  } catch (error) {
    console.error('Unfreeze user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 设为管理员（管理员）
router.post('/users/:id/set-admin', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 检查是否已经是管理员
    if (user.is_superuser || user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is already an administrator'
      });
    }

    user.role = 'admin'; // 设置 role
    await user.save();

    res.json({
      success: true,
      message: 'User set as administrator successfully',
      data: user
    });

  } catch (error) {
    console.error('Set admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 取消管理员（管理员）
router.post('/users/:id/remove-admin', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 不能取消自己的管理员权限
    if (user.id === req.session.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove admin privileges from yourself'
      });
    }

    // 不能取消超级管理员权限
    if (user.is_superuser) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove superuser privileges'
      });
    }

    // 不能取消默认admin用户的权限
    if (user.username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove admin privileges from default admin user'
      });
    }

    user.role = 'user'; // 设置 role
    await user.save();

    res.json({
      success: true,
      message: 'Admin privileges removed successfully',
      data: user
    });

  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 删除注册提交（管理员）
router.delete('/submissions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await RegistrationSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    await submission.destroy();

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取所有退款申请（管理员）
router.get('/refund-requests', requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const { Op } = require('sequelize');
    
    let where = {};
    if (status && ['pending', 'approved', 'rejected', 'processed'].includes(status)) {
      where.status = status;
    }

    // 构建包含搜索条件的include
    const includeConditions = [
      {
        model: RegistrationSubmission,
        as: 'registration',
        where: search ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        } : {},
        required: !!search, // 如果有搜索条件，必须匹配
        attributes: ['id', 'name', 'email', 'product_code', 'product_price', 'submission_time']
      },
      {
        model: User,
        as: 'user',
        attributes: ['username', 'fullname', 'email']
      },
      {
        model: User,
        as: 'processor',
        attributes: ['username', 'fullname', 'email'],
        required: false
        }
    ];

    const offset = (page - 1) * limit;
    const refundRequests = await RefundRequest.findAll({
      where,
      include: includeConditions,
      order: [['requestTime', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const total = await RefundRequest.count({ 
      where,
      include: search ? [
        {
          model: RegistrationSubmission,
          as: 'registration',
          where: {
            [Op.or]: [
              { name: { [Op.like]: `%${search}%` } },
              { email: { [Op.like]: `%${search}%` } }
            ]
          }
        }
      ] : []
    });

    res.json({
      success: true,
      data: {
        refundRequests,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: refundRequests.length,
          totalRecords: total
        }
      }
    });
  } catch (error) {
    console.error('Get refund requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取退款申请详情（管理员）
router.get('/refund-requests/:id', requireAdmin, async (req, res) => {
  try {
    const refundRequest = await RefundRequest.findByPk(req.params.id, {
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration',
          attributes: ['id', 'name', 'email', 'phone', 'affiliation', 'product_code', 'product_price', 'submission_time', 'review_time']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullname', 'email']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'username', 'fullname', 'email'],
          required: false
        }
      ]
    });

    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: 'Refund request not found'
      });
    }

    res.json({
      success: true,
      data: refundRequest
    });
  } catch (error) {
    console.error('Get refund request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 处理退款申请（管理员）
router.put('/refund-requests/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, refundMethod, transactionId } = req.body;

    // 验证状态
    if (!['approved', 'rejected', 'processed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or processed'
      });
    }

    const refundRequest = await RefundRequest.findByPk(id);
    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: 'Refund request not found'
      });
    }

    // 检查当前状态
    if (refundRequest.status !== 'pending' && refundRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only process pending or approved refund requests'
      });
    }

    // 更新退款申请
    refundRequest.status = status;
    refundRequest.processedBy = req.session.userId;
    refundRequest.processTime = new Date();
    refundRequest.adminNotes = adminNotes || '';
    
    if (status === 'processed') {
      refundRequest.refundMethod = refundMethod || 'bank_transfer';
      refundRequest.transactionId = transactionId || '';
    }

    await refundRequest.save();

    res.json({
      success: true,
      data: refundRequest,
      message: `Refund request ${status} successfully`
    });
  } catch (error) {
    console.error('Process refund request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 重新审核退款申请（管理员）
router.post('/refund-requests/:id/re-review', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const refundRequest = await RefundRequest.findByPk(id);
    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: 'Refund request not found'
      });
    }

    // 检查当前状态
    if (refundRequest.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Refund request is already pending review'
      });
    }

    // 重置为待审核状态
    refundRequest.status = 'pending';
    refundRequest.processedBy = null;
    refundRequest.processTime = null;
    refundRequest.adminNotes = '';
    refundRequest.refundMethod = null;
    refundRequest.transactionId = null;

    await refundRequest.save();

    res.json({
      success: true,
      data: refundRequest,
      message: 'Refund request has been reset to pending status for re-review'
    });
  } catch (error) {
    console.error('Re-review refund request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取退款统计数据（管理员）
router.get('/refund-stats', requireAdmin, async (req, res) => {
  try {
    const stats = await RefundRequest.getStats();

    // 获取最近的退款申请
    const recentRequests = await RefundRequest.findAll({
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration',
          attributes: ['name', 'email', 'product_code']
        },
        {
          model: User,
          as: 'user',
          attributes: ['fullname', 'email']
        }
      ],
      order: [['requestTime', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        stats,
        recentRequests
      }
    });
  } catch (error) {
    console.error('Get refund stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 挂载子路由
router.use('/invoices', adminInvoiceRoutes);
router.use('/transfers', adminTransferRoutes);

// ==================== 导入导出功能 ====================

/**
 * 1. 导出功能 - 备份并下载数据库
 */
router.get('/backup/export', requireAdmin, async (req, res) => {
  try {
    const { dbPath } = require('../config/database');
    
    // 检查数据库文件是否存在
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({
        success: false,
        message: '数据库文件不存在'
      });
    }

    // 创建备份文件名（带时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    const backupFileName = `icpads2025_backup_${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);

    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 复制数据库文件作为备份
    fs.copyFileSync(dbPath, backupPath);
    
    console.log(`数据库备份已创建: ${backupPath}`);

    // 设置响应头，触发文件下载
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
    
    // 发送备份文件
    res.sendFile(backupPath, (err) => {
      if (err) {
        console.error('发送备份文件失败:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: '文件下载失败'
          });
        }
      } else {
        console.log(`备份文件已成功下载: ${backupFileName}`);
      }
    });

  } catch (error) {
    console.error('Export database error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 2.1 导入功能 - 批量设置管理员（txt/csv文件）
 */
router.post('/import/admin-emails', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要导入的文件'
      });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let emails = [];

    // 根据文件类型解析邮箱
    if (fileExtension === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      emails = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes('@'));
    } else if (fileExtension === '.csv') {
      // CSV 文件解析
      const results = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      
      // 从CSV的各列中提取邮箱
      emails = results.flatMap(row => 
        Object.values(row)
          .filter(value => typeof value === 'string' && value.includes('@'))
          .map(value => value.trim())
      );
    }

    // 去重和验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = [...new Set(emails)].filter(email => emailRegex.test(email));

    if (validEmails.length === 0) {
      fs.unlinkSync(filePath); // 清理临时文件
      return res.status(400).json({
        success: false,
        message: '文件中没有找到有效的邮箱地址'
      });
    }

    const results = {
      total: validEmails.length,
      updated: 0,
      created: 0,
      errors: []
    };

    const defaultPassword = process.env.CONFREG_DEFAULT_ADMIN_PASSWORD || 'confreg2025';

    // 处理每个邮箱
    for (const email of validEmails) {
      try {
        const existingUser = await User.findOne({ where: { email } });
        
        if (existingUser) {
          // 邮箱存在，设置为管理员
          if (existingUser.role !== 'admin' && !existingUser.is_superuser) {
            existingUser.role = 'admin';
            await existingUser.save();
            results.updated++;
            console.log(`用户 ${email} 已设置为管理员`);
          }
        } else {
          // 邮箱不存在，创建新管理员用户
          const username = email.split('@')[0]; // 使用邮箱前缀作为用户名
          
          // 确保用户名唯一
          let uniqueUsername = username;
          let counter = 1;
          while (await User.findOne({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${username}${counter}`;
            counter++;
          }
          
          // 注意：不要手动哈希密码，让User模型的beforeCreate hook来处理
          await User.create({
            username: uniqueUsername,
            email,
            password: defaultPassword, // 直接传明文密码，让模型自动哈希
            fullname: email.split('@')[0], // 使用邮箱前缀作为全名
            first_name: email.split('@')[0],
            last_name: '',
            role: 'admin',
            is_active: true
          });
          
          results.created++;
          console.log(`创建新管理员用户: ${email} (用户名: ${uniqueUsername}, 密码: ${defaultPassword})`);
        }
      } catch (error) {
        console.error(`处理邮箱 ${email} 时出错:`, error);
        results.errors.push({
          email,
          error: error.message
        });
      }
    }

    // 清理临时文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `导入完成！更新了 ${results.updated} 个用户，创建了 ${results.created} 个新用户`,
      data: results
    });

  } catch (error) {
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Import admin emails error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 2.2 导入功能 - 导入SQLite数据库文件
 */
router.post('/import/database', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要导入的数据库文件'
      });
    }

    const uploadedFilePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // 检查文件类型
    if (!['.sqlite', '.sqlite3', '.db'].includes(fileExtension)) {
      fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型。请上传 .sqlite、.sqlite3 或 .db 文件'
      });
    }

    const { dbPath } = require('../config/database');
    
    // 1. 备份当前数据库
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    const backupFileName = `icpads2025_before_import_${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);

    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 备份当前数据库
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`当前数据库已备份到: ${backupPath}`);
    }

    // 2. 覆盖数据库文件
    fs.copyFileSync(uploadedFilePath, dbPath);
    console.log('数据库文件已覆盖');

    // 3. 清理临时文件
    fs.unlinkSync(uploadedFilePath);

    res.json({
      success: true,
      message: '数据库导入成功！请重新登录系统。',
      data: {
        backupFile: backupFileName,
        backupPath: backupPath
      }
    });

  } catch (error) {
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Import database error:', error);
    res.status(500).json({
      success: false,
      message: `数据库导入失败: ${error.message}`
    });
  }
});

/**
 * 获取备份文件列表
 */
router.get('/backup/list', requireAdmin, async (req, res) => {
  try {
    const { dbPath } = require('../config/database');
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sqlite'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.mtime,
          path: filePath
        };
      })
      .sort((a, b) => b.created - a.created); // 按创建时间倒序

    res.json({
      success: true,
      data: files
    });

  } catch (error) {
    console.error('Get backup list error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
