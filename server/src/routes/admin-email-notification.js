/**
 * ICPADS 2025 管理员邮件通知路由
 * 提供邮件群发、目标用户筛选、任务管理等功能
 */

const express = require('express');
const { Op } = require('sequelize');
const { RegistrationSubmission, InvoiceRequest, User } = require('../models');
const emailTaskManager = require('../utils/emailTaskManager');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要管理员认证
router.use(requireAdmin);

/**
 * 获取支持的模板变量说明
 */
router.get('/template-variables', async (req, res) => {
  try {
    const variables = emailTaskManager.getTemplateVariables();
    res.json({
      success: true,
      data: variables
    });
  } catch (error) {
    console.error('Error getting template variables:', error);
    res.status(500).json({
      success: false,
      message: '获取模板变量失败',
      error: error.message
    });
  }
});

/**
 * 根据筛选条件获取目标用户列表
 */
router.post('/recipients', async (req, res) => {
  try {
    const { filterType, filterSubType } = req.body;
    
    let recipients = [];
    
    switch (filterType) {
      case 'all':
        // 全部用户 - 从注册表获取所有已通过且未退款的用户
        recipients = await getRegistrationRecipients({});
        break;
        
      case 'registration':
        // 注册相关
        recipients = await getRegistrationRecipients(getRegistrationFilter(filterSubType));
        break;
        
      case 'international':
        // 国外用户（国际支付方式）
        recipients = await getRegistrationRecipients({
          payment_method: 'international',
          ...getRegistrationFilter(filterSubType)
        });
        break;
        
      case 'invoice':
        // 发票相关
        recipients = await getInvoiceRecipients(filterSubType);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: '无效的筛选类型'
        });
    }
    
    res.json({
      success: true,
      data: {
        count: recipients.length,
        recipients: recipients
      }
    });
    
  } catch (error) {
    console.error('Error getting recipients:', error);
    res.status(500).json({
      success: false,
      message: '获取收件人列表失败',
      error: error.message
    });
  }
});

/**
 * 获取注册筛选条件
 */
function getRegistrationFilter(subType) {
  switch (subType) {
    case 'all':
      return {};
    case 'approved':
      return { status: 'approved', is_refunded: false };
    case 'pending':
      return { status: 'pending' };
    case 'rejected':
      return { status: 'rejected' };
    case 'refunded':
      return { is_refunded: true };
    default:
      return {};
  }
}

/**
 * 从注册表获取收件人
 */
async function getRegistrationRecipients(whereClause) {
  const registrations = await RegistrationSubmission.findAll({
    where: whereClause,
    attributes: ['id', 'name', 'email', 'affiliation', 'product_code', 'payment_method', 'total_amount_usd', 'total_amount_rmb', 'status'],
    raw: true
  });
  
  return registrations.map(r => ({
    email: r.email,
    username: r.name,
    registration_id: r.id.toString(),
    affiliation: r.affiliation || '',
    product_code: r.product_code || '',
    payment_method: r.payment_method || '',
    total_amount: r.payment_method === 'international' 
      ? `$${r.total_amount_usd || 0}` 
      : `¥${r.total_amount_rmb || 0}`,
    status: r.status || ''
  }));
}

/**
 * 从发票表获取收件人
 */
async function getInvoiceRecipients(subType) {
  switch (subType) {
    case 'all':
      // 获取所有已提交发票申请的用户
      return await getInvoiceRequestRecipients({});
      
    case 'pending_processing':
      // 待处理+处理中
      return await getInvoiceRequestRecipients({
        status: { [Op.in]: ['pending', 'processing'] }
      });
      
    case 'completed':
      // 已完成
      return await getInvoiceRequestRecipients({ status: 'completed' });
      
    case 'rejected':
      // 已拒绝
      return await getInvoiceRequestRecipients({ status: 'rejected' });
      
    case 'not_applied':
      // 未申请发票的用户：国内支付+已批准+未退款，但没有发票申请记录
      return await getNotAppliedInvoiceRecipients();
      
    default:
      return [];
  }
}

/**
 * 获取已提交发票申请的收件人
 */
async function getInvoiceRequestRecipients(whereClause) {
  const invoiceRequests = await InvoiceRequest.findAll({
    where: whereClause,
    include: [{
      model: RegistrationSubmission,
      as: 'registration',
      attributes: ['id', 'name', 'email', 'affiliation', 'product_code', 'payment_method', 'total_amount_rmb', 'status']
    }],
    raw: true,
    nest: true
  });
  
  return invoiceRequests.map(ir => ({
    email: ir.registration?.email || ir.contactEmail || '',
    username: ir.registration?.name || ir.contactName || '',
    registration_id: ir.registrationId?.toString() || '',
    affiliation: ir.registration?.affiliation || '',
    product_code: ir.registration?.product_code || '',
    payment_method: ir.registration?.payment_method || '',
    total_amount: `¥${ir.registration?.total_amount_rmb || 0}`,
    status: ir.status || ''
  })).filter(r => r.email);
}

/**
 * 获取未申请发票的收件人
 * 逻辑：国内支付+已批准+未退款的注册，但没有发票申请记录
 */
async function getNotAppliedInvoiceRecipients() {
  // 获取所有国内支付+已批准+未退款的注册ID
  const eligibleRegistrations = await RegistrationSubmission.findAll({
    where: {
      payment_method: 'domestic',
      status: 'approved',
      is_refunded: false
    },
    attributes: ['id', 'name', 'email', 'affiliation', 'product_code', 'payment_method', 'total_amount_rmb', 'status'],
    raw: true
  });
  
  const eligibleIds = eligibleRegistrations.map(r => r.id);
  
  if (eligibleIds.length === 0) {
    return [];
  }
  
  // 获取已有发票申请的注册ID
  const appliedInvoices = await InvoiceRequest.findAll({
    where: {
      registrationId: { [Op.in]: eligibleIds }
    },
    attributes: ['registrationId'],
    raw: true
  });
  
  const appliedIds = new Set(appliedInvoices.map(i => i.registrationId));
  
  // 过滤出未申请发票的注册
  const notAppliedRegistrations = eligibleRegistrations.filter(r => !appliedIds.has(r.id));
  
  return notAppliedRegistrations.map(r => ({
    email: r.email,
    username: r.name,
    registration_id: r.id.toString(),
    affiliation: r.affiliation || '',
    product_code: r.product_code || '',
    payment_method: r.payment_method || '',
    total_amount: `¥${r.total_amount_rmb || 0}`,
    status: r.status || ''
  }));
}

/**
 * 创建并发送邮件任务
 */
router.post('/send', async (req, res) => {
  try {
    const { subject, content, filterType, filterSubType, ccList = [] } = req.body;
    
    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: '邮件主题和内容不能为空'
      });
    }
    
    // 获取收件人列表
    let recipients = [];
    
    switch (filterType) {
      case 'all':
        recipients = await getRegistrationRecipients({});
        break;
      case 'registration':
        recipients = await getRegistrationRecipients(getRegistrationFilter(filterSubType));
        break;
      case 'international':
        recipients = await getRegistrationRecipients({
          payment_method: 'international',
          ...getRegistrationFilter(filterSubType)
        });
        break;
      case 'invoice':
        recipients = await getInvoiceRecipients(filterSubType);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '无效的筛选类型'
        });
    }
    
    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有符合条件的收件人'
      });
    }
    
    // 解析和验证抄送邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let parsedCcList = [];
    
    // 如果ccList是字符串，先解析成数组
    if (typeof ccList === 'string') {
      parsedCcList = ccList.split(/[,;，；\s]+/).map(e => e.trim()).filter(e => e);
    } else if (Array.isArray(ccList)) {
      parsedCcList = ccList;
    }
    
    const validCcList = parsedCcList.filter(email => emailRegex.test(email.trim())).map(e => e.trim());
    
    // 创建任务
    const task = emailTaskManager.createTask({
      subject,
      content,
      recipients,
      ccList: validCcList,
      filterType,
      filterSubType,
      createdBy: req.session.adminUser?.username || 'admin'
    });
    
    // 异步执行任务（不阻塞响应）
    emailTaskManager.executeTask(task.id).catch(error => {
      console.error('Task execution error:', error);
    });
    
    res.json({
      success: true,
      message: '邮件任务已创建并开始执行',
      data: {
        taskId: task.id,
        totalRecipients: recipients.length
      }
    });
    
  } catch (error) {
    console.error('Error creating email task:', error);
    res.status(500).json({
      success: false,
      message: '创建邮件任务失败',
      error: error.message
    });
  }
});

/**
 * 获取任务列表
 */
router.get('/tasks', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = emailTaskManager.getTasks(page, limit);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败',
      error: error.message
    });
  }
});

/**
 * 获取任务详情
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const task = emailTaskManager.getTask(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    res.json({
      success: true,
      data: task
    });
    
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败',
      error: error.message
    });
  }
});

/**
 * 取消任务
 */
router.post('/tasks/:taskId/cancel', async (req, res) => {
  try {
    const task = emailTaskManager.cancelTask(req.params.taskId);
    
    res.json({
      success: true,
      message: '任务已取消',
      data: task
    });
    
  } catch (error) {
    console.error('Error cancelling task:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取消任务失败'
    });
  }
});

/**
 * 重试任务（重新发送失败的邮件）
 */
router.post('/tasks/:taskId/retry', async (req, res) => {
  try {
    const adminUser = req.session.adminUser || { username: 'admin' };
    const newTask = await emailTaskManager.retryTask(req.params.taskId, adminUser.username);
    
    res.json({
      success: true,
      message: `已创建重试任务，将重新发送 ${newTask.totalCount} 封失败的邮件`,
      data: newTask
    });
    
  } catch (error) {
    console.error('Error retrying task:', error);
    res.status(500).json({
      success: false,
      message: error.message || '重试任务失败'
    });
  }
});

/**
 * 获取任务的失败收件人列表
 */
router.get('/tasks/:taskId/failed-recipients', async (req, res) => {
  try {
    const failedRecipients = emailTaskManager.getFailedRecipients(req.params.taskId);
    
    res.json({
      success: true,
      data: failedRecipients
    });
    
  } catch (error) {
    console.error('Error getting failed recipients:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取失败收件人列表失败'
    });
  }
});

/**
 * 删除任务
 */
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const success = emailTaskManager.deleteTask(req.params.taskId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    res.json({
      success: true,
      message: '任务已删除'
    });
    
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除任务失败'
    });
  }
});

/**
 * 获取当前正在执行的任务
 */
router.get('/current-task', async (req, res) => {
  try {
    const task = emailTaskManager.getCurrentTask();
    const isRunning = emailTaskManager.isTaskRunning();
    
    res.json({
      success: true,
      data: {
        isRunning,
        task
      }
    });
    
  } catch (error) {
    console.error('Error getting current task:', error);
    res.status(500).json({
      success: false,
      message: '获取当前任务失败',
      error: error.message
    });
  }
});

/**
 * 预览邮件（使用模板变量替换）
 */
router.post('/preview', async (req, res) => {
  try {
    const { subject, content, sampleData } = req.body;
    
    // 使用示例数据替换模板变量
    const defaultSampleData = {
      username: '张三',
      email: 'zhangsan@example.com',
      registration_id: '12345',
      affiliation: '北京大学',
      product_code: 'FULL-REGULAR',
      payment_method: 'domestic',
      total_amount: '¥3000',
      status: 'approved',
      date: new Date().toISOString().split('T')[0]
    };
    
    const data = { ...defaultSampleData, ...sampleData };
    
    const previewSubject = emailTaskManager.replaceTemplateVariables(subject || '', data);
    const previewContent = emailTaskManager.replaceTemplateVariables(content || '', data);
    const previewHtml = emailTaskManager.buildEmailHtml(previewContent, data);
    
    res.json({
      success: true,
      data: {
        subject: previewSubject,
        content: previewContent,
        html: previewHtml
      }
    });
    
  } catch (error) {
    console.error('Error previewing email:', error);
    res.status(500).json({
      success: false,
      message: '预览邮件失败',
      error: error.message
    });
  }
});

module.exports = router;
