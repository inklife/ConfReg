const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { InvoiceRequest, InvoiceFile, RegistrationSubmission, User } = require('../models');
const { requireAuth } = require('../middleware/auth');

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `invoice_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    // 允许的文件类型：PDF, JPG, PNG
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传PDF、JPG或PNG格式的文件'));
    }
  }
});

// 用户提交发票申请
router.post('/request', requireAuth, async (req, res) => {
  try {
    const {
      registrationId,
      invoiceType,
      invoiceCategory,
      invoiceTitle,
      taxNumber,
      bankName,
      bankAccount,
      registeredAddress,
      registeredPhone,
      mailingAddress,
      recipient,
      recipientPhone,
      notes,
      content,
      registrationSystemNo,
      contactName,
      contactPhone,
      contactEmail,
      invoiceAmount,
      invoiceCurrency
    } = req.body;

    // 验证注册记录是否存在且属于当前用户
    const registration = await RegistrationSubmission.findOne({
      where: {
        id: registrationId,
        userId: req.session.userId
      }
    });

    if (!registration) {
      return res.status(404).json({
        error: '注册记录不存在或不属于当前用户'
      });
    }

    // 检查注册是否已退款
    if (registration.is_refunded) {
      return res.status(400).json({
        error: 'Cannot request invoice for refunded registration / 已退款的注册无法申请发票'
      });
    }

    // 检查是否已有待处理的发票申请
    const existingPendingRequest = await InvoiceRequest.findOne({
      where: {
        registrationId: registrationId,
        status: ['pending', 'processing']
      }
    });

    if (existingPendingRequest) {
      return res.status(400).json({
        error: '该注册记录已有待处理的发票申请',
        existingRequestId: existingPendingRequest.id,
        existingStatus: existingPendingRequest.status
      });
    }

    // 检查是否已有完成的发票申请（这种情况需要冲红原发票）
    const existingCompletedRequest = await InvoiceRequest.findOne({
      where: {
        registrationId: registrationId,
        status: 'completed'
      }
    });

    // 如果有已完成的申请，返回警告信息（但允许提交）
    const warningInfo = existingCompletedRequest ? {
      hasCompletedInvoice: true,
      completedRequestId: existingCompletedRequest.id,
      warningMessage: '此注册已有已开具的发票，再次申请需要管理员冲红原发票。This registration already has a completed invoice, re-applying requires red-inking the original invoice.'
    } : null;

    // 验证开票金额
    if (!invoiceAmount || invoiceAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid invoice amount / 无效的开票金额'
      });
    }

    // 验证开票金额不超过注册记录的金额
    const maxAmount = invoiceCurrency === 'RMB' 
      ? registration.total_amount_rmb 
      : (registration.total_amount_usd || registration.product_price);
    
    if (invoiceAmount > maxAmount) {
      return res.status(400).json({
        error: `Invoice amount cannot exceed ${invoiceCurrency === 'RMB' ? '¥' : '$'}${maxAmount} / 开票金额不能超过 ${invoiceCurrency === 'RMB' ? '¥' : '$'}${maxAmount}`
      });
    }

    // 创建发票申请
    const invoiceRequest = await InvoiceRequest.create({
      userId: req.session.userId,
      registrationId: registrationId,
      invoiceType: invoiceType || 'electronic',
      invoiceCategory: invoiceCategory || 'normal',
      invoiceTitle,
      taxNumber,
      bankName,
      bankAccount,
      registeredAddress,
      registeredPhone,
      mailingAddress,
      recipient,
      recipientPhone,
      notes,
      content,
      registrationSystemNo,
      contactName,
      contactPhone,
      contactEmail,
      invoiceAmount: invoiceAmount,
      invoiceCurrency: invoiceCurrency || 'RMB', // 默认人民币
      status: 'pending',
      amount: registration.product_price
    });

    res.json({
      success: true,
      message: 'Invoice request submitted successfully',
      invoiceRequest: {
        id: invoiceRequest.id,
        status: invoiceRequest.status,
        requestedAt: invoiceRequest.requestedAt
      },
      warning: warningInfo // 如果有已完成的申请，返回警告信息
    });

  } catch (error) {
    console.error('Invoice request submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'Invoice request submission failed',
      details: error.message
    });
  }
});

// 获取用户的发票申请列表
router.get('/my-requests', requireAuth, async (req, res) => {
  try {
    const requests = await InvoiceRequest.findAll({
      where: {
        userId: req.session.userId
      },
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration',
          attributes: ['id', 'name', 'product_code', 'product_price', 'submission_time']
        }
      ],
      order: [
        ['requestedAt', 'DESC']
      ]
    });

    // 只有completed状态的申请才显示文件列表
    const processedRequests = await Promise.all(requests.map(async (request) => {
      if (request.status === 'completed') {
        // 只有完成状态才查询文件
        const files = await InvoiceFile.findAll({
          where: { invoiceRequestId: request.id },
          attributes: ['id', 'originalName', 'uploadedAt', 'displayOrder'],
          order: [['displayOrder', 'ASC'], ['uploadedAt', 'ASC']]
        });
        request.dataValues.files = files;
      } else {
        request.dataValues.files = [];
      }
      return request;
    }));

    res.json({
      requests: processedRequests
    });

  } catch (error) {
    console.error('获取发票申请列表失败:', error);
    res.status(500).json({
      error: 'Failed to obtain invoice application list',
      details: error.message
    });
  }
});

// 获取发票申请详情
router.get('/request/:id', requireAuth, async (req, res) => {
  try {
    const request = await InvoiceRequest.findOne({
      where: {
        id: req.params.id,
        userId: req.session.userId
      },
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration',
          attributes: ['id', 'name', 'product_code', 'product_price', 'submission_time']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        error: '发票申请不存在'
      });
    }

    // 只有当状态为completed时，才查询并返回文件列表
    if (request.status === 'completed') {
      const files = await InvoiceFile.findAll({
        where: { invoiceRequestId: request.id },
        attributes: ['id', 'originalName', 'fileName', 'uploadedAt', 'displayOrder'],
        order: [['displayOrder', 'ASC'], ['uploadedAt', 'ASC']]
      });
      request.dataValues.files = files;
    } else {
      request.dataValues.files = [];
    }

    res.json({
      request: request
    });

  } catch (error) {
    console.error('获取发票申请详情失败:', error);
    res.status(500).json({
      error: '获取发票申请详情失败',
      details: error.message
    });
  }
});

// 下载发票文件
router.get('/download/:fileId', requireAuth, async (req, res) => {
  try {
    const file = await InvoiceFile.findOne({
      where: {
        id: req.params.fileId
      },
      include: [
        {
          model: InvoiceRequest,
          as: 'invoiceRequest',
          where: {
            userId: req.session.userId
          }
        }
      ]
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found or access denied'
      });
    }

    // 只有当发票申请状态为completed时，用户才能下载文件
    if (file.invoiceRequest.status !== 'completed') {
      return res.status(403).json({
        error: 'Invoice request not yet approved, unable to download files'
      });
    }

    const filePath = file.filePath;
    // 构建绝对路径
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(__dirname, '../..', filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        error: 'File has been deleted'
      });
    }

    // 处理中文文件名编码
    const fileName = file.originalName;
    const encodedFileName = encodeURIComponent(fileName);
    
    // 设置 Content-Disposition 头部，使用 RFC 5987 标准支持中文文件名
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Type', file.mimeType);
    res.sendFile(path.resolve(absolutePath));

  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({
      error: 'File download failed',
      details: error.message
    });
  }
});

// 获取用户的注册记录（用于发票申请）
router.get('/registrations', requireAuth, async (req, res) => {
  try {
    const registrations = await RegistrationSubmission.findAll({
      where: {
        userId: req.session.userId,
        status: 'approved', // 只有已批准的注册才能申请发票
        is_refunded: false // 过滤掉已退款的注册
      },
      attributes: [
        'id', 
        'name', 
        'product_code', 
        'product_price',
        'product_price_rmb',
        'total_amount_usd',
        'total_amount_rmb',
        'extra_page_fee_usd',
        'extra_page_fee_rmb',
        'payment_method',
        'registration_category',
        'submission_time',
        'status',
        'is_refunded'
      ],
      include: [
        {
          model: InvoiceRequest,
          as: 'invoiceRequests',
          attributes: ['id', 'status', 'requestedAt'],
          required: false
        }
      ],
      order: [
        ['submission_time', 'DESC']
      ]
    });

    // 为每个发票申请查询文件：只有completed状态的才查询文件
    const processedRegistrations = await Promise.all(registrations.map(async (registration) => {
      if (registration.invoiceRequests) {
        const processedRequests = await Promise.all(registration.invoiceRequests.map(async (request) => {
          if (request.status === 'completed') {
            const files = await InvoiceFile.findAll({
              where: { invoiceRequestId: request.id },
              attributes: ['id', 'originalName', 'uploadedAt', 'displayOrder'],
              order: [['displayOrder', 'ASC'], ['uploadedAt', 'ASC']]
            });
            request.dataValues.files = files;
          } else {
            request.dataValues.files = [];
          }
          return request;
        }));
        registration.dataValues.invoiceRequests = processedRequests;
      }
      return registration;
    }));

    res.json({
      registrations: processedRegistrations
    });

  } catch (error) {
    console.error('获取注册记录失败:', error);
    res.status(500).json({
      error: '获取注册记录失败',
      details: error.message
    });
  }
});

// 取消发票申请
router.delete('/request/:id', requireAuth, async (req, res) => {
  try {
    const request = await InvoiceRequest.findOne({
      where: {
        id: req.params.id,
        userId: req.session.userId,
        status: 'pending' // 只有待处理的申请才能取消
      }
    });

    if (!request) {
      return res.status(404).json({
        error: '发票申请不存在或无法取消'
      });
    }

    await request.destroy();

    res.json({
      message: '发票申请已取消'
    });

  } catch (error) {
    console.error('取消发票申请失败:', error);
    res.status(500).json({
      error: '取消发票申请失败',
      details: error.message
    });
  }
});

module.exports = router;
