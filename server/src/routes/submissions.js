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
    // Allow images and PDF files
    // screenshot field: only images
    // proof field: images or PDF
    if (file.fieldname === 'screenshot') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Payment screenshot must be an image file'), false);
      }
    } else if (file.fieldname === 'proof') {
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Proof file must be an image or PDF file'), false);
      }
    } else {
      // For other fields, allow images only
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
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

    let { 
      name, 
      phone = '', 
      affiliation = '', 
      paper_type,
      paper_id = '', 
      paper_pages = '', 
      productCode, 
      productPrice, 
      productPriceRMB = '',
      totalAmountUSD = '',
      totalAmountRMB = '',
      extraPageFeeUSD = '',
      extraPageFeeRMB = '',
      registrationCategory = 'full', 
      paymentMethod = 'international' 
    } = req.body;

    // 验证 paper_type 字段是否存在（拒绝老版本前端提交）
    if (paper_type === undefined || paper_type === null) {
      return res.status(400).json({
        status: 7,
        success: false,
        message: 'Paper Type field is required. If you cannot see this field on the form, please clear your browser cache or try using an incognito/private window, or switch to a different browser to access the latest version of the registration form.'
      });
    }

    // 修复：如果 registrationCategory 是字符串 "undefined" 或无效值，日志中警告但不强制修改
    if (!registrationCategory || registrationCategory === 'undefined' || !['full', 'attendee'].includes(registrationCategory)) {
      console.warn(`Invalid registration category received: "${registrationCategory}"`);
      // registrationCategory = 'full';
    }
    const email = currentUser.email; // 使用当前用户的email

    // Validate paper_pages format (must be numeric between 1-16 if provided)
    if (paper_pages && paper_pages.trim() !== '' && (!/^\d+$/.test(paper_pages.trim()) || parseInt(paper_pages) < 1 || parseInt(paper_pages) > 16)) {
      return res.status(400).json({
        status: 6,
        success: false,
        message: 'Paper pages must be a valid number'
      });
    }

    // Check for required files
    if (!req.files || !req.files.screenshot) {
      return res.status(400).json({
        status: 4,
        message: 'Please upload payment verification'
      });
    }

    const screenshot = req.files.screenshot[0];
    const proof = req.files.proof ? req.files.proof[0] : null;

    // Check if there's an edit mode ID in the request
    const editId = req.body.editId;
    let submission = null;

    if (editId) {
      // If editId is provided, find the specific submission to update
      submission = await RegistrationSubmission.findOne({ 
        where: { 
          id: editId,
          userId: req.session.userId 
        } 
      });
    }

    if (submission) {
      // Check if this registration has been refunded
      if (submission.is_refunded) {
        return res.status(400).json({
          status: 3,
          success: false,
          message: 'This registration has been refunded and cannot be modified.'
        });
      }
      
      // Update existing submission
      submission.name = name;
      submission.email = email;
      submission.phone = phone;
      submission.affiliation = affiliation;
      submission.paper_type = paper_type;
      submission.paper_id = paper_id;
      submission.paper_pages = paper_pages ? parseInt(paper_pages) : 0;
      submission.product_code = productCode;
      submission.product_price = parseFloat(productPrice);
      submission.product_price_rmb = productPriceRMB ? parseFloat(productPriceRMB) : null;
      submission.total_amount_usd = totalAmountUSD ? parseFloat(totalAmountUSD) : parseFloat(productPrice);
      submission.total_amount_rmb = totalAmountRMB ? parseFloat(totalAmountRMB) : (productPriceRMB ? parseFloat(productPriceRMB) : null);
      submission.extra_page_fee_usd = extraPageFeeUSD ? parseFloat(extraPageFeeUSD) : 0;
      submission.extra_page_fee_rmb = extraPageFeeRMB ? parseFloat(extraPageFeeRMB) : 0;
      submission.registration_category = registrationCategory;
      submission.payment_method = paymentMethod;
      
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
      // Always create new submission when no editId or submission not found
      submission = await RegistrationSubmission.create({
        userId: req.session.userId,
        name,
        email,
        phone,
        affiliation,
        paper_type,
        paper_id,
        paper_pages: paper_pages ? parseInt(paper_pages) : 0,
        product_code: productCode,
        product_price: parseFloat(productPrice),
        product_price_rmb: productPriceRMB ? parseFloat(productPriceRMB) : null,
        total_amount_usd: totalAmountUSD ? parseFloat(totalAmountUSD) : parseFloat(productPrice),
        total_amount_rmb: totalAmountRMB ? parseFloat(totalAmountRMB) : (productPriceRMB ? parseFloat(productPriceRMB) : null),
        extra_page_fee_usd: extraPageFeeUSD ? parseFloat(extraPageFeeUSD) : 0,
        extra_page_fee_rmb: extraPageFeeRMB ? parseFloat(extraPageFeeRMB) : 0,
        registration_category: registrationCategory,
        payment_method: paymentMethod,
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

// Get all user registrations
router.get('/user-registrations', requireAuth, async (req, res) => {
  try {
    console.log('=== Get User Registrations - 开始获取 ===');
    console.log('Session userId:', req.session.userId);
    
    // Get all submissions for user, ordered by submission time desc
    const userSubmissions = await RegistrationSubmission.findAll({ 
      where: { userId: req.session.userId },
      order: [['submission_time', 'DESC']]
    });

    console.log('查询到的用户注册记录数量:', userSubmissions.length);

    const registrations = userSubmissions.map(submission => {
      // 准备图片信息
      const images = {};
      if (submission.screenshot) {
        images.screenshot = `/uploads/${submission.screenshot}`;
      }
      if (submission.proof) {
        images.proof = `/uploads/${submission.proof}`;
      }

      return {
        id: submission.id,
        attendee_name: submission.name,
        attendee_email: submission.email,
        registration_type: submission.product_code,
        registration_category: submission.registration_category,
        payment_method: submission.payment_method,
        payment_amount: submission.product_price,
        created_at: submission.submission_time,
        status: submission.status,
        review_notes: submission.review_notes,
        review_time: submission.review_time,
        is_refunded: submission.is_refunded || false, // 添加退款状态
        registration_data: {
          name: submission.name,
          email: submission.email,
          phone: submission.phone,
          affiliation: submission.affiliation,
          paper_type: submission.paper_type,
          paper_id: submission.paper_id,
          paper_pages: submission.paper_pages,
          product_code: submission.product_code,
          product_price: submission.product_price,
          product_price_rmb: submission.product_price_rmb,
          total_amount_usd: submission.total_amount_usd,
          total_amount_rmb: submission.total_amount_rmb,
          extra_page_fee_usd: submission.extra_page_fee_usd,
          extra_page_fee_rmb: submission.extra_page_fee_rmb,
          registration_category: submission.registration_category,
          payment_method: submission.payment_method
        },
        images: images
      };
    });

    res.json({
      success: true,
      data: registrations
    });

  } catch (error) {
    console.error('Get user registrations error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
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
          status: latestSubmission.status,
          review_notes: latestSubmission.review_notes || null,
          review_time: latestSubmission.reviewed_at || null,
          registration_data: {
            name: latestSubmission.name,
            email: latestSubmission.email,
            phone: latestSubmission.phone,
            affiliation: latestSubmission.affiliation,
            paper_type: latestSubmission.paper_type,
            paper_id: latestSubmission.paper_id,
            paper_pages: latestSubmission.paper_pages,
            product_code: latestSubmission.product_code,
            product_price: latestSubmission.product_price,
            product_price_rmb: latestSubmission.product_price_rmb,
            total_amount_usd: latestSubmission.total_amount_usd,
            total_amount_rmb: latestSubmission.total_amount_rmb,
            extra_page_fee_usd: latestSubmission.extra_page_fee_usd,
            extra_page_fee_rmb: latestSubmission.extra_page_fee_rmb,
            registration_category: latestSubmission.registration_category,
            payment_method: latestSubmission.payment_method,
            is_refunded: latestSubmission.is_refunded
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
          status: latestSubmission.status,
          review_notes: latestSubmission.review_notes || null,
          review_time: latestSubmission.reviewed_at || null,
          registration_data: {
            name: latestSubmission.name,
            email: latestSubmission.email,
            phone: latestSubmission.phone,
            affiliation: latestSubmission.affiliation,
            paper_type: latestSubmission.paper_type,
            paper_id: latestSubmission.paper_id,
            paper_pages: latestSubmission.paper_pages,
            product_code: latestSubmission.product_code,
            product_price: latestSubmission.product_price,
            product_price_rmb: latestSubmission.product_price_rmb,
            total_amount_usd: latestSubmission.total_amount_usd,
            total_amount_rmb: latestSubmission.total_amount_rmb,
            extra_page_fee_usd: latestSubmission.extra_page_fee_usd,
            extra_page_fee_rmb: latestSubmission.extra_page_fee_rmb,
            registration_category: latestSubmission.registration_category,
            payment_method: latestSubmission.payment_method,
            is_refunded: latestSubmission.is_refunded
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
    // 构建查询条件
    const whereCondition = {
      userId: req.session.userId,
      status: 'approved',
      // 排除已退款的注册
      [require('sequelize').Op.or]: [
        { is_refunded: false },
        { is_refunded: null }
      ]
    };
    
    // 如果提供了 registrationId，则查询特定的注册记录
    if (req.body.registrationId) {
      whereCondition.id = req.body.registrationId;
    }
    
    // Find approved submission for user (最新的未退款的)
    const submission = await RegistrationSubmission.findOne({
      where: whereCondition,
      include: [{
        model: User,
        as: 'user'
      }],
      // 按提交时间降序排序，确保获取最新的注册记录
      order: [['submission_time', 'DESC']]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: req.body.registrationId 
          ? `No approved registration found with ID ${req.body.registrationId}` 
          : 'No approved registration found'
      });
    }

    // 检查是否已退款
    if (submission.is_refunded) {
      return res.status(403).json({
        success: false,
        message: 'Cannot generate receipt for refunded registration'
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
    // Find approved submission for user (最新的未退款的)
    const submission = await RegistrationSubmission.findOne({
      where: {
        userId: req.session.userId,
        status: 'approved',
        // 排除已退款的注册
        [require('sequelize').Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      },
      include: [{
        model: User,
        as: 'user'
      }],
      // 按提交时间降序排序，确保获取最新的注册记录
      order: [['submission_time', 'DESC']]
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
    // Find approved submission for user (最新的未退款的)
    const submission = await RegistrationSubmission.findOne({
      where: {
        userId: req.session.userId,
        status: 'approved',
        // 排除已退款的注册
        [require('sequelize').Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      },
      include: [{
        model: User,
        as: 'user'
      }],
      // 按提交时间降序排序，确保获取最新的注册记录
      order: [['submission_time', 'DESC']]
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
      refundCurrency: refund.refundCurrency || 'USD', // 添加货币字段
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
  // 银行类型
  body('bankInfo.bankType').optional({ checkFalsy: true }).isIn(['international', 'domestic', '']).withMessage('Bank type must be international or domestic'),
  // 通用字段 - 使用 custom 校验器，只在有实际内容时校验
  body('bankInfo.accountName').custom((value) => {
    // 跳过 undefined, null, 空字符串
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return true;
    }
    if (value.trim().length < 2 || value.trim().length > 100) {
      throw new Error('Account name must be between 2 and 100 characters');
    }
    return true;
  }),
  body('bankInfo.bankName').custom((value) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return true;
    }
    if (value.trim().length < 2 || value.trim().length > 100) {
      throw new Error('Bank name must be between 2 and 100 characters');
    }
    return true;
  }),
  body('bankInfo.accountNumber').custom((value) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return true;
    }
    if (value.trim().length < 5 || value.trim().length > 50) {
      throw new Error('Account number must be between 5 and 50 characters');
    }
    return true;
  }),
  // 国际银行字段
  body('bankInfo.beneficiaryAddress').custom((value) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return true;
    }
    if (value.trim().length < 10 || value.trim().length > 500) {
      throw new Error('Beneficiary address must be between 10 and 500 characters');
    }
    return true;
  }),
  body('bankInfo.country').custom((value) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return true;
    }
    if (value.trim().length < 2 || value.trim().length > 100) {
      throw new Error('Country must be between 2 and 100 characters');
    }
    return true;
  }),
  body('bankInfo.swiftCode').custom((value) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return true;
    }
    if (value.trim().length < 8 || value.trim().length > 11) {
      throw new Error('SWIFT code must be between 8 and 11 characters');
    }
    return true;
  }),
  body('bankInfo.bankAddress').custom((value) => {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return true;
    }
    if (value.trim().length < 10 || value.trim().length > 500) {
      throw new Error('Bank address must be between 10 and 500 characters');
    }
    return true;
  })
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

    // 确定退款金额和货币
    const registration = eligibilityCheck.registration;
    const isDomestic = registration.payment_method === 'domestic';
    const refundCurrency = isDomestic ? 'RMB' : 'USD';
    
    // 计算实际退款金额（已扣除手续费）
    const actualRefundAmount = eligibilityCheck.actualRefundAmount;
    
    // 创建退款申请
    const refundRequest = await RefundRequest.create({
      registrationId: parseInt(registrationId),
      userId: userId,
      reason: reason,
      refundAmount: actualRefundAmount,
      refundCurrency: refundCurrency,
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

// 通过ID获取指定的注册信息
router.get('/registration/:id', requireAuth, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const userId = req.session.userId;
    
    // 查找指定ID的注册记录，确保是当前用户的
    const registration = await RegistrationSubmission.findOne({
      where: {
        id: registrationId,
        userId: userId
      }
    });
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found or access denied'
      });
    }
    
    // 构造返回数据，格式与check-registration保持一致
    const responseData = {
      success: true,
      has_submission: true,
      approved: registration.status === 'approved',
      registration_id: registration.id,
      registration_data: {
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        affiliation: registration.affiliation,
        country: registration.country,
        product_code: registration.product_code,
        product_price: registration.product_price,
        product_price_rmb: registration.product_price_rmb,
        total_amount_usd: registration.total_amount_usd,
        total_amount_rmb: registration.total_amount_rmb,
        extra_page_fee_usd: registration.extra_page_fee_usd,
        extra_page_fee_rmb: registration.extra_page_fee_rmb,
        paper_type: registration.paper_type,
        paper_id: registration.paper_id,
        paper_pages: registration.paper_pages,
        payment_method: registration.payment_method,
        registration_category: registration.registration_category,
        is_refunded: registration.is_refunded
      },
      status: registration.status,
      review_notes: registration.review_notes || null,
      review_time: registration.reviewed_at || null,
      created_at: registration.created_at,
      updated_at: registration.updated_at
    };
    
    // 添加图片信息
    if (registration.proof_of_payment_image) {
      responseData.images = {
        screenshot: registration.proof_of_payment_image
      };
    }
    
    if (registration.ieee_membership_proof) {
      if (!responseData.images) responseData.images = {};
      responseData.images.proof = registration.ieee_membership_proof;
    }
    
    res.json(responseData);
    
  } catch (error) {
    console.error('获取注册详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取注册详情失败',
      error: error.message
    });
  }
});

// Generate extra banquet ticket PDF
router.post('/generate_meal_voucher', pdfDownloadLimiter, memoryMonitor, requireAuth, async (req, res) => {
  try {
    const { MealVoucher } = require('../models');
    
    // 构建查询条件
    const whereCondition = {
      userId: req.session.userId,
      status: 'approved'
    };
    
    // 如果提供了 voucherId，则查询特定的晚宴票记录
    if (req.body.voucherId) {
      whereCondition.id = req.body.voucherId;
    }
    
    // Find approved banquet ticket for user
    const mealVoucher = await MealVoucher.findOne({
      where: whereCondition,
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!mealVoucher) {
      return res.status(404).json({
        success: false,
        message: req.body.voucherId 
          ? `No approved banquet ticket found with ID ${req.body.voucherId}` 
          : 'No approved banquet ticket found'
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
    const result = await asyncPDFManager.startPDFGeneration('meal-voucher', mealVoucher, pdfOptions);

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
      message: 'Banquet ticket generation started'
    });

  } catch (error) {
    console.error('Banquet ticket generation start error:', error);
    res.status(500).json({
      success: false,
      message: `Error starting banquet ticket generation: ${error.message}`
    });
  }
});

module.exports = router;
