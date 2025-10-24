const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const { User } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../utils/emailService');
const { getRealClientIP } = require('../utils/ipUtils');
const adminTokens = require('../utils/cache/adminTokensCache');
const passwordResetCache = require('../utils/cache/passwordResetCache');
const simulateLoginCache = require('../utils/cache/simulateLoginCache');
const { validateUsername, generateUsernameSuggestions } = require('../utils/usernameValidator');
const { 
  passwordResetLimiter, 
  captchaLimiter, 
  loginLimiter, 
  forgotPasswordLimiter 
} = require('../middleware/rateLimiter');

const router = express.Router();

// Generate CAPTCHA endpoint with rate limiting
router.get('/captcha', captchaLimiter, (req, res) => {
  try {
    // 创建验证码，设置更安全的选项
    const captcha = svgCaptcha.create({
      size: 4,                    // 字符数量
      ignoreChars: '0o1iIl',     // 忽略容易混淆的字符
      noise: 2,                  // 干扰线数量
      color: true,               // 彩色字符
      background: '#f0f0f0',     // 背景色
      width: 120,                // 宽度
      height: 40,                // 高度
      fontSize: 50               // 字体大小
    });

    // 将验证码文本存储在session中
    req.session.captcha = captcha.text.toLowerCase();
    
    console.log('Generated CAPTCHA:', captcha.text, 'Session ID:', req.sessionID);

    // 设置响应头并返回SVG
    res.set('Content-Type', 'image/svg+xml');
    res.send(captcha.data);
  } catch (error) {
    console.error('CAPTCHA generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate captcha'
    });
  }
});

// 存储登录失败记录的内存对象
const loginFailures = new Map();

// 清理过期的登录失败记录
const cleanupFailedAttempts = () => {
  const now = Date.now();
  for (const [key, data] of loginFailures.entries()) {
    if (now - data.lastAttempt > 24 * 60 * 60 * 1000) { // 24小时后清理
      loginFailures.delete(key);
    }
  }
};

// 每小时清理一次过期记录
setInterval(cleanupFailedAttempts, 60 * 60 * 1000);

// Simulate login endpoint - 管理员模拟用户登录
router.get('/login', async (req, res) => {
  try {
    const { mock, userid, ticket } = req.query;

    // 检查是否为模拟登录请求
    if (mock !== '1' || !userid || !ticket) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters'
      });
    }

    console.log(`[SimulateLogin] Attempting to simulate login for user ${userid} with ticket ${ticket.substring(0, 8)}...`);

    // 验证 ticket
    const isValid = simulateLoginCache.validateAndUseTicket(ticket, userid);
    
    if (!isValid) {
      console.log(`[SimulateLogin] Invalid or expired ticket for user ${userid}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired login ticket'
      });
    }

    // 获取用户信息
    const user = await User.findByPk(userid);
    
    if (!user) {
      console.log(`[SimulateLogin] User not found: ${userid}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 再次检查用户是否为管理员（安全检查）
    if (user.is_superuser || user.role === 'admin') {
      console.log(`[SimulateLogin] Attempted to simulate login as admin user: ${userid}`);
      return res.status(403).json({
        success: false,
        message: 'Cannot simulate login as administrator'
      });
    }

    // 检查用户是否被冻结
    if (!user.is_active) {
      console.log(`[SimulateLogin] Attempted to simulate login as frozen user: ${userid}`);
      return res.status(403).json({
        success: false,
        message: 'Cannot simulate login as frozen user'
      });
    }

    // 设置 session，模拟登录成功
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullname: user.fullname,
      is_superuser: user.is_superuser
    };

    console.log(`[SimulateLogin] Simulate login successful for user: ${user.username} (ID: ${user.id})`);

    // 保存 session 并返回成功页面
    req.session.save((err) => {
      if (err) {
        console.error('[SimulateLogin] Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Session save failed'
        });
      }

      console.log(`[SimulateLogin] Session saved successfully, redirecting to user dashboard`);
      
      // 返回一个HTML页面，先获取用户信息再跳转
      res.send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>模拟登录成功</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h2 {
              color: #333;
              margin: 0 0 10px 0;
            }
            p {
              color: #666;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h2>模拟登录成功</h2>
            <p>正在跳转到用户主页...</p>
          </div>
          <script>
            // 先从服务器获取当前用户信息，然后更新localStorage，最后跳转
            fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            })
            .then(response => response.json())
            .then(data => {
              if (data.success && data.user) {
                // 清除旧的localStorage数据
                localStorage.clear();
                
                // 保存新用户信息到localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                
                console.log('模拟登录成功，用户信息已更新:', data.user);
                
                // 跳转到dashboard
                window.location.href = '/dashboard';
              } else {
                console.error('获取用户信息失败:', data);
                alert('模拟登录失败，请重试');
                window.location.href = '/admin/backend#/users';
              }
            })
            .catch(error => {
              console.error('获取用户信息出错:', error);
              alert('模拟登录失败，请重试');
              window.location.href = '/admin/backend#/users';
            });
          </script>
        </body>
        </html>
      `);
    });

  } catch (error) {
    console.error('[SimulateLogin] Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

// Login endpoint with rate limiting and account lockout
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password, captcha } = req.body;
    console.log('Login attempt for user:', username, 'captcha provided:', !!captcha);

    // 检查用户登录失败记录
    const realIP = getRealClientIP(req);
    const failureKey = `${realIP}:${username}`;
    const failureData = loginFailures.get(failureKey);
    const now = Date.now();
    
    // 检查是否被锁定
    if (failureData) {
      const { attempts, lastAttempt, lockUntil } = failureData;
      
      // 如果账户被锁定且锁定时间未过期
      if (lockUntil && now < lockUntil) {
        const remainingTime = Math.ceil((lockUntil - now) / 1000 / 60); // 转换为分钟
        console.log(`Account locked for user: ${username}, remaining: ${remainingTime} minutes`);
        return res.status(429).json({
          success: false,
          message: `Account temporarily locked due to multiple failed attempts. Please try again in ${remainingTime} minutes.`,
          locked: true,
          remainingTime: remainingTime
        });
      }
      
      // 如果锁定时间已过期，重置失败次数
      if (lockUntil && now >= lockUntil) {
        loginFailures.delete(failureKey);
      }
    }

    // 检查是否需要验证码（2次失败后需要验证码）
    const needsCaptcha = failureData && failureData.attempts >= 2;
    
    if (needsCaptcha) {
      // 需要验证码时验证验证码
      if (!captcha) {
        console.log('Captcha required but not provided for user:', username);
        return res.status(400).json({
          success: false,
          message: 'Captcha verification required. Please complete the captcha.',
          needsCaptcha: true
        });
      }
      
      if (!req.session.captcha) {
        console.log('Missing captcha in session for user:', username);
        return res.status(400).json({
          success: false,
          message: 'Invalid captcha session. Please refresh and try again.',
          needsCaptcha: true,
          field: 'captcha'
        });
      }

      // 比较验证码（不区分大小写）
      if (captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
        console.log('Invalid captcha for user:', username, 'provided:', captcha, 'expected:', req.session.captcha);
        // 清除已使用的验证码
        delete req.session.captcha;
        return res.status(400).json({
          success: false,
          message: 'Invalid security code. Please try again.',
          needsCaptcha: true,
          field: 'captcha'
        });
      }

      // 清除已使用的验证码
      delete req.session.captcha;
    } else {
      // 不需要验证码时，如果提供了验证码也验证
      if (captcha && req.session.captcha) {
        if (captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
          console.log('Optional captcha provided but invalid for user:', username);
          delete req.session.captcha;
          return res.status(400).json({
            success: false,
            message: 'Invalid captcha',
            field: 'captcha'
          });
        }
        delete req.session.captcha;
      }
    }

    // Find user by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }  // 允许用邮箱登录
        ]
      }
    });

    if (!user) {
      console.log('User not found:', username);
      // 记录失败尝试
      const currentFailures = loginFailures.get(failureKey) || { attempts: 0, lastAttempt: 0, lockUntil: null };
      currentFailures.attempts += 1;
      currentFailures.lastAttempt = now;
      
      // 设置锁定时间
      if (currentFailures.attempts >= 3) {
        const lockDuration = Math.min(currentFailures.attempts * 5, 60) * 60 * 1000; // 5分钟 * 失败次数，最多60分钟
        currentFailures.lockUntil = now + lockDuration;
        console.log(`Account locked for ${username} due to ${currentFailures.attempts} failed attempts`);
      }
      
      loginFailures.set(failureKey, currentFailures);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 检查用户是否被冻结
    if (!user.is_active) {
      console.log('User account is frozen:', username);
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact administrator.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      
      // 记录密码错误尝试
      const currentFailures = loginFailures.get(failureKey) || { attempts: 0, lastAttempt: 0, lockUntil: null };
      currentFailures.attempts += 1;
      currentFailures.lastAttempt = now;
      
      // 设置锁定时间（3次失败后开始锁定）
      if (currentFailures.attempts >= 3) {
        // 计算锁定时间：3次=5分钟，4次=10分钟，5次=15分钟，以此类推，最多60分钟
        const lockDuration = Math.min((currentFailures.attempts - 2) * 5, 60) * 60 * 1000;
        currentFailures.lockUntil = now + lockDuration;
        console.log(`Account locked for ${username} due to ${currentFailures.attempts} failed attempts, lock duration: ${lockDuration / 60000} minutes`);
        
        loginFailures.set(failureKey, currentFailures);
        
        const remainingTime = Math.ceil(lockDuration / 1000 / 60);
        return res.status(429).json({
          success: false,
          message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingTime} minutes.`,
          locked: true,
          remainingTime: remainingTime
        });
      }
      
      loginFailures.set(failureKey, currentFailures);
      
      // 给出提示还剩几次尝试机会
      const remainingAttempts = 3 - currentFailures.attempts;
      return res.status(401).json({
        success: false,
        message: remainingAttempts > 0 ? 
          `Invalid credentials. ${remainingAttempts} attempts remaining before account is temporarily locked.` :
          'Invalid credentials'
      });
    }

    // 登录成功，清除失败记录
    if (loginFailures.has(failureKey)) {
      loginFailures.delete(failureKey);
      console.log(`Cleared failed login attempts for user: ${username}`);
    }

    // Update last login time
    await user.update({
      last_login: new Date()
    });

    // Store user info in session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,  // 添加email字段
      role: user.role,    // 只使用 role 字段
      fullname: user.fullname,
      is_superuser: user.is_superuser
    };

    console.log('Login successful for user:', user.username, 'Session ID:', req.sessionID);

    // 强制保存session并手动触发cookie设置
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Session save failed'
        });
      } else {
        console.log('Session saved successfully for user:', username);
        console.log('Session ID:', req.sessionID);
        
        // 用不上 注释掉
        // 手动设置express-session兼容的cookie
        // const sessionCookieValue = 's:' + req.sessionID + '.' + require('crypto')
        //   .createHmac('sha256', process.env.SESSION_SECRET || 'default-secret-change-in-production')
        //   .update(req.sessionID)
        //   .digest('base64')
        //   .replace(/\+/g, '-')
        //   .replace(/\//g, '_')
        //   .replace(/=/g, '');
        
        // res.cookie('apiSessionId', sessionCookieValue, {
        //   maxAge: 1000 * 60 * 60 * 24,
        //   httpOnly: true,
        //   secure: false,
        //   sameSite: 'lax',
        //   path: '/api'
        // });
        
        // console.log('Setting express-session compatible cookie');
        console.log('Response headers before sending:', res.getHeaders());
        
        res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,  // 添加email字段
            role: user.role,    // 只使用 role 字段
            fullname: user.fullname,
            is_superuser: user.is_superuser
          }
        });
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

// Get current user info
router.get('/me', (req, res) => {
  console.log('Auth check - Session ID:', req.sessionID);
  console.log('Auth check - Session userId:', req.session?.userId);
  console.log('Auth check - Session user:', req.session?.user);
  
  if (!req.session || !req.session.userId) {
    console.log('Auth check failed: No session or userId');
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (!req.session.user) {
    console.log('Auth check failed: No user data in session');
    return res.status(401).json({
      success: false,
      message: 'Session invalid'
    });
  }

  console.log('Auth check successful for user:', req.session.user.username);
  res.json({
    success: true,
    user: req.session.user
  });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }
      
      // 清除前端专用的session cookie
      res.clearCookie('frontendSessionId', { path: '/api' });
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } else {
    res.json({
      success: true,
      message: 'No active session'
    });
  }
});

// Register endpoint
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 150 })
    .withMessage('Username must be between 3 and 150 characters')
    .custom((value) => {
      // 检查username是否包含空格
      if (value.includes(' ')) {
        throw new Error('Username cannot contain spaces');
      }
      // 检查username是否包含@符号
      if (value.includes('@')) {
        throw new Error('Username cannot contain @ symbol');
      }
      // 检查username是否是邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(value)) {
        throw new Error('Username cannot be in email format');
      }
      
      // 使用用户名验证器进行完整验证
      const validation = validateUsername(value);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]); // 返回第一个错误
      }
      
      return true;
    }),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullname')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
  body('firstName')
    .optional()
    .isLength({ max: 150 })
    .withMessage('First name cannot exceed 150 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 150 })
    .withMessage('Last name cannot exceed 150 characters'),
  body('emailVerificationCode')
    .notEmpty()
    .withMessage('Email verification code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Email verification code must be 6 digits'),
  body('captcha')
    .notEmpty()
    .withMessage('Security code is required')
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

    const { 
      username, 
      email, 
      password, 
      fullname = '', 
      firstName = '', 
      lastName = '',
      emailVerificationCode,
      captcha 
    } = req.body;
    
    console.log('Registration attempt for user:', username, 'email:', email);

    // 1. 验证图形验证码
    if (!req.session.captcha || !captcha) {
      console.log('Missing captcha in session or request for registration');
      return res.status(400).json({
        success: false,
        message: 'Invalid security code',
        field: 'captcha'
      });
    }

    // 比较验证码（不区分大小写）
    if (captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
      console.log('Invalid captcha for registration:', captcha, 'Expected:', req.session.captcha);
      // 清除已使用的验证码
      delete req.session.captcha;
      return res.status(400).json({
        success: false,
        message: 'Invalid security code',
        field: 'captcha'
      });
    }

    // 清除已使用的验证码
    delete req.session.captcha;

    // 2. 验证邮箱验证码
    const emailVerificationCache = require('../utils/cache/emailVerificationCache');
    
    // 检查邮箱是否已验证
    if (!emailVerificationCache.isEmailVerified(email)) {
      console.log('Email not verified for registration:', email);
      return res.status(400).json({
        success: false,
        message: 'Email verification required. Please verify your email first.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // 再次验证验证码（双重确认）
    const emailVerifyResult = emailVerificationCache.verifyCode(email, emailVerificationCode);
    if (!emailVerifyResult.success && emailVerifyResult.code !== 'CODE_ALREADY_USED') {
      console.log('Email verification failed during registration:', emailVerifyResult.message);
      return res.status(400).json({
        success: false,
        message: emailVerifyResult.message,
        code: emailVerifyResult.code
      });
    }

    // 3. 再次验证用户名（防止绕过前端验证）
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      const suggestions = generateUsernameSuggestions(username);
      console.log('Username validation failed during registration:', usernameValidation.errors);
      return res.status(400).json({
        success: false,
        message: 'Username validation failed',
        errors: usernameValidation.errors,
        suggestions: suggestions.length > 0 ? suggestions : null,
        field: 'username'
      });
    }

    // 4. 检查用户名和邮箱是否已存在
    // 检查主邮箱和备用邮箱重复
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: email },
          { backup_email: email } // 检查是否与已验证的备用邮箱重复
        ]
      }
    });

    if (existingUser) {
      let field = 'user';
      let message = 'User already exists';
      let suggestions = null;
      
      if (existingUser.username === username) {
        field = 'username';
        message = `Username "${username}" is already taken`;
        suggestions = generateUsernameSuggestions(username);
      } else if (existingUser.email === email) {
        field = 'email';
        message = `Email "${email}" is already registered as a primary email`;
      } else if (existingUser.backup_email === email) {
        field = 'email';
        message = `Email "${email}" is already registered as a verified backup email`;
      }

      console.log(`Registration failed - ${field} already exists:`, username, email);
      return res.status(409).json({
        success: false,
        message: message,
        suggestions: suggestions,
        field: field
      });
    }

    // 4. 创建新用户
    // Determine the fullname - prioritize explicit fullname, then firstName + lastName, then username
    let finalFullname = fullname || `${firstName} ${lastName}`.trim() || username;
    
    // Create new user - password will be hashed by the User model hook
    const newUser = await User.create({
      username: username,
      email: email,
      password: password,
      first_name: firstName,
      last_name: lastName,
      fullname: finalFullname,
      role: 'user', // Default permission role
      is_active: true,
      is_superuser: false,
      date_joined: new Date()
      // 注意：不设置email_verified字段，因为通过强验证逻辑，主邮箱默认已验证
    });

    // 5. 标记邮箱验证码为已使用
    emailVerificationCache.markAsUsed(email);

    console.log('User registered successfully:', newUser.username, 'email:', newUser.email);

    // Return success response (don't auto-login, require explicit login)
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please login with your credentials.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullname: newUser.fullname
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

// Forgot password endpoint with rate limiting
router.post('/forgot-password', forgotPasswordLimiter, [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('captcha')
    .notEmpty()
    .withMessage('Captcha is required')
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

    const { email, captcha } = req.body;
    console.log('Password reset request for email:', email);

    // 验证验证码
    if (!req.session.captcha || !captcha) {
      console.log('Missing captcha in session or request for forgot password');
      return res.status(400).json({
        success: false,
        message: 'Invalid captcha'
      });
    }

    // 比较验证码（不区分大小写）
    if (captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
      console.log('Invalid captcha for forgot password:', captcha, 'Expected:', req.session.captcha);
      // 清除已使用的验证码
      delete req.session.captcha;
      return res.status(400).json({
        success: false,
        message: 'Invalid captcha'
      });
    }

    // 清除已使用的验证码
    delete req.session.captcha;

    // Find user by email
    const user = await User.findOne({
      where: { email: email }
    });

    // Always return success message for security reasons
    const successMessage = 'If the email address exists in our system, a password reset email has been sent.';

    if (!user) {
      console.log('Password reset requested for non-existent email:', email);
      return res.json({
        success: true,
        message: successMessage
      });
    }

    // Generate stronger reset code (6-character with more entropy)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
    let resetCode = '';
    for (let i = 0; i < 6; i++) { // 6 characters
      resetCode += chars.charAt(crypto.randomInt(0, chars.length)); // Use crypto.randomInt for better security
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

    // Create reset link with code as token and email parameter for auto-fill
    const resetLink = `${process.env.CONFREG_FE_URL || 'http://localhost:8080'}/reset-password?token=${resetCode}&email=${encodeURIComponent(email)}`;

    // Send unified reset email with both code and link
    try {
      await emailService.sendPasswordResetEmail(email, user.fullname || user.username, resetCode, resetLink);
      console.log('Password reset email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't reveal email sending failure to user for security
    }

    res.json({
      success: true,
      message: successMessage
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// Reset password with enhanced security and rate limiting
router.post('/reset-password', passwordResetLimiter, [
  body('token')
    .notEmpty()
    .withMessage('Reset code is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'), // 强制要求邮箱验证
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('captcha')
    .notEmpty()
    .withMessage('Captcha is required') // 添加验证码要求
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

    const { token, email, password, captcha } = req.body;
    console.log('Password reset attempt with code/token');

    // 验证验证码
    if (!req.session.captcha || !captcha) {
      console.log('Missing captcha in session or request for password reset');
      return res.status(400).json({
        success: false,
        message: 'Invalid captcha'
      });
    }

    // 比较验证码（不区分大小写）
    if (captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
      console.log('Invalid captcha for password reset:', captcha, 'Expected:', req.session.captcha);
      // 清除已使用的验证码
      delete req.session.captcha;
      return res.status(400).json({
        success: false,
        message: 'Invalid captcha'
      });
    }

    // 清除已使用的验证码
    delete req.session.captcha;

    // 验证重置 token（从缓存中）
    const resetData = passwordResetCache.validateToken(email, token);

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    console.log('Reset password with enhanced security - verifying email and token');

    // Find user by ID from cache data
    const user = await User.findOne({
      where: {
        id: resetData.userId,
        email: email // 确保邮箱匹配
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid security code, email address, or expired reset link'
      });
    }

    // Update password and clear reset token from cache
    await user.update({
      password: password // Will be hashed by the model hook
    });

    // Clear reset data from cache
    passwordResetCache.deleteResetData(email);
    console.log('Password reset successful for user:', user.username);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});


// Upgrade user to admin session
router.get('/upgrade', (req, res) => {
  console.log('Upgrade check - Session ID:', req.sessionID);
  console.log('Upgrade check - Session userId:', req.session?.userId);
  console.log('Upgrade check - Session user:', req.session?.user);

  if (!req.session || !req.session.userId) {
    console.log('Upgrade check failed: No session or userId');
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (!req.session.user) {
    console.log('Upgrade check failed: No user data in session');
    return res.status(401).json({
      success: false,
      message: 'Session invalid'
    });
  }

  console.log('Upgrade check successful for user:', req.session.user.username);

  // 检查用户权限 - 只有管理员或超级用户可以升级
  if (!req.session.user.role === 'admin' && !req.session.user.is_superuser) {
    console.log('Upgrade denied: User is not admin or superuser:', req.session.user.username);
    return res.status(403).json({
      success: false,
      message: 'Insufficient privileges for admin access'
    });
  }

  // 如果是管理员用户，设置管理员session
  if (req.session.user.role === 'admin' || req.session.user.is_superuser) {
    // 创建跨路径访问的共享token，用于admin路径的session初始化
    const crypto = require('crypto');
    const adminToken = crypto.randomBytes(32).toString('hex');
    const adminTokenData = {
      userId: req.session.user.id,
      username: req.session.user.username,
      email: req.session.user.email,
      role: req.session.user.role || (req.session.user.is_superuser ? 'admin' : 'user'), // 使用真实的 role 字段
      fullname: req.session.user.fullname,
      is_superuser: req.session.user.is_superuser,
      expires: Date.now() + (5 * 60 * 1000) // 5分钟过期
    };
    
    // 将token存储在缓存中，自动5分钟过期
    adminTokens.setWithTTL(adminToken, adminTokenData, 300); // 300秒 = 5分钟
    
    console.log('Created admin token for cross-path session:', adminToken);
    
    // 设置一个临时cookie，用于admin路径的session初始化
    res.cookie('adminUpgradeToken', adminToken, {
      maxAge: 5 * 60 * 1000, // 5分钟
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/' // 全站可访问
    });

    // 设置临时cookie后 除前端session cookie
    res.clearCookie('frontendSessionId', { 
      path: '/api',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    
    res.json({
      success: true,
      message: 'Successfully upgraded to admin session',
      user: req.session.user,
      adminUser: req.session.adminUser,
      adminAccess: true,
      adminToken: adminToken, // 也在响应中返回token
      redirectUrl: '/admin/backend/' // 建议前端重定向到管理后台
    });
  } else {
    // 非管理员用户，只返回普通用户信息
    res.json({
      success: true,
      message: 'User session confirmed',
      user: req.session.user,
      adminAccess: false
    });
  }
});

module.exports = router;
