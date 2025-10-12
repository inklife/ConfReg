// Authentication middleware
const requireAuth = async (req, res, next) => {
  console.log('RequireAuth middleware - Session ID:', req.sessionID);
  console.log('RequireAuth middleware - Session userId:', req.session?.userId);
  
  if (!req.session || !req.session.userId) {
    console.log('RequireAuth failed: No session or userId');
    return res.status(401).json({
      success: false,
      message: 'Please login'
    });
  }
  
  // 检查用户是否还处于活跃状态
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      console.log('RequireAuth failed: User not found in database:', req.session.userId);
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }
    
    if (!user.is_active) {
      console.log('RequireAuth failed: User account is suspended:', user.username);
      req.session.destroy();
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact administrator.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }
    
    // 将用户对象附加到 req.user，供后续中间件使用
    req.user = user;
  } catch (error) {
    console.error('RequireAuth database check error:', error);
    // 如果数据库检查失败，允许继续但记录错误
  }
  
  console.log('RequireAuth successful for user:', req.session.user?.username);
  next();
};

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
  console.log('RequireAdmin middleware - Session ID:', req.sessionID);
  console.log('RequireAdmin middleware - Session adminUserId:', req.session?.adminUserId);
  console.log('RequireAdmin middleware - Session adminUser:', req.session?.adminUser);
  
  // 首先检查管理员专用session
  if (req.session && req.session.adminUserId && req.session.adminUser) {
    // 检查管理员用户是否还处于活跃状态
    try {
      const { User } = require('../models');
      const user = await User.findByPk(req.session.adminUserId);
      
      if (!user) {
        console.log('RequireAdmin failed: Admin user not found in database:', req.session.adminUserId);
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: 'Admin user not found. Please login again.'
        });
      }
      
      if (!user.is_active) {
        console.log('RequireAdmin failed: Admin account is suspended:', user.username);
        req.session.destroy();
        return res.status(403).json({
          success: false,
          message: 'Admin account has been suspended.',
          code: 'ACCOUNT_SUSPENDED'
        });
      }
      
      // 将用户对象附加到 req.user
      req.user = user;
    } catch (error) {
      console.error('RequireAdmin database check error:', error);
      // 如果数据库检查失败，允许继续但记录错误
    }
    
    console.log('RequireAdmin successful for admin user:', req.session.adminUser.username);
    // 将管理员信息设置为userId，保持与现有代码兼容
    req.session.userId = req.session.adminUserId;
    req.session.user = req.session.adminUser;
    return next();
  }
  
  // 如果没有管理员session，检查普通用户session中的管理员权限
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Please login'
    });
  }
  
  // 检查用户是否还处于活跃状态和管理员权限
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      console.log('RequireAdmin failed: User not found in database:', req.session.userId);
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }
    
    if (!user.is_active) {
      console.log('RequireAdmin failed: User account is suspended:', user.username);
      req.session.destroy();
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact administrator.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }
    
    // 检查是否为管理员：is_superuser 或 role 为 admin
    const isAdmin = user.is_superuser === true || 
                    user.role === 'admin' ||
                    user.username === 'admin'; // 兼容性保留
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // 将用户对象附加到 req.user
    req.user = user;
    
    console.log('RequireAdmin successful for regular user with admin privileges:', user.username);
    next();
  } catch (error) {
    console.error('RequireAdmin database check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

module.exports = {
  requireAuth,
  requireAdmin
};
