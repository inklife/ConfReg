const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 初始化日志系统 - 必须在其他模块之前加载
require('./utils/logger');

// Import database configuration and models (SQLite3 initialization is handled in database.js)
const { sequelize, testConnection } = require('./config/database');
const { User, RegistrationSubmission } = require('./models');

// Import routes
const authRoutes = require('./routes/auth-new');
const adminAuthRoutes = require('./routes/admin-auth');
const submissionRoutes = require('./routes/submissions');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const invoiceRoutes = require('./routes/invoices');
const emailRoutes = require('./routes/email');
const backupEmailRoutes = require('./routes/backup-email');
const voucherRoutes = require('./routes/vouchers');
const adminVoucherRoutes = require('./routes/admin-vouchers');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.CONFREG_BE_PORT || 3000;

// Trust proxy - 启用以正确获取客户端真实IP
// 如果使用nginx或其他反向代理，这个设置很重要
app.set('trust proxy', true);

// Security middleware - 暂时禁用以排除cookie问题
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
//       scriptSrcAttr: ["'unsafe-inline'"],
//       imgSrc: ["'self'", "data:", "https:"],
//       fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
//       connectSrc: ["'self'"]
//     }
//   }
// }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1200 // limit each IP to 900 requests per windowMs
});
app.use(limiter);

// CORS configuration
// 无需配置
// 开发阶段交由 webpack-dev-server 处理
// 生产阶段交由 nginx 处理
// app.use(cors({
//   origin: [
//     'http://localhost:8080',
//     'http://localhost:8081',
//     'http://localhost:3000',
//     'http://localhost:3001',
//     'http://127.0.0.1:8080',
//     'http://127.0.0.1:8081',
//     'http://127.0.0.1:3000',
//     'http://127.0.0.1:3001'
//   ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
//   exposedHeaders: ['Set-Cookie']
// }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Session configuration
// 暂时使用内存存储进行调试
// const sessionStore = new SequelizeStore({
//   db: sequelize,
// });

// 前端API专用的session配置
app.use('/api', session({
  secret: process.env.SESSION_SECRET || 'frontend-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'frontendSessionId', // 前端专用cookie名称
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    // domain: undefined,
    path: '/api' // 只在API路径下有效
  }
}));

// 管理员专用的session配置
app.use(['/admin'], session({
  secret: process.env.SESSION_SECRET || 'admin-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'adminSessionId', // 管理员专用cookie名称
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    // domain: undefined,
    path: '/admin' // 只在/admin路径下有效
  }
}));

// Debug middleware to log session and cookie information
app.use((req, res, next) => {
  console.log(`\n=== Request Debug Info ===`);
  console.log(`URL: ${req.method} ${req.url}`);
  console.log(`Session ID: ${req.sessionID}`);
  console.log(`Session userId: ${req.session?.userId}`);
  console.log(`Request cookies:`, req.headers.cookie);
  
  // 添加IP调试信息
  console.log(`req.ip: ${req.ip}`);
  console.log(`x-forwarded-for: ${req.headers['x-forwarded-for']}`);
  console.log(`x-real-ip: ${req.headers['x-real-ip']}`);
  
  console.log(`==========================\n`);
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// Database connection and initialization
async function initializeDatabase() {
  try {
    await testConnection();
    
    // 同步数据库模型
    await sequelize.sync({ force: false });
    console.log('Database synchronized successfully');
    
    // 由于使用内存session，暂时注释掉session存储同步
    // await sessionStore.sync();
    // console.log('Session store synchronized');
    
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/admin/auth', adminAuthRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/backup-email', backupEmailRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/config', configRoutes);

// 统一的管理员路由 - 包含发票、转账等所有管理员功能
app.use('/admin', adminRoutes);
app.use('/admin/vouchers', adminVoucherRoutes);
app.use('/admin/config', configRoutes); // 管理后台也可以访问配置 API

// Admin panel route
// app.get('/admin', (req, res) => {
//   res.redirect('/admin/');
// });

// app.get('/admin/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../public/admin/index.html'));
// });


// Admin static files
// app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Health check endpoint
app.get('/admin/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Initialize memory monitoring
const { globalMemoryMonitor } = require('./middleware/pdfProtection');
console.log('🧠 内存监控系统已启动');

// 启动定期内存监控（每5分钟报告一次）
globalMemoryMonitor.startPeriodicMonitoring(5 * 60 * 1000);

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 记录服务器启动时的内存基线
  console.log('📊 服务器启动完成，记录内存基线');
  const startupMemory = process.memoryUsage();
  console.log(`启动内存使用: RSS ${Math.round(startupMemory.rss / 1024 / 1024)}MB, Heap ${Math.round(startupMemory.heapUsed / 1024 / 1024)}MB`);
});


module.exports = app;
