const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../utils/emailService');
const adminTokens = require('../utils/cache/adminTokensCache');
const passwordResetCache = require('../utils/cache/passwordResetCache');
const { adminLoginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const { getSaltRounds } = require('../config/crypto');

const router = express.Router();

// Admin login endpoint with rate limiting
router.post('/login', adminLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Admin login attempt for user:', username);

    // Find user by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      console.log('Admin login - User not found:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 检查用户是否被冻结
    if (!user.is_active) {
      console.log('Admin login - User account is frozen:', username);
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact administrator.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Check if user is admin
    const isAdmin = user.is_superuser === true ||
                   user.role === 'admin' ||
                   user.username === 'admin'; // 兼容性保留

    if (!isAdmin) {
      console.log('Admin login - User is not admin:', username);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Compare hashed password
    console.log('Password comparison - Input:', password);
    console.log('Password comparison - Hash from DB:', user.password);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Admin login - Invalid password for user:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login time
    await user.update({
      last_login: new Date()
    });

    // Store admin user info in session
    req.session.adminUserId = user.id;
    req.session.adminUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || (user.is_superuser ? 'admin' : 'user'), // 使用真实的 role 字段
      fullname: user.fullname,
      is_superuser: user.is_superuser
    };

    console.log('Admin login successful for user:', user.username, 'Session ID:', req.sessionID);

    // 强制保存session
    req.session.save((err) => {
      if (err) {
        console.error('Admin session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Session save failed'
        });
      } else {
        console.log('Admin session saved successfully for user:', username);
        console.log('Admin Session ID:', req.sessionID);
        
        res.json({
          success: true,
          message: 'Admin login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || (user.is_superuser ? 'admin' : 'user'), // 使用真实的 role 字段
            fullname: user.fullname,
            is_superuser: user.is_superuser
          }
        });
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});



// Get current admin user info
router.get('/me', (req, res) => {
  console.log('Admin auth check - Session ID:', req.sessionID);
  console.log('Admin auth check - Session adminUserId:', req.session?.adminUserId);
  console.log('Admin auth check - Session adminUser:', req.session?.adminUser);
  console.log('Admin auth check - Session userId:', req.session?.userId);
  console.log('Admin auth check - Session user:', req.session?.user);
  
  // 首先检查管理员专用session
  if (req.session && req.session.adminUserId && req.session.adminUser) {
    console.log('Admin auth check successful for admin user:', req.session.adminUser.username);
    return res.json({
      success: true,
      user: req.session.adminUser
    });
  }
  
  // 检查跨路径的admin upgrade token
  const adminToken = req.cookies?.adminUpgradeToken;
  if (adminToken && adminTokens.has(adminToken)) {
    const tokenData = adminTokens.get(adminToken);
    if (tokenData && tokenData.expires > Date.now()) {
      console.log('Admin auth check: Using admin upgrade token for user:', tokenData.username);
      
      // 将token数据设置到当前session中
      req.session.adminUserId = tokenData.userId;
      req.session.adminUser = {
        id: tokenData.userId,
        username: tokenData.username,
        email: tokenData.email,
        role: tokenData.role || (tokenData.is_superuser ? 'admin' : 'user'), // 使用真实的 role 字段
        fullname: tokenData.fullname,
        is_superuser: tokenData.is_superuser
      };
      req.session.adminAccess = true;
      req.session.adminAccessTime = new Date();
      
      // 保存session并返回结果
      req.session.save((err) => {
        if (err) {
          console.error('Session save error in admin auth check:', err);
          return res.status(500).json({
            success: false,
            message: 'Session save failed'
          });
        } else {
          console.log('Admin session initialized from upgrade token in auth check');
          // 保存完成后，应该清除 跨路径的admin upgrade token 和 cookie
          adminTokens.delete(adminToken);
          res.clearCookie('adminUpgradeToken', {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
          });
          return res.json({
            success: true,
            user: req.session.adminUser
          });
        }
      });
      // 不要删除这个return
      return;
    } else if (tokenData) {
      console.log('Admin auth check: Admin upgrade token expired');
      adminTokens.delete(adminToken);
    }
  }
  
  // 如果没有管理员session，检查普通用户session中的管理员权限
  if (req.session && req.session.userId && req.session.user) {
    const user = req.session.user;
    const userRole = user.role; // 只使用 role 字段
    
    // 检查是否为管理员：role为admin 或者 is_superuser为true
    const isAdmin = user.is_superuser === true || 
                    user.role === 'admin' ||
                    user.username === 'admin'; // 兼容性保留
    
    if (isAdmin) {
      console.log('Admin auth check successful for regular user with admin privileges:', user.username);
      return res.json({
        success: true,
        user: user
      });
    }
  }
  
  console.log('Admin auth check failed: No valid admin session found');
  return res.status(401).json({
    success: false,
    message: 'Not authenticated'
  });
});

// Admin change password endpoint
router.put('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    // Check if admin is authenticated
    if (!req.session || !req.session.adminUserId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get admin user
    const user = await User.findByPk(req.session.adminUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
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

    console.log(`Admin password changed successfully for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Admin change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin logout endpoint
router.post('/logout', (req, res) => {
  // 获取并清除 adminUpgradeToken
  const adminToken = req.cookies?.adminUpgradeToken;
  if (adminToken && adminTokens.has(adminToken)) {
    console.log('Clearing admin upgrade token:', adminToken);
    adminTokens.delete(adminToken);
  }
  
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Admin logout error:', err);
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }
      
      // 清除管理员专用的session cookie
      res.clearCookie('adminSessionId', { path: '/admin' });
      // 清除 adminUpgradeToken cookie
      res.clearCookie('adminUpgradeToken', { 
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      
      console.log('Admin logout successful - session destroyed and tokens cleared');
      res.json({
        success: true,
        message: 'Admin logout successful'
      });
    });
  } else {
    // 即使没有session，也要清除 adminUpgradeToken cookie
    res.clearCookie('adminUpgradeToken', { 
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    
    console.log('Admin logout successful - tokens cleared (no session)');
    res.json({
      success: true,
      message: 'Admin logout successful'
    });
  }
});

// Admin forgot password endpoint - unified approach with rate limiting
// 这个接口现在应该用不到 
router.post('/forgot-password', forgotPasswordLimiter, [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    console.log('Admin password reset request for email:', email);

    // Find admin user by email
    const user = await User.findOne({
      where: { email: email }
    });

    // Always return success message for security reasons
    const successMessage = 'If the email address belongs to an admin account, a password reset email has been sent.';

    if (!user) {
      console.log('Admin password reset requested for non-existent email:', email);
      return res.json({
        success: true,
        message: successMessage
      });
    }

    // Check if user is admin
    const isAdmin = user.is_superuser === true ||
                   user.role === 'admin' ||
                   user.username === 'admin'; // 兼容性保留

    if (!isAdmin) {
      console.log('Password reset requested for non-admin user:', email);
      return res.json({
        success: true,
        message: successMessage
      });
    }

    // Generate reset code (6-character alphanumeric with uppercase letters)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters like 0, O, 1, I
    let resetCode = '';
    for (let i = 0; i < 6; i++) {
      resetCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const resetTokenExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes

    // Save reset code to cache instead of database
    const resetSuccess = passwordResetCache.setResetData(
      email, 
      resetCode, 
      resetTokenExpiry, 
      {
        userId: user.id,
        username: user.username,
        fullname: user.fullname
      },
      1800 // 30分钟过期 (30 * 60 = 1800秒)
    );

    if (!resetSuccess) {
      console.error('Failed to save password reset data to cache for:', email);
      return res.status(500).json({
        success: false,
        message: 'Server error occurred'
      });
    }

    // Create reset link for admin with code as token and email parameter for auto-fill
    const resetLink = `${process.env.ADMIN_URL || 'http://localhost:3000'}/reset-password?token=${resetCode}&email=${encodeURIComponent(email)}`;

    // Send unified reset email with both code and link
    try {
      await emailService.sendPasswordResetEmail(email, user.fullname || user.username, resetCode, resetLink);
      console.log('Admin password reset email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send admin password reset email:', emailError);
      // Don't reveal email sending failure to user for security
    }

    res.json({
      success: true,
      message: successMessage
    });

  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});


module.exports = router;
