const rateLimit = require('express-rate-limit');
const { getRealClientIP } = require('../utils/ipUtils');

// 密码重置尝试限制器
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 5, // 每个IP每15分钟最多5次尝试
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 根据真实IP和session标识用户
  keyGenerator: (req) => {
    const realIP = getRealClientIP(req);
    return realIP + ':' + (req.sessionID || 'anonymous');
  }
});

// 验证码生成限制器
const captchaLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟窗口
  max: 20, // 每个IP每分钟最多20次验证码请求
  message: {
    success: false,
    message: 'Too many captcha requests. Please wait a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const realIP = getRealClientIP(req);
    return realIP + ':captcha';
  }
});

// 登录尝试限制器
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 10, // 每个IP每15分钟最多10次登录尝试
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const realIP = getRealClientIP(req);
    return realIP + ':login';
  }
});

// 忘记密码请求限制器
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时窗口
  max: 3, // 每个IP每小时最多3次忘记密码请求
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const realIP = getRealClientIP(req);
    return realIP + ':forgot-password';
  }
});

// 管理员登录尝试限制器
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 5, // 每个IP每15分钟最多5次管理员登录尝试（比普通登录更严格）
  message: {
    success: false,
    message: 'Too many admin login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const realIP = getRealClientIP(req);
    return realIP + ':admin-login';
  }
});

module.exports = {
  passwordResetLimiter,
  captchaLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  adminLoginLimiter
};
