const express = require('express');
const User = require('../models/User');
const { RegistrationSubmission, AttendeeTransfer, RefundRequest } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const emailVerificationCache = require('../utils/cache/emailVerificationCache');
const emailService = require('../utils/emailService');
const { validateUsername, generateUsernameSuggestions } = require('../utils/usernameValidator');
const { getSaltRounds } = require('../config/crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 配置转让手续费支付截图上传
const transferUploadDir = path.join(__dirname, '../../uploads/transfers');

// 确保上传目录存在
const ensureTransferUploadDir = async () => {
  try {
    await fs.access(transferUploadDir);
  } catch {
    await fs.mkdir(transferUploadDir, { recursive: true });
  }
};

const transferStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    await ensureTransferUploadDir();
    cb(null, transferUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `transfer_fee_${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const transferUpload = multer({
  storage: transferStorage,
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

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { fullname, firstName, lastName, affiliation, phone } = req.body;
    
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided (excluding email for security reasons)
    if (fullname) user.fullname = fullname.trim();
    if (firstName !== undefined) user.first_name = firstName.trim();
    if (lastName !== undefined) user.last_name = lastName.trim();
    if (affiliation !== undefined) user.affiliation = affiliation.trim();
    if (phone !== undefined) user.phone = phone.trim();
    
    await user.save();

    // Update session data
    if (user.fullname) req.session.user.fullname = user.fullname;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Change password
router.put('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = getSaltRounds();
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database directly to avoid triggering model hooks
    await user.sequelize.query(
      'UPDATE backend_userinfo SET password = ? WHERE id = ?',
      {
        replacements: [hashedPassword, user.id],
        type: user.sequelize.QueryTypes.UPDATE
      }
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Change attendee information for registration
router.post('/transfer-registration', requireAuth, transferUpload.single('feePaymentScreenshot'), async (req, res) => {
  try {
    const { registrationId, newAttendee: newAttendeeStr, reason, feePaymentMethod } = req.body;
    
    // 验证必填字段
    if (!registrationId || !newAttendeeStr || !reason || !feePaymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // 验证支付截图
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot is required'
      });
    }

    // 解析JSON字符串
    let newAttendee;
    try {
      newAttendee = JSON.parse(newAttendeeStr);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid newAttendee data format'
      });
    }

    // 验证newAttendee字段
    if (!newAttendee.name || !newAttendee.email) {
      return res.status(400).json({
        success: false,
        message: 'New attendee name and email are required'
      });
    }

    // 验证email格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAttendee.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // 验证支付方式
    if (!['international', 'domestic'].includes(feePaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }
    
    // Check if the specified registration exists and belongs to the user
    const submission = await RegistrationSubmission.findOne({
      where: { 
        id: registrationId,
        userId: req.session.userId,
        status: 'approved'
      }
    });

    if (!submission) {
      return res.status(400).json({
        success: false,
        message: 'Specified registration not found or not approved'
      });
    }

    // 方案A: 检查是否已存在任何签转记录（pending 或 approved）
    // 每个注册只允许签转一次
    const existingTransfer = await AttendeeTransfer.findOne({
      where: {
        registrationId: submission.id,
        status: ['pending', 'approved']
      }
    });

    if (existingTransfer) {
      let message = 'This registration has already been transferred and cannot be transferred again';
      if (existingTransfer.status === 'pending') {
        message = 'There is already a pending attendee transfer request for this registration';
      } else if (existingTransfer.status === 'approved') {
        message = 'This registration has already been transferred and cannot be transferred again';
      }
      
      return res.status(400).json({
        success: false,
        message: message,
        existingTransfer: {
          status: existingTransfer.status,
          requestTime: existingTransfer.requestTime,
          processTime: existingTransfer.processTime,
          newAttendee: existingTransfer.newAttendee
        }
      });
    }

    // Store original attendee information
    const originalAttendee = {
      name: submission.name,
      email: submission.email,
      phone: submission.phone || '',
      affiliation: submission.affiliation || ''
    };

    // 计算手续费金额
    const feeAmountUsd = 100.00;
    const feeAmountRmb = 750.00;

    // Create transfer record
    const transfer = await AttendeeTransfer.create({
      registrationId: submission.id,
      originalAttendee,
      newAttendee: {
        name: newAttendee.name,
        email: newAttendee.email,
        phone: newAttendee.phone || '',
        affiliation: newAttendee.affiliation || ''
      },
      reason,
      requestedBy: req.session.userId,
      status: 'pending',
      feeAmountUsd,
      feeAmountRmb,
      feePaymentMethod,
      feePaymentScreenshot: req.file ? `transfers/${req.file.filename}` : null
    });

    res.json({
      success: true,
      message: 'Attendee change request submitted successfully. Please wait for admin approval.',
      data: {
        transferId: transfer.id,
        registrationId: submission.id,
        originalAttendee,
        newAttendee: {
          name: newAttendee.name,
          email: newAttendee.email,
          phone: newAttendee.phone || '',
          affiliation: newAttendee.affiliation || ''
        },
        feePaymentMethod,
        feeAmountUsd,
        feeAmountRmb,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Transfer registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get transfer history
router.get('/transfer-history', requireAuth, async (req, res) => {
  try {
    // Get all transfers for user's registrations
    const userSubmissions = await RegistrationSubmission.findAll({
      where: { userId: req.session.userId },
      attributes: ['id']
    });

    const submissionIds = userSubmissions.map(sub => sub.id);

    const transfers = await AttendeeTransfer.findAll({
      where: { registrationId: submissionIds },
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration',
          attributes: ['id', 'name', 'email', 'status', 'submission_time']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['fullname', 'email'],
          required: false
        }
      ],
      order: [['requestTime', 'DESC']]
    });

    const transferHistory = transfers.map(transfer => ({
      id: transfer.id,
      registrationId: transfer.registrationId,
      currentRegistration: {
        id: transfer.registration.id,
        currentName: transfer.registration.name,
        currentEmail: transfer.registration.email,
        status: transfer.registration.status,
        submissionTime: transfer.registration.submission_time
      },
      originalAttendee: transfer.originalAttendee,
      newAttendee: transfer.newAttendee,
      reason: transfer.reason,
      transferStatus: transfer.status,
      feePaymentMethod: transfer.feePaymentMethod,
      feeAmountUsd: transfer.feeAmountUsd,
      feeAmountRmb: transfer.feeAmountRmb,
      feePaymentScreenshot: transfer.feePaymentScreenshot,
      requestTime: transfer.requestTime,
      processTime: transfer.processTime,
      processor: transfer.processor ? {
        name: transfer.processor.fullname,
        email: transfer.processor.email
      } : null,
      adminNotes: transfer.adminNotes
    }));

    res.json({
      success: true,
      data: transferHistory
    });

  } catch (error) {
    console.error('Transfer history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check if user can request attendee change (supports multiple registrations)
router.get('/transfer-status', requireAuth, async (req, res) => {
  try {
    // Get all approved registrations for the user
    const approvedRegistrations = await RegistrationSubmission.findAll({
      where: { 
        userId: req.session.userId,
        status: 'approved'
      },
      attributes: [
        'id', 'name', 'email', 'phone', 'affiliation', 'product_code', 
        'submission_time', 'paper_id', 'payment_method', 
        'paper_pages',
        'product_price', 'product_price_rmb',
        'total_amount_usd', 'total_amount_rmb',
        'extra_page_fee_usd', 'extra_page_fee_rmb',
        'is_refunded'
      ],
      order: [['submission_time', 'DESC']]
    });

    if (!approvedRegistrations || approvedRegistrations.length === 0) {
      return res.json({
        success: true,
        data: {
          hasApprovedRegistration: false,
          approvedRegistrations: [],
          message: 'No approved registration found'
        }
      });
    }

    // Get all transfer requests for these registrations (any status)
    // 方案A: 禁止重复签转 - 检查所有状态的签转记录
    const registrationIds = approvedRegistrations.map(reg => reg.id);
    const allTransfers = await AttendeeTransfer.findAll({
      where: {
        registrationId: registrationIds
      },
      order: [['requestTime', 'DESC']]
    });

    // Create maps for different transfer statuses
    const transfersByRegistration = {};
    allTransfers.forEach(transfer => {
      if (!transfersByRegistration[transfer.registrationId]) {
        transfersByRegistration[transfer.registrationId] = [];
      }
      transfersByRegistration[transfer.registrationId].push(transfer);
    });

    // For each registration, determine if it can be transferred
    // canTransfer = false if there's any approved or pending transfer OR if the registration is refunded
    const transferStatusMap = {};
    Object.keys(transfersByRegistration).forEach(regId => {
      const transfers = transfersByRegistration[regId];
      const approvedTransfer = transfers.find(t => t.status === 'approved');
      const pendingTransfer = transfers.find(t => t.status === 'pending');
      
      // Find the registration to check if it's refunded
      const registration = approvedRegistrations.find(reg => reg.id == regId);
      const isRefunded = registration ? registration.is_refunded : false;
      
      transferStatusMap[regId] = {
        canTransfer: !approvedTransfer && !pendingTransfer && !isRefunded,
        latestTransfer: transfers[0], // Most recent transfer
        approvedTransfer: approvedTransfer || null,
        pendingTransfer: pendingTransfer || null,
        isRefunded: isRefunded
      };
    });

    // Build registration list with transfer status
    const registrationsWithStatus = approvedRegistrations.map(reg => {
      const transferStatus = transferStatusMap[reg.id] || { 
        canTransfer: !reg.is_refunded, // If no transfer records, check refund status
        latestTransfer: null, 
        approvedTransfer: null, 
        pendingTransfer: null,
        isRefunded: reg.is_refunded
      };
      
      return {
        id: reg.id,
        name: reg.name,
        email: reg.email,
        phone: reg.phone,
        affiliation: reg.affiliation,
        productCode: reg.product_code,
        productPriceUsd: reg.product_price,
        productPriceRmb: reg.product_price_rmb,
        totalAmountUsd: reg.total_amount_usd,
        totalAmountRmb: reg.total_amount_rmb,
        extraPageFeeUsd: reg.extra_page_fee_usd || 0,
        extraPageFeeRmb: reg.extra_page_fee_rmb || 0,
        paperPages: reg.paper_pages || 0,
        submissionTime: reg.submission_time,
        paperId: reg.paper_id,
        paymentMethod: reg.payment_method,
        isRefunded: reg.is_refunded || false,
        canTransfer: transferStatus.canTransfer,
        pendingTransfer: transferStatus.pendingTransfer ? {
          id: transferStatus.pendingTransfer.id,
          requestTime: transferStatus.pendingTransfer.requestTime,
          newAttendee: transferStatus.pendingTransfer.newAttendee,
          reason: transferStatus.pendingTransfer.reason
        } : null,
        approvedTransfer: transferStatus.approvedTransfer ? {
          id: transferStatus.approvedTransfer.id,
          requestTime: transferStatus.approvedTransfer.requestTime,
          processTime: transferStatus.approvedTransfer.processTime,
          newAttendee: transferStatus.approvedTransfer.newAttendee,
          originalAttendee: transferStatus.approvedTransfer.originalAttendee,
          reason: transferStatus.approvedTransfer.reason
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        hasApprovedRegistration: true,
        approvedRegistrations: registrationsWithStatus,
        totalCount: registrationsWithStatus.length,
        canTransferCount: registrationsWithStatus.filter(r => r.canTransfer).length,
        pendingCount: registrationsWithStatus.filter(r => r.pendingTransfer !== null).length,
        approvedCount: registrationsWithStatus.filter(r => r.approvedTransfer !== null).length
      }
    });

  } catch (error) {
    console.error('Transfer status error:', error);
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

// Get user's refund history
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

// Get user's approved registrations (for refund eligibility)
router.get('/approved-registrations', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // 可选参数：是否排除已退款的注册，默认为false（不排除）
    const excludeRefunded = req.query.excludeRefunded === 'true';
    
    const whereCondition = {
      userId: userId,
      status: 'approved'
    };
    
    // 如果需要排除已退款的注册，添加条件
    if (excludeRefunded) {
      whereCondition.is_refunded = false;
    }
    
    const approvedRegistrations = await RegistrationSubmission.findAll({
      where: whereCondition,
      attributes: [
        'id', 'name', 'email', 'product_code', 'product_price', 'product_price_rmb',
        'total_amount_usd', 'total_amount_rmb', 'payment_method',
        'submission_time', 'review_time', 'is_refunded', 'paper_id'  // 添加退款状态字段和paper_id
      ],
      order: [['submission_time', 'DESC']]
    });

    // 为每个注册检查退款资格
    const registrationsWithRefundStatus = await Promise.all(
      approvedRegistrations.map(async (registration) => {
        const eligibilityCheck = await RefundRequest.checkRefundEligibility(userId, registration.id);
        return {
          id: registration.id,
          name: registration.name,
          email: registration.email,
          productCode: registration.product_code,
          productPrice: registration.product_price,
          productPriceRMB: registration.product_price_rmb,
          totalAmountUSD: registration.total_amount_usd,
          totalAmountRMB: registration.total_amount_rmb,
          paymentMethod: registration.payment_method,
          submissionTime: registration.submission_time,
          reviewTime: registration.review_time,
          paper_id: registration.paper_id,
          isRefunded: registration.is_refunded, // 添加退款状态字段
          refundEligible: eligibilityCheck.eligible,
          refundIneligibleReason: eligibilityCheck.reason || null
        };
      })
    );

    res.json({
      success: true,
      data: registrationsWithRefundStatus
    });
  } catch (error) {
    console.error('Get approved registrations error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check if username can be updated (7-day restriction)
router.get('/username-update-status', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const now = new Date();
    const lastUpdated = user.username_last_updated;
    
    if (lastUpdated) {
      const daysSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 7) {
        const remainingDays = 7 - daysSinceUpdate;
        return res.json({
          success: true,
          data: {
            canUpdate: false,
            reason: `Username can only be changed once every 7 days. You can change it again in ${remainingDays} day(s).`,
            lastUpdated: lastUpdated,
            remainingDays: remainingDays
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        canUpdate: true,
        lastUpdated: lastUpdated
      }
    });
  } catch (error) {
    console.error('Check username update status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send verification code for username update
router.post('/send-username-verification', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can update username (7-day restriction)
    const now = new Date();
    const lastUpdated = user.username_last_updated;
    
    if (lastUpdated) {
      const daysSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 7) {
        const remainingDays = 7 - daysSinceUpdate;
        return res.status(400).json({
          success: false,
          message: `Username can only be changed once every 7 days. You can change it again in ${remainingDays} day(s).`
        });
      }
    }

    // Check email service status
    const emailStatus = emailService.getStatus();
    if (!emailStatus.configured || !emailStatus.connected) {
      return res.status(503).json({
        success: false,
        message: 'Email service unavailable'
      });
    }

    // Generate and store verification code
    const verificationCode = emailService.generateVerificationCode();
    const cacheKey = `username_update_${user.email}`;
    const cacheSuccess = emailVerificationCache.setVerificationCode(cacheKey, verificationCode, 15 * 60); // 15 minutes

    if (!cacheSuccess) {
      return res.status(500).json({
        success: false,
        message: 'Failed to store verification code'
      });
    }

    // Send verification email
    await emailService.sendVerificationEmailWithCode(
      user.email, 
      user.fullname || user.username, 
      verificationCode, 
      'username-update'
    );

    res.json({
      success: true,
      message: 'Verification code sent to your primary email address',
      data: {
        email: user.email,
        expiryMinutes: 15
      }
    });
  } catch (error) {
    console.error('Send username verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update username with email verification
router.put('/update-username', requireAuth, [
  body('newUsername')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Username must be between 3 and 150 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, underscore, dot and dash')
    .custom((value) => {
      if (value.includes(' ')) {
        throw new Error('Username cannot contain spaces');
      }
      if (value.includes('@')) {
        throw new Error('Username cannot contain @ symbol');
      }
      
      // 使用用户名验证器进行完整验证
      const validation = validateUsername(value);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]); // 返回第一个错误
      }
      
      return true;
    }),
  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { newUsername, verificationCode } = req.body;
    
    // 再次进行完整的用户名验证（防止绕过前端验证）
    const usernameValidation = validateUsername(newUsername);
    if (!usernameValidation.isValid) {
      const suggestions = generateUsernameSuggestions(newUsername);
      return res.status(400).json({
        success: false,
        message: 'Username validation failed',
        errors: usernameValidation.errors,
        suggestions: suggestions.length > 0 ? suggestions : null
      });
    }
    
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check 7-day restriction again
    const now = new Date();
    const lastUpdated = user.username_last_updated;
    
    if (lastUpdated) {
      const daysSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 7) {
        const remainingDays = 7 - daysSinceUpdate;
        return res.status(400).json({
          success: false,
          message: `Username can only be changed once every 7 days. You can change it again in ${remainingDays} day(s).`
        });
      }
    }

    // Verify the verification code
    const cacheKey = `username_update_${user.email}`;
    const verificationResult = emailVerificationCache.verifyCode(cacheKey, verificationCode);
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Check if new username is already taken
    const existingUser = await User.findOne({
      where: { 
        username: newUsername,
        id: { [require('sequelize').Op.ne]: user.id }
      }
    });

    if (existingUser) {
      const suggestions = generateUsernameSuggestions(newUsername);
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
        suggestions: suggestions.length > 0 ? suggestions : null
      });
    }

    // Update username and last updated time
    const oldUsername = user.username;
    user.username = newUsername;
    user.username_last_updated = now;
    await user.save();

    // Clear the verification code from cache
    emailVerificationCache.deleteVerificationCode(cacheKey);

    // Update session data
    if (req.session.user) {
      req.session.user.username = newUsername;
    }

    res.json({
      success: true,
      message: 'Username updated successfully',
      data: {
        oldUsername: oldUsername,
        newUsername: newUsername,
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get username suggestions API
router.post('/username-suggestions', [
  body('username')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('Username must be provided and not exceed 150 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username } = req.body;
    
    // 验证用户名
    const validation = validateUsername(username);
    const suggestions = generateUsernameSuggestions(username);
    
    // 检查建议的用户名是否已被占用
    const availableSuggestions = [];
    
    for (const suggestion of suggestions) {
      const existingUser = await User.findOne({
        where: { username: suggestion }
      });
      
      if (!existingUser) {
        availableSuggestions.push(suggestion);
      }
    }

    res.json({
      success: true,
      data: {
        originalUsername: username,
        isValid: validation.isValid,
        errors: validation.errors,
        suggestions: availableSuggestions
      }
    });
  } catch (error) {
    console.error('Get username suggestions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check username availability
router.post('/check-username', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Username must be between 3 and 150 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username } = req.body;
    
    // 验证用户名格式和敏感词
    const validation = validateUsername(username);
    if (!validation.isValid) {
      const suggestions = generateUsernameSuggestions(username);
      return res.json({
        success: true,
        data: {
          available: false,
          reason: 'validation_failed',
          errors: validation.errors,
          suggestions: suggestions
        }
      });
    }
    
    // 检查是否已被占用
    const existingUser = await User.findOne({
      where: { username: username }
    });
    
    if (existingUser) {
      const suggestions = generateUsernameSuggestions(username);
      return res.json({
        success: true,
        data: {
          available: false,
          reason: 'already_taken',
          message: 'Username is already taken',
          suggestions: suggestions
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        available: true,
        message: 'Username is available'
      }
    });
  } catch (error) {
    console.error('Check username availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
