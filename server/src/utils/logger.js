const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 获取日志目录配置，默认为 server/logs
const LOG_DIR = process.env.CONFREG_LOG_DIR || path.join(__dirname, '../../logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 生成带时间戳的日志文件名
const getLogFileName = () => {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  
  return `server_${timestamp}.log`;
};

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// 创建 Winston logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出 - 彩色格式
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          if (stack) {
            return `${timestamp} [${level}]: ${message}\n${stack}`;
          }
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    }),
    
    // 文件输出 - 纯文本格式
    new winston.transports.File({
      filename: path.join(LOG_DIR, getLogFileName()),
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 30, // 保留最近30个文件
      tailable: true
    })
  ]
});

// 重写 console 方法，使其同时输出到日志文件
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// 包装控制台方法
console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  originalConsole.log(...args); // 保持原有的控制台输出
  logger.info(message); // 同时写入日志文件
};

console.info = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  originalConsole.info(...args);
  logger.info(message);
};

console.warn = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  originalConsole.warn(...args);
  logger.warn(message);
};

console.error = (...args) => {
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`;
    }
    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
  }).join(' ');
  
  originalConsole.error(...args);
  logger.error(message);
};

console.debug = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  originalConsole.debug(...args);
  logger.debug(message);
};

// 导出 logger 实例和工具函数
module.exports = {
  logger,
  originalConsole,
  logDir: LOG_DIR,
  
  // 手动日志方法（如果需要直接使用 winston）
  log: (level, message, meta = {}) => {
    logger.log(level, message, meta);
  },
  
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  
  error: (message, meta = {}) => {
    logger.error(message, meta);
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
  
  // 获取当前日志文件路径
  getCurrentLogFile: () => {
    return path.join(LOG_DIR, getLogFileName());
  },
  
  // 清理旧日志文件（保留指定天数）
  cleanOldLogs: (days = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    try {
      const files = fs.readdirSync(LOG_DIR);
      files.forEach(file => {
        if (file.startsWith('server_') && file.endsWith('.log')) {
          const filePath = path.join(LOG_DIR, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            logger.info(`Cleaned old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      logger.error('Error cleaning old log files:', error);
    }
  }
};

// 启动时输出日志信息
logger.info('='.repeat(60));
logger.info('Logger initialized');
logger.info(`Log directory: ${LOG_DIR}`);
logger.info(`Current log file: ${getLogFileName()}`);
logger.info(`Log level: ${logger.level}`);
logger.info('='.repeat(60));
