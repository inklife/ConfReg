/**
 * ICPADS 2025 邮箱验证路由
 * 提供邮箱验证、密码重置等邮件服务接口
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const emailService = require('../utils/emailService');
const emailVerificationCache = require('../utils/cache/emailVerificationCache');

const router = express.Router();

// 通用响应函数
const sendResponse = (res, message, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, message, status = 400, errors = null) => {
  return res.status(status).json({
    success: false,
    message,
    errors
  });
};

// 邮件发送频率限制
const emailRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 3, // 每分钟最多3次
  message: {
    success: false,
    message: 'Email sending too frequent, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 验证码验证频率限制
const verifyRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 10, // 每5分钟最多10次
  message: {
    success: false,
    message: 'Verification attempts too frequent, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/email/send-verification
 * @desc 发送邮箱验证码
 * @access Public
 */
router.post('/send-verification',
  emailRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('请提供有效的邮箱地址'),
    body('userName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('用户名长度应在1-50字符之间'),
    body('type')
      .optional()
      .isIn(['registration', 'password-reset', 'backup-email'])
      .withMessage('验证类型无效'),
    body('isResend')
      .optional()
      .isBoolean()
      .withMessage('重发标志必须是布尔值')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Input validation failed', 400, errors.array());
      }

      const { email, userName, type = 'registration', isResend = false } = req.body;

      // 检查邮件服务状态
      const status = emailService.getStatus();
      if (!status.configured) {
        return sendError(res, '邮件服务未配置，请联系管理员', 503);
      }

      if (!status.connected) {
        return sendError(res, '邮件服务连接失败，请稍后再试', 503);
      }

      // 根据类型处理不同的验证码发送逻辑
      if (type === 'registration') {
        // 注册验证码逻辑
        
        // 检查是否可以发送新验证码
        const canSendResult = emailVerificationCache.canSendNewCode(email, isResend);
        if (!canSendResult.canSend) {
          return sendError(res, canSendResult.message, 400, { 
            code: canSendResult.code,
            remainingTime: canSendResult.remainingTime,
            remainingMinutes: canSendResult.remainingMinutes
          });
        }

        // 检查邮箱是否已被注册
        const { User } = require('../models');
        const { Op } = require('sequelize');
        const existingUser = await User.findOne({
          where: {
            [Op.or]: [
              { email: email },
              { backup_email: email }
            ]
          }
        });

        if (existingUser) {
          let message = 'This email address is already registered';
          if (existingUser.email === email) {
            message = 'This email is already registered as a primary email';
          } else if (existingUser.backup_email === email) {
            message = 'This email is already registered as a backup email';
          }
          return sendError(res, message, 409);
        }

        // 生成并存储验证码
        const verificationCode = emailService.generateVerificationCode();
        const cacheSuccess = emailVerificationCache.setVerificationCode(email, verificationCode, 15 * 60); // 15分钟

        if (!cacheSuccess) {
          return sendError(res, '验证码存储失败，请稍后再试', 500);
        }

        // 发送注册验证邮件
        await emailService.sendRegistrationVerificationEmail(email, userName || 'User', verificationCode);
        
        return sendResponse(res, '注册验证码发送成功', {
          email: email,
          expiryMinutes: 15,
          type: 'registration'
        });
      } else {
        // 其他类型的验证码逻辑（如密码重置、备用邮箱等）
        // 也使用统一的缓存管理器
        
        // 生成并存储验证码
        const verificationCode = emailService.generateVerificationCode();
        const cacheSuccess = emailVerificationCache.setVerificationCode(email, verificationCode, 15 * 60); // 15分钟

        if (!cacheSuccess) {
          return sendError(res, '验证码存储失败，请稍后再试', 500);
        }

        // 发送其他类型验证邮件
        await emailService.sendVerificationEmailWithCode(email, userName || 'User', verificationCode, type);
        
        return sendResponse(res, '验证码发送成功', {
          email: email,
          expiryMinutes: 15,
          type: type
        });
      }

    } catch (error) {
      console.error('发送验证码失败:', error);
      return sendError(res, '验证码发送失败，请稍后再试', 500);
    }
  }
);

/**
 * @route POST /api/email/verify-code
 * @desc 验证邮箱验证码
 * @access Public
 */
router.post('/verify-code',
  verifyRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('请提供有效的邮箱地址'),
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('验证码应为6位数字'),
    body('type')
      .optional()
      .isIn(['email-verification', 'password-reset', 'registration'])
      .withMessage('验证类型无效')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Input validation failed', 400, errors.array());
      }

      const { email, code, type = 'email-verification' } = req.body;

      // 统一使用 emailVerificationCache 验证所有邮箱验证码
      const result = emailVerificationCache.verifyCode(email, code);
      
      if (result.success) {
        return sendResponse(res, result.message, {
          email: email,
          verified: true,
          type: type
        });
      } else {
        return sendError(res, result.message, 400, { 
          code: result.code,
          remainingAttempts: result.remainingAttempts 
        });
      }

    } catch (error) {
      console.error('验证码验证失败:', error);
      return sendError(res, '验证失败，请稍后再试', 500);
    }
  }
);

/**
 * @route POST /api/email/send-password-reset
 * @desc 发送密码重置邮件
 * @access Public
 */
router.post('/send-password-reset',
  emailRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('请提供有效的邮箱地址'),
    body('userName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('用户名长度应在1-50字符之间'),
    body('resetToken')
      .isLength({ min: 1 })
      .withMessage('重置令牌不能为空')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Input validation failed', 400, errors.array());
      }

      const { email, userName, resetToken } = req.body;

      // 检查邮件服务状态
      const status = emailService.getStatus();
      if (!status.configured) {
        return sendError(res, '邮件服务未配置，请联系管理员', 503);
      }

      if (!status.connected) {
        return sendError(res, '邮件服务连接失败，请稍后再试', 503);
      }

      // 构建重置链接
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      // 发送密码重置邮件
      await emailService.sendPasswordResetEmail(email, userName, resetLink);
      
      return sendResponse(res, '密码重置邮件发送成功', {
        email: email
      });

    } catch (error) {
      console.error('发送密码重置邮件失败:', error);
      return sendError(res, '密码重置邮件发送失败，请稍后再试', 500);
    }
  }
);

/**
 * @route POST /api/email/test
 * @desc 测试邮件发送功能（仅开发环境）
 * @access Public
 */
router.post('/test',
  [
    body('to')
      .isEmail()
      .normalizeEmail()
      .withMessage('请提供有效的邮箱地址'),
    body('subject')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('邮件主题长度应在1-100字符之间'),
    body('message')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('邮件内容长度应在1-1000字符之间')
  ],
  async (req, res) => {
    try {
      // 仅在开发环境允许测试
      if (process.env.NODE_ENV === 'production') {
        return sendError(res, '测试接口仅在开发环境可用', 403);
      }

      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Input validation failed', 400, errors.array());
      }

      const { 
        to, 
        subject = 'ICPADS 2025 邮件服务测试', 
        message = '这是一封测试邮件，用于验证邮件服务配置是否正确。' 
      } = req.body;

      // 检查邮件服务状态
      const status = emailService.getStatus();
      if (!status.configured) {
        return sendError(res, '邮件服务未配置，请联系管理员', 503);
      }

      // 发送测试邮件
      const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #007bff;">ICPADS 2025 邮件服务测试</h2>
          <p>${message}</p>
          <p><strong>发送时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
          <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `;

      const result = await emailService.sendEmail({
        to,
        subject,
        html,
        text: message + '\n\n发送时间: ' + new Date().toLocaleString('zh-CN')
      });
      
      return sendResponse(res, '测试邮件发送成功', {
        to,
        messageId: result.messageId,
        status: status
      });

    } catch (error) {
      console.error('测试邮件发送失败:', error);
      return sendError(res, '测试邮件发送失败: ' + error.message, 500);
    }
  }
);

/**
 * @route GET /api/email/status
 * @desc 获取邮件服务状态
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const status = emailService.getStatus();
    return sendResponse(res, '邮件服务状态获取成功', status);
  } catch (error) {
    console.error('获取邮件服务状态失败:', error);
    return sendError(res, '获取邮件服务状态失败', 500);
  }
});

module.exports = router;
