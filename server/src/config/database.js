/**
 * ICPADS 2025 数据库配置文件
 * 使用跨平台 SQLite3 加载器和优化的 Sequelize 配置
 */

const path = require('path');
const fs = require('fs');
let restoreBindings = null;

// 初始化 SQLite3 模块
initializeSQLite3();

const { Sequelize } = require('sequelize');

console.log('🔧 Database configuration loading...');

// 数据库文件路径 - 从环境变量获取，回退到默认路径
// 注意：如果 CONFREG_DB_PATH 是相对路径，它相对于项目根目录（server的父目录）
const getDbPath = () => {
  const envDbPath = process.env.CONFREG_DB_PATH;
  
  if (envDbPath) {
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(envDbPath)) {
      return envDbPath;
    }
    // 如果是相对路径，相对于项目根目录（server的父目录）
    return path.resolve(__dirname, '../../../', envDbPath);
  }
  
  // 默认路径
  console.log('⚠️ CONFREG_DB_PATH not set, using default database path');
  return path.join(__dirname, '../../database/icpads2025.sqlite');
};

const dbPath = getDbPath();
console.log(`🗄️ Database path: ${dbPath}`);
console.log(`🔧 Path source: ${process.env.CONFREG_DB_PATH ? 'Environment variable (CONFREG_DB_PATH)' : 'Default configuration'}`);

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Created database directory: ${dbDir}`);
}

// 统一的 Sequelize 配置
const sequelizeConfig = {
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    busyTimeout: 30000,
    journal_mode: 'WAL',
    synchronous: 'NORMAL'
  }
};

// 创建 Sequelize 实例（SQLite3 已在启动脚本中确保可用）
let sequelize;
try {
  sequelize = new Sequelize(sequelizeConfig);
  console.log('✅ Sequelize instance created successfully');
} catch (error) {
  console.error('❌ Failed to create Sequelize instance:', error.message);
  console.error('\n🔧 SQLite3 模块可能未正确配置，请重新启动应用程序');
  process.exit(1);
}

/**
 * 简化的数据库连接测试
 * SQLite3 已在启动脚本中确保可用
 */
const testConnection = async () => {
  try {
    console.log('🔧 Initializing database connection...');
    
    // 检查数据库文件状态
    if (!fs.existsSync(dbPath)) {
      console.log('📄 Database file does not exist, it will be created on first connection');
    } else {
      const stats = fs.statSync(dbPath);
      console.log(`📊 Database file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // 测试数据库连接
    console.log(`📁 Connecting to SQLite database: ${dbPath}`);
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // 显示 SQLite 版本信息
    try {
      const [results] = await sequelize.query('SELECT sqlite_version() as version');
      console.log(`📋 SQLite version: ${results[0].version}`);
    } catch (versionError) {
      console.log('ℹ️ Could not retrieve SQLite version');
    }
    
    // SQLite3 已成功加载并建立连接，现在可以恢复原始的模块加载行为
    if (typeof restoreBindings === 'function') {
      restoreBindings();
      console.log('🔄 SQLite3 path interception restored to original state');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\n🔧 数据库连接故障排除建议：');
    console.error('1. 重新启动应用程序');
    console.error('2. 检查文件权限和磁盘空间');
    console.error('3. 运行诊断：npm run sqlite3:info');
    throw error;
  }
};

/**
 * 优雅关闭数据库连接
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('📁 Database connection closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
};

// 监听进程退出事件，确保数据库连接正确关闭
process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, closing database connection...');
  await closeConnection();
  process.exit(0);
});

/**
 * 初始化 SQLite3 模块
 * 确保 SQLite3 在导入 Sequelize 前就正确加载
 */
function initializeSQLite3() {
  console.log('🔧 Initializing SQLite3 module for database...');
  try {
    // 同步加载我们的 SQLite3 模块，确保路径拦截生效
    const { instance } = require('../utils/cross-platform-sqlite3');
    
    // 获取当前平台的预编译模块路径
    const { prebuiltPath } = instance.getPlatformModulePath();
    
    if (fs.existsSync(prebuiltPath)) {
      const platformInfo = instance.getPlatformInfo();
      console.log(`🔧 Found prebuilt SQLite3 for ${platformInfo.platformKey}, setting up interception...`);
      // 立即设置路径拦截
      restoreBindings = instance.setupPathInterception(prebuiltPath, false);
      console.log('✅ SQLite3 path interception activated');
    } else {
      const platformInfo = instance.getPlatformInfo();
      console.log(`⚠️  Prebuilt SQLite3 not found for ${platformInfo.platformKey}, will use standard loading`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize SQLite3 interception:', error.message);
  }
}

// 导出数据库实例和相关工具
module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  dbPath,
  
  // 向后兼容
  platform: require('os').platform()
};
