const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { RegistrationSubmission, User, RefundRequest } = require('../models');
const { requireAuth } = require('../middleware/auth');
// 移除同步PDF生成，全部使用异步系统
const { apiResponse } = require('../utils/response');
const { pdfDownloadLimiter, memoryMonitor } = require('../middleware/pdfProtection');
const asyncPDFManager = require('../services/asyncPdfManager');
const pdfNotificationService = require('../services/pdfNotificationService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = uuidv4() + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Generate receipt number (similar to Django version)
function generateReceiptNumber(submissionId) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(submissionId.toString()).digest('hex').toUpperCase().slice(0, 6);
  return `ICPADS-${hash}`;
}

// Create/Update submission endpoint
router.post('/submit', requireAuth, upload.fields([
  { name: 'screenshot', maxCount: 1 },
  { name: 'proof', maxCount: 1 }
]), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  // 移除email验证，因为email将从用户账户信息中获取
  body('productCode').trim().notEmpty().withMessage('Product code is required'),
  body('productPrice').isNumeric().toFloat().withMessage('Valid product price is required')
], async (req, res) => {
  try {
    // 添加调试日志
    console.log('Submit endpoint - Session ID:', req.sessionID);
    console.log('Submit endpoint - Session userId:', req.session?.userId);
    console.log('Submit endpoint - Session user:', req.session?.user);
    console.log('Submit endpoint - Request body:', req.body);
    console.log('Submit endpoint - Files:', req.files);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      const firstError = errors.array()[0];
      console.log('First error details:', firstError);
      return res.status(400).json({
        status: 3,
        success: false,
        message: `Field ${firstError.param} validation failed: ${firstError.msg}`
      });
    }

    // 从当前用户会话中获取email，不再从请求体中获取
    const { User } = require('../models');
    const currentUser = await User.findByPk(req.session.userId);
    if (!currentUser || !currentUser.email) {
      return res.status(400).json({
        status: 3,
        success: false,
        message: 'User email not found. Please ensure your account has a valid email address.'
      });
    }

    const { name, phone = '', affiliation = '', paper_id = '', productCode, productPrice } = req.body;
    const email = currentUser.email; // 使用当前用户的email

    // Check for required files
    if (!req.files || !req.files.screenshot) {
      return res.status(400).json({
        status: 4,
        message: 'Please upload payment verification'
      });
    }

    const screenshot = req.files.screenshot[0];
    const proof = req.files.proof ? req.files.proof[0] : null;

    // Check if user already has a submission
    let submission = await RegistrationSubmission.findOne({ 
      where: { userId: req.session.userId } 
    });

    if (submission) {
      // Update existing submission
      submission.name = name;
      submission.email = email;
      submission.phone = phone;
      submission.affiliation = affiliation;
      submission.paper_id = paper_id;
      submission.product_code = productCode;
      submission.product_price = parseFloat(productPrice);
      
      // Delete old files if new ones are uploaded
      if (screenshot) {
        const oldScreenshotPath = path.join(__dirname, '../../uploads', submission.screenshot);
        if (fs.existsSync(oldScreenshotPath)) {
          fs.unlinkSync(oldScreenshotPath);
        }
        submission.screenshot = screenshot.filename;
      }
      
      if (proof) {
        if (submission.proof) {
          const oldProofPath = path.join(__dirname, '../../uploads', submission.proof);
          if (fs.existsSync(oldProofPath)) {
            fs.unlinkSync(oldProofPath);
          }
        }
        submission.proof = proof.filename;
      }

      submission.status = 'pending'; // Reset status on update
      submission.submission_time = new Date(); // 更新提交时间
      await submission.save();
      
      const receiptNumber = generateReceiptNumber(submission.id);
      console.log('Update successful, returning response with receiptNumber:', receiptNumber);
      return apiResponse(res, true, { id: receiptNumber }, 'Update success');
    } else {
      // Create new submission
      submission = await RegistrationSubmission.create({
        userId: req.session.userId,
        name,
        email,
        phone,
        affiliation,
        paper_id,
        product_code: productCode,
        product_price: parseFloat(productPrice),
        screenshot: screenshot.filename,
        proof: proof ? proof.filename : '',
        status: 'pending',
        submission_time: new Date()
      });
      
      const receiptNumber = generateReceiptNumber(submission.id);
      console.log('Create successful, returning response with receiptNumber:', receiptNumber);
      return apiResponse(res, true, { id: receiptNumber }, 'Success');
    }

  } catch (error) {
    console.error('Submission error:', error);
    return apiResponse(res, false, null, `Wrong: ${error.message}`, 500);
  }
});

// Check registration status
router.get('/check-registration', requireAuth, async (req, res) => {
  try {
    console.log('=== Check Registration Status - 开始检查 ===');
    console.log('Session userId:', req.session.userId);
    console.log('Session ID:', req.sessionID);
    
    // Get latest submission for user
    const latestSubmission = await RegistrationSubmission.findOne({ 
      where: { userId: req.session.userId },
      order: [['id', 'DESC']]
    });

    console.log('查询到的最新提交记录:', latestSubmission ? {
      id: latestSubmission.id,
      userId: latestSubmission.userId,
      screenshot: latestSubmission.screenshot,
      proof: latestSubmission.proof,
      status: latestSubmission.status
    } : null);

    if (latestSubmission) {
      // 准备图片信息
      const images = {};
      if (latestSubmission.screenshot) {
        images.screenshot = `/uploads/${latestSubmission.screenshot}`;
        console.log('添加支付截图:', images.screenshot);
      }
      if (latestSubmission.proof) {
        images.proof = `/uploads/${latestSubmission.proof}`;
        console.log('添加证明文件:', images.proof);
      }
      
      console.log('准备返回的图片信息:', images);

      if (latestSubmission.status === 'approved') {
        const response = {
          success: true,
          approved: true,
          has_submission: true,
          submission_id: latestSubmission.id,
          registration_id: latestSubmission.id,
          registration_data: {
            name: latestSubmission.name,
            email: latestSubmission.email,
            phone: latestSubmission.phone,
            affiliation: latestSubmission.affiliation,
            paper_id: latestSubmission.paper_id,
            product_code: latestSubmission.product_code,
            product_price: latestSubmission.product_price
          },
          images: images
        };
        console.log('返回已批准的注册状态响应:', response);
        return res.json(response);
      } else {
        const response = {
          success: true,
          approved: false,
          has_submission: true,
          submission_id: latestSubmission.id,
          registration_id: latestSubmission.id,
          registration_data: {
            name: latestSubmission.name,
            email: latestSubmission.email,
            phone: latestSubmission.phone,
            affiliation: latestSubmission.affiliation,
            paper_id: latestSubmission.paper_id,
            product_code: latestSubmission.product_code,
            product_price: latestSubmission.product_price
          },
          images: images
        };
        console.log('返回待审核的注册状态响应:', response);
        return res.json(response);
      }
    }

    // No submission found
    console.log('没有找到任何提交记录');
    const noSubmissionResponse = {
      success: true,
      approved: false,
      has_submission: false
    };
    console.log('返回无提交状态响应:', noSubmissionResponse);
    res.json(noSubmissionResponse);

  } catch (error) {
    console.error('Check registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Download receipt
// 异步生成收据PDF - 第一步：开始生成
router.post('/generate_receipt', pdfDownloadLimiter, memoryMonitor, requireAuth, async (req, res) => {
  try {
    // Find approved submission for user
    const submission = await RegistrationSubmission.findOne({
      where: {
        userId: req.session.userId,
        status: 'approved'
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'No approved registration found'
      });
    }

    // 解析PDF选项
    const marginMode = req.body.marginMode || 'standard';
    let pdfOptions = {};
    
    switch (marginMode) {
      case 'minimal':
        pdfOptions = {
          margin: {
            top: '2mm',
            bottom: '2mm',
            left: '2mm', 
            right: '2mm'
          }
        };
        break;
      case 'none':
        pdfOptions = {
          margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm'
          }
        };
        break;
      default: // 'standard'
        pdfOptions = {
          margin: {
            top: '5mm',
            bottom: '5mm',
            left: '5mm',
            right: '5mm'
          }
        };
    }

    // 开始异步PDF生成
    const result = await asyncPDFManager.startPDFGeneration('receipt', submission, pdfOptions);

    // 检查是否是重复任务
    if (result.error) {
      return res.status(409).json({
        success: false,
        ...result
      });
    }

    res.json({
      success: true,
      taskId: result,
      message: 'PDF generation started'
    });

  } catch (error) {
    console.error('Receipt generation start error:', error);
    res.status(500).json({
      success: false,
      message: `Error starting receipt generation: ${error.message}`
    });
  }
});

// 第二步：检查生成状态
router.get('/pdf_status/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = asyncPDFManager.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // 验证用户权限
    if (task.userId !== req.session.userId && req.session.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      task: {
        id: task.id,
        type: task.type,
        status: task.status === 'completed' ? 'generated' : task.status, // 将completed状态映射为generated
        progress: task.progress,
        error: task.error,
        createdAt: task.createdAt,
        finishedAt: task.finishedAt
      }
    });

  } catch (error) {
    console.error('PDF status check error:', error);
    res.status(500).json({
      success: false,
      message: `Error checking PDF status: ${error.message}`
    });
  }
});

// 第三步：下载完成的PDF
router.get('/download_pdf/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = asyncPDFManager.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // 验证用户权限
    if (task.userId !== req.session.userId && req.session.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `PDF not ready. Status: ${task.status}`,
        task: {
          status: task.status,
          progress: task.progress,
          error: task.error
        }
      });
    }

    const pdfBuffer = await asyncPDFManager.getPDFFile(taskId);
    if (!pdfBuffer) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found'
      });
    }

    // 根据任务类型设置文件名
    let filename;
    switch (task.type) {
      case 'receipt':
        filename = `ICPADS2025_Receipt_${task.submissionId}.pdf`;
        break;
      case 'confirmation-letter':
        filename = `ICPADS2025_Confirmation_${task.submissionId}.pdf`;
        break;
      case 'registration-info':
        filename = `ICPADS2025_Registration_${task.submissionId}.pdf`;
        break;
      default:
        filename = `ICPADS2025_Document_${task.submissionId}.pdf`;
    }

    // 发送PDF文件
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // 监听响应完成事件，下载完成后标记任务为已下载并清理
    res.on('finish', async () => {
      try {
        // 标记任务为已下载状态，并通知前端
        await asyncPDFManager.markTaskAsDownloaded(taskId);
        console.log(`📥 PDF下载完成，已标记为下载状态: ${taskId}`);
        
        // 延迟清理任务记录，给前端时间同步状态
        setTimeout(async () => {
          try {
            await asyncPDFManager.cleanupTask(taskId);
            console.log(`🗑️ 已清理下载任务记录: ${taskId}`);
          } catch (error) {
            console.error(`清理下载任务记录失败: ${error.message}`);
          }
        }, 5000); // 5秒后清理
      } catch (error) {
        console.error(`处理下载完成逻辑失败: ${error.message}`);
      }
    });
    
    res.end(pdfBuffer, 'binary');

  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({
      success: false,
      message: `Error downloading PDF: ${error.message}`
    });
  }
});

// 异步生成确认函PDF
router.post('/generate_confirmation', pdfDownloadLimiter, memoryMonitor, requireAuth, async (req, res) => {
  try {
    // Find approved submission for user
    const submission = await RegistrationSubmission.findOne({
      where: {
        userId: req.session.userId,
        status: 'approved'
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'No approved registration found'
      });
    }

    // 解析PDF选项
    const marginMode = req.body.marginMode || 'standard';
    let pdfOptions = {};
    
    switch (marginMode) {
      case 'minimal':
        pdfOptions = {
          margin: {
            top: '2mm',
            bottom: '2mm',
            left: '2mm', 
            right: '2mm'
          }
        };
        break;
      case 'none':
        pdfOptions = {
          margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm'
          }
        };
        break;
      default: // 'standard'
        pdfOptions = {
          margin: {
            top: '5mm',
            bottom: '5mm',
            left: '5mm',
            right: '5mm'
          }
        };
    }

    // 开始异步PDF生成
    const result = await asyncPDFManager.startPDFGeneration('confirmation-letter', submission, pdfOptions);

    // 检查是否是重复任务
    if (result.error) {
      return res.status(409).json({
        success: false,
        ...result
      });
    }

    res.json({
      success: true,
      taskId: result,
      message: 'Confirmation letter generation started'
    });

  } catch (error) {
    console.error('Confirmation generation start error:', error);
    res.status(500).json({
      success: false,
      message: `Error starting confirmation generation: ${error.message}`
    });
  }
});

// 异步生成注册信息PDF
router.post('/generate_registration', pdfDownloadLimiter, memoryMonitor, requireAuth, async (req, res) => {
  try {
    // Find approved submission for user
    const submission = await RegistrationSubmission.findOne({
      where: {
        userId: req.session.userId,
        status: 'approved'
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'No approved registration found'
      });
    }

    // 解析PDF选项
    const marginMode = req.body.marginMode || 'standard';
    let pdfOptions = {};
    
    switch (marginMode) {
      case 'minimal':
        pdfOptions = {
          margin: {
            top: '2mm',
            bottom: '2mm',
            left: '2mm', 
            right: '2mm'
          }
        };
        break;
      case 'none':
        pdfOptions = {
          margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm'
          }
        };
        break;
      default: // 'standard'
        pdfOptions = {
          margin: {
            top: '5mm',
            bottom: '5mm',
            left: '5mm',
            right: '5mm'
          }
        };
    }

    // 开始异步PDF生成
    const result = await asyncPDFManager.startPDFGeneration('registration-info', submission, pdfOptions);

    // 检查是否是重复任务
    if (result.error) {
      return res.status(409).json({
        success: false,
        ...result
      });
    }

    res.json({
      success: true,
      taskId: result,
      message: 'Registration info generation started'
    });

  } catch (error) {
    console.error('Registration info generation start error:', error);
    res.status(500).json({
      success: false,
      message: `Error starting registration info generation: ${error.message}`
    });
  }
});

// Get submission statistics (admin only)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.session.user.role !== 'admin' && !req.session.user.is_superuser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await RegistrationSubmission.getStats();
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get uploaded images for a submission
router.get('/get-images/:submissionId', requireAuth, async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    const userId = req.session.userId; // 修正字段名

    // Find the submission and verify ownership
    const submission = await RegistrationSubmission.findOne({
      where: { 
        id: submissionId,
        userId: userId // 修正字段名
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const images = {};
    
    // Check if screenshot exists
    if (submission.screenshot) {
      const screenshotPath = submission.screenshot;
      const fullPath = path.join(__dirname, '../../uploads', screenshotPath);
      
      if (fs.existsSync(fullPath)) {
        images.screenshot = `/uploads/${screenshotPath}`;
      }
    }
    
    // Check if proof file exists
    if (submission.proof) {
      const proofPath = submission.proof;
      const fullPath = path.join(__dirname, '../../uploads', proofPath);
      
      if (fs.existsSync(fullPath)) {
        images.proof = `/uploads/${proofPath}`;
      }
    }

    res.json({
      success: true,
      images: images
    });

  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get refund history
router.get('/refund-history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const refundHistory = await RefundRequest.getUserRefundHistory(userId);

    const formattedHistory = refundHistory.map(refund => ({
      id: refund.id,
      registrationId: refund.registrationId,
      registration: {
        id: refund.registration.id,
        name: refund.registration.name,
        email: refund.registration.email,
        productCode: refund.registration.product_code,
        productPrice: refund.registration.product_price,
        submissionTime: refund.registration.submission_time
      },
      reason: refund.reason,
      refundAmount: refund.refundAmount,
      bankInfo: refund.bankInfo,
      requestTime: refund.requestTime,
      status: refund.status,
      processTime: refund.processTime,
      adminNotes: refund.adminNotes,
      refundMethod: refund.refundMethod,
      transactionId: refund.transactionId,
      processor: refund.processor ? {
        name: refund.processor.fullname,
        email: refund.processor.email
      } : null
    }));

    res.json({
      success: true,
      data: formattedHistory
    });
  } catch (error) {
    console.error('Get refund history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check refund eligibility
router.get('/refund-eligibility/:registrationId', requireAuth, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const userId = req.session.userId;

    const eligibilityCheck = await RefundRequest.checkRefundEligibility(userId, registrationId);
    
    res.json({
      success: true,
      data: eligibilityCheck
    });
  } catch (error) {
    console.error('Check refund eligibility error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Submit refund request
router.post('/refund-request', requireAuth, [
  body('registrationId').isInt().withMessage('Registration ID must be a valid integer'),
  body('reason').isLength({ min: 10, max: 1000 }).withMessage('Reason must be between 10 and 1000 characters'),
  body('bankInfo.accountName').optional().isLength({ min: 2, max: 100 }).withMessage('Account name must be between 2 and 100 characters'),
  body('bankInfo.bankName').optional().isLength({ min: 2, max: 100 }).withMessage('Bank name must be between 2 and 100 characters'),
  body('bankInfo.accountNumber').optional().isLength({ min: 5, max: 50 }).withMessage('Account number must be between 5 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { registrationId, reason, bankInfo } = req.body;
    const userId = req.session.userId;

    // 检查退款资格
    const eligibilityCheck = await RefundRequest.checkRefundEligibility(userId, registrationId);
    if (!eligibilityCheck.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibilityCheck.reason
      });
    }

    // 创建退款申请
    const refundRequest = await RefundRequest.create({
      registrationId: parseInt(registrationId),
      userId: userId,
      reason: reason,
      refundAmount: eligibilityCheck.registration.product_price,
      bankInfo: bankInfo || null,
      requestTime: new Date()
    });

    res.json({
      success: true,
      data: {
        id: refundRequest.id,
        message: 'Refund request submitted successfully'
      }
    });
  } catch (error) {
    console.error('Submit refund request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// SSE endpoint for real-time PDF generation notifications
router.get('/pdf_notifications', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const connectionId = req.query.connectionId || 'unknown';
  
  console.log(`📡 新的SSE连接请求 - 用户ID: ${userId}, 连接ID: ${connectionId}`);
  
  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 发送初始连接消息
  res.write(`event: connected\ndata: ${JSON.stringify({ 
    userId: userId, 
    connectionId: connectionId,
    timestamp: Date.now() 
  })}\n\n`);

  // 添加客户端到通知服务
  pdfNotificationService.addClient(userId, res, connectionId);

  console.log(`📡 SSE连接建立 - 用户ID: ${userId}, 连接ID: ${connectionId}`);

  // 监听连接关闭事件
  req.on('close', () => {
    console.log(`🔌 SSE连接断开 (req.close) - 用户ID: ${userId}, 连接ID: ${connectionId}`);
    pdfNotificationService.removeClient(userId, res);
  });

  req.on('end', () => {
    console.log(`🔚 SSE连接结束 (req.end) - 用户ID: ${userId}, 连接ID: ${connectionId}`);
    pdfNotificationService.removeClient(userId, res);
  });

  // 监听响应对象的finish事件
  res.on('finish', () => {
    console.log(`✅ SSE响应完成 (res.finish) - 用户ID: ${userId}, 连接ID: ${connectionId}`);
    pdfNotificationService.removeClient(userId, res);
  });

  res.on('close', () => {
    console.log(`🔻 SSE响应关闭 (res.close) - 用户ID: ${userId}, 连接ID: ${connectionId}`);
    pdfNotificationService.removeClient(userId, res);
  });
});

/**
 * 获取用户的所有pending任务
 */
router.get('/pending_tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // 从asyncPDFManager获取该用户的所有任务
    const userTasks = asyncPDFManager.getUserTasks(userId);
    
    // 过滤出pending、processing和completed状态的任务
    const pendingTasks = userTasks.filter(task => 
      task.status === 'pending' || 
      task.status === 'processing' || 
      task.status === 'completed'
    );
    
    console.log(`📋 用户 ${userId} 的待处理任务:`, pendingTasks.length);
    
    res.json({
      success: true,
      message: '成功获取pending任务',
      data: {
        tasks: pendingTasks.map(task => ({
          taskId: task.id,
          type: task.type,
          status: task.status === 'completed' ? 'generated' : task.status, // 将completed状态映射为generated
          progress: task.progress,
          createdAt: task.createdAt,
          submissionId: task.submissionId
        }))
      }
    });
    
  } catch (error) {
    console.error('获取pending任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取pending任务失败',
      error: error.message
    });
  }
});

module.exports = router;
