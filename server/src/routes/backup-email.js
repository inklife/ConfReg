/**
 * 备用邮箱管理路由
 * 提供备用邮箱的添加、验证、设置为主邮箱、删除等功能
 */

const express = require('express');
const { Op } = require('sequelize');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const emailService = require('../utils/emailService');
const crypto = require('crypto');
const backupEmailCache = require('../utils/cache/backupEmailCache');

const router = express.Router();

// 获取用户邮箱信息（主邮箱和备用邮箱）
router.get('/email-info', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: ['email', 'backup_email', 'backup_email_verified']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        primaryEmail: user.email,
        backupEmail: user.backup_email,
        backupEmailVerified: user.backup_email_verified
      }
    });
  } catch (error) {
    console.error('Get email info error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 添加备用邮箱（发送验证邮件）
router.post('/add-backup-email', requireAuth, [
  body('backupEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom((value, { req }) => {
      // 检查是否与现有邮箱重复
      return User.findOne({
        where: {
          [Op.or]: [
            { email: value },
            { backup_email: value }
          ]
        }
      }).then(user => {
        if (user) {
          return Promise.reject('This email address is already in use');
        }
      });
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

    const { backupEmail } = req.body;
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 检查是否与主邮箱相同
    if (backupEmail === user.email) {
      return res.status(400).json({
        success: false,
        message: 'Backup email cannot be the same as primary email'
      });
    }

    // 生成验证令牌（6位数字验证码）
    const verificationToken = emailService.generateVerificationCode(); // 生成6位数字作为token

    // 将验证token存储到缓存中（30分钟过期）
    const cacheSuccess = backupEmailCache.setVerificationToken(backupEmail, verificationToken, 30 * 60);
    
    if (!cacheSuccess) {
      return res.status(500).json({
        success: false,
        message: 'Failed to store verification token'
      });
    }

    // 更新用户备用邮箱信息（仅存储邮箱地址，不存储token）
    await user.update({
      backup_email: backupEmail,
      backup_email_verified: false
    });

    // 发送验证邮件（英文）
    try {
      const verificationLink = `${process.env.CONFREG_FE_URL || 'http://localhost:8080'}/verify-backup-email?token=${verificationToken}&email=${encodeURIComponent(backupEmail)}`;
      
      // 验证码就是token（6位数字）
      const verificationCode = verificationToken;
      
      // 发送包含验证码和链接的英文邮件
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .verification-code { 
              background-color: #007bff; 
              color: white; 
              padding: 15px 25px; 
              font-size: 24px; 
              font-weight: bold;
              text-align: center; 
              border-radius: 5px; 
              margin: 20px 0;
              letter-spacing: 3px;
            }
            .verification-link { 
              background-color: #28a745; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none;
              border-radius: 5px; 
              display: inline-block;
              margin: 20px 0;
            }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h2>ICPADS 2025 - Backup Email Verification</h2>
            </div>
            <div class="content">
              <p>Dear ${user.fullname || user.username},</p>
              <p>You are adding a backup email to your ICPADS 2025 account.</p>
              
              <h3>Method 1: Use Verification Code (Primary Method)</h3>
              <p>Enter this verification code in the system:</p>
              <div class="verification-code">${verificationCode}</div>
              
              <h3>Method 2: Click Verification Link (Alternative)</h3>
              <p>Or click the button below to verify automatically:</p>
              <p style="text-align: center;">
                <a href="${verificationLink}" class="verification-link">Verify Backup Email</a>
              </p>
              
              <p><strong>This verification code will expire in 15 minutes.</strong></p>
              <p>If you did not request to add a backup email, please ignore this email.</p>
              
              <p><strong>After verification, your backup email can be used for:</strong></p>
              <ul>
                <li>Alternative contact method for your account</li>
                <li>Can be set as primary email when needed</li>
                <li>Note: Backup email cannot be used for login</li>
              </ul>
            </div>
            <div class="footer">
              <p>This email was sent automatically. Please do not reply.</p>
              <p>© 2025 ICPADS Conference</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
ICPADS 2025 - Backup Email Verification

Dear ${user.fullname || user.username},

You are adding a backup email to your ICPADS 2025 account.

Method 1: Use Verification Code (Primary Method)
Enter this verification code: ${verificationCode}

Method 2: Use Verification Link (Alternative)
Copy and paste this link: ${verificationLink}

This verification code will expire in 15 minutes.

If you did not request to add a backup email, please ignore this email.

After verification, your backup email can be used for:
- Alternative contact method for your account
- Can be set as primary email when needed
- Note: Backup email cannot be used for login

This email was sent automatically. Please do not reply.
© 2025 ICPADS Conference
      `;

      await emailService.sendEmail({
        to: backupEmail,
        subject: 'ICPADS 2025 - Backup Email Verification',
        html: emailHtml,
        text: emailText
      });

    } catch (emailError) {
      console.error('Failed to send backup email verification:', emailError);
      // 邮件发送失败，但不要暴露具体错误给用户
    }

    res.json({
      success: true,
      message: 'Backup email added successfully. Please check your email for verification instructions.',
      data: {
        backupEmail: backupEmail,
        verified: false
      }
    });

  } catch (error) {
    console.error('Add backup email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 验证备用邮箱（使用验证码）
router.post('/verify-backup-email', requireAuth, [
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

    const { verificationCode } = req.body;
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.backup_email) {
      return res.status(400).json({
        success: false,
        message: 'No backup email to verify'
      });
    }

    if (user.backup_email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Backup email is already verified'
      });
    }

    // 验证验证码（从备用邮箱缓存中验证）
    const isValidToken = backupEmailCache.validateToken(user.backup_email, verificationCode);
    
    if (!isValidToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // 标记备用邮箱为已验证并清理缓存中的token
    await user.update({
      backup_email_verified: true
    });

    // 删除缓存中的验证token
    backupEmailCache.deleteVerificationToken(user.backup_email);

    res.json({
      success: true,
      message: 'Backup email verified successfully',
      data: {
        backupEmail: user.backup_email,
        verified: true
      }
    });

  } catch (error) {
    console.error('Verify backup email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 通过链接验证备用邮箱
router.get('/verify-backup-email-link/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification link'
      });
    }

    // 从缓存中查找验证token
    const tokenData = backupEmailCache.findByToken(token);
    
    if (!tokenData || tokenData.email !== email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link'
      });
    }

    // 查找用户
    const user = await User.findOne({
      where: {
        backup_email: email
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // 标记备用邮箱为已验证并清理缓存
    await user.update({
      backup_email_verified: true
    });

    // 删除缓存中的验证token
    backupEmailCache.deleteVerificationToken(email);

    res.json({
      success: true,
      message: 'Backup email verified successfully through link',
      data: {
        backupEmail: user.backup_email,
        verified: true
      }
    });

  } catch (error) {
    console.error('Verify backup email link error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 将备用邮箱设置为主要邮箱
router.post('/set-backup-as-primary', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.backup_email) {
      return res.status(400).json({
        success: false,
        message: 'No backup email configured'
      });
    }

    if (!user.backup_email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Backup email must be verified before setting as primary'
      });
    }

    // 交换主邮箱和备用邮箱
    const oldPrimaryEmail = user.email;
    const newPrimaryEmail = user.backup_email;

    await user.update({
      email: newPrimaryEmail,
      backup_email: oldPrimaryEmail,
      backup_email_verified: true // 原主邮箱默认为已验证
    });

    // 更新session中的用户信息
    if (req.session.user) {
      req.session.user.email = newPrimaryEmail;
    }

    res.json({
      success: true,
      message: 'Primary email changed successfully',
      data: {
        newPrimaryEmail: newPrimaryEmail,
        newBackupEmail: oldPrimaryEmail
      }
    });

  } catch (error) {
    console.error('Set backup as primary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 删除备用邮箱
router.delete('/backup-email', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.backup_email) {
      return res.status(400).json({
        success: false,
        message: 'No backup email to delete'
      });
    }

    // 删除备用邮箱及相关信息
    await user.update({
      backup_email: null,
      backup_email_verified: false
    });

    // 清理缓存中的验证token（如果存在）
    if (user.backup_email) {
      backupEmailCache.deleteVerificationToken(user.backup_email);
    }

    res.json({
      success: true,
      message: 'Backup email deleted successfully'
    });

  } catch (error) {
    console.error('Delete backup email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 重新发送备用邮箱验证邮件
router.post('/resend-backup-verification', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.backup_email) {
      return res.status(400).json({
        success: false,
        message: 'No backup email configured'
      });
    }

    if (user.backup_email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Backup email is already verified'
      });
    }

    // 生成新的验证令牌（6位数字验证码）
    const verificationToken = emailService.generateVerificationCode(); // 生成6位数字作为token

    // 将新的验证token存储到缓存中（30分钟过期）
    const cacheSuccess = backupEmailCache.setVerificationToken(user.backup_email, verificationToken, 30 * 60);
    
    if (!cacheSuccess) {
      return res.status(500).json({
        success: false,
        message: 'Failed to store verification token'
      });
    }

    // 重新发送验证邮件（英文）
    try {
      const verificationLink = `${process.env.CONFREG_FE_URL || 'http://localhost:8080'}/verify-backup-email?token=${verificationToken}&email=${encodeURIComponent(user.backup_email)}`;
      
      // 验证码就是token（6位数字）
      const verificationCode = verificationToken;
      
      // 发送包含验证码和链接的英文邮件
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .verification-code { 
              background-color: #007bff; 
              color: white; 
              padding: 15px 25px; 
              font-size: 24px; 
              font-weight: bold;
              text-align: center; 
              border-radius: 5px; 
              margin: 20px 0;
              letter-spacing: 3px;
            }
            .verification-link { 
              background-color: #28a745; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none;
              border-radius: 5px; 
              display: inline-block;
              margin: 20px 0;
            }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h2>ICPADS 2025 - Backup Email Verification (Resent)</h2>
            </div>
            <div class="content">
              <p>Dear ${user.fullname || user.username},</p>
              <p>Here is your backup email verification information again.</p>
              
              <h3>Method 1: Use Verification Code (Primary Method)</h3>
              <p>Enter this verification code in the system:</p>
              <div class="verification-code">${verificationCode}</div>
              
              <h3>Method 2: Click Verification Link (Alternative)</h3>
              <p>Or click the button below to verify automatically:</p>
              <p style="text-align: center;">
                <a href="${verificationLink}" class="verification-link">Verify Backup Email</a>
              </p>
              
              <p><strong>This verification code will expire in 15 minutes.</strong></p>
              <p>If you did not request to add a backup email, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This email was sent automatically. Please do not reply.</p>
              <p>© 2025 ICPADS Conference</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
ICPADS 2025 - Backup Email Verification (Resent)

Dear ${user.fullname || user.username},

Here is your backup email verification information again.

Method 1: Use Verification Code (Primary Method)
Enter this verification code: ${verificationCode}

Method 2: Use Verification Link (Alternative)
Copy and paste this link: ${verificationLink}

This verification code will expire in 15 minutes.

If you did not request to add a backup email, please ignore this email.

This email was sent automatically. Please do not reply.
© 2025 ICPADS Conference
      `;

      await emailService.sendEmail({
        to: user.backup_email,
        subject: 'ICPADS 2025 - Backup Email Verification (Resent)',
        html: emailHtml,
        text: emailText
      });
    } catch (emailError) {
      console.error('Failed to resend backup email verification:', emailError);
      // 不要暴露邮件发送错误给用户
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        backupEmail: user.backup_email
      }
    });

  } catch (error) {
    console.error('Resend backup verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
