/**
 * 数据库初始化脚本 - 主进程
 * 
 * 功能：
 * 1. 创建临时脚本文件并在子进程中执行
 * 2. 第一步：检测 SQLite3 驱动状态
 * 3. 第二步：创建/同步数据库表结构和管理员用户
 * 
 * 使用方法：
 * - 初始化数据库: node mgt/init-db.js
 * - 重置数据库: node mgt/init-db.js --reset
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 临时文件目录
const tmpDir = path.join(__dirname, '../tmp');
const sqliteCheckFile = path.join(tmpDir, 'sqlite-check.js');
const dbInitFile = path.join(tmpDir, 'db-init.js');

// 确保临时目录存在
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

/**
 * 运行子进程并等待完成
 */
function runChildProcess(scriptPath, description) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 启动子进程: ${description}`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'), // 设置工作目录为 server 目录
      env: process.env // 传递当前进程的环境变量
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 子进程完成: ${description}`);
        resolve();
      } else {
        console.error(`❌ 子进程失败: ${description} (退出码: ${code})`);
        reject(new Error(`Child process failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ 子进程错误: ${description}`, error);
      reject(error);
    });
  });
}

/**
 * 创建 SQLite3 检测脚本
 */
function createSQLiteCheckScript() {
  const envPath = path.join(__dirname, '../../.env'); // 生成绝对路径
  
  const checkScript = `/**
 * SQLite3 驱动检测脚本 (子进程)
 */

const path = require('path');

// 设置环境变量路径 - 使用绝对路径
require('dotenv').config({ path: '${envPath}' });

async function checkSQLite3() {
  try {
    console.log('🔧 正在检测 SQLite3 驱动状态...');
    
    // 导入 SQLite3 准备工具
    const { ensureSQLite3Ready } = require('../src/utils/cross-platform-sqlite3');
    
    // 确保 SQLite3 驱动已准备就绪
    await ensureSQLite3Ready();
    
    console.log('✅ SQLite3 驱动检测完成并已准备就绪');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ SQLite3 驱动检测失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  }
}

// 运行检测
checkSQLite3();
`;

  fs.writeFileSync(sqliteCheckFile, checkScript, 'utf8');
  console.log(`📝 已创建 SQLite3 检测脚本: ${sqliteCheckFile}`);
}

/**
 * 创建数据库初始化脚本
 */
function createDatabaseInitScript() {
  const isReset = process.argv.includes('--reset');
  const envPath = path.join(__dirname, '../../.env'); // 生成绝对路径
  
  const initScript = `/**
 * 数据库初始化脚本 (子进程)
 */

const path = require('path');

// 设置环境变量路径 - 使用绝对路径
require('dotenv').config({ path: '${envPath}' });

const { sequelize, User, RegistrationSubmission } = require('../src/models');

// 获取默认管理员密码配置
const getDefaultAdminPassword = () => {
  const defaultPassword = process.env.CONFREG_ADMIN_DEFAULT_PASSWORD || 'admin123456';
  console.log(\`🔑 Using default admin password from: \${process.env.CONFREG_ADMIN_DEFAULT_PASSWORD ? 'Environment variable (CONFREG_ADMIN_DEFAULT_PASSWORD)' : 'Default configuration'}\`);
  return defaultPassword;
};

// 获取默认管理员邮箱配置
const getDefaultAdminEmail = () => {
  const defaultEmail = process.env.CONFREG_ADMIN_DEFAULT_EMAIL || 'admin@example.com';
  console.log(\`📧 Using default admin email from: \${process.env.CONFREG_ADMIN_DEFAULT_EMAIL ? 'Environment variable (CONFREG_ADMIN_DEFAULT_EMAIL)' : 'Default configuration'}\`);
  return defaultEmail;
};

async function initializeDatabase() {
  try {
    console.log('🗄️ 正在初始化数据库...');
    
    // 检查数据库文件是否存在
    const fs = require('fs');
    const dbPath = sequelize.config.storage || sequelize.options.storage;
    const dbExists = fs.existsSync(dbPath);
    
    if (!dbExists) {
      console.log('📄 数据库文件不存在，将自动创建新的数据库文件');
    } else {
      console.log('📄 数据库文件已存在，将连接到现有数据库');
    }
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    if (!dbExists) {
      console.log('✅ 新的数据库文件已创建');
    }
    
    // 同步数据库表结构
    const force = ${isReset};
    
    console.log('🔧 开始同步数据库表结构...');
    if (!dbExists || force) {
      console.log('📋 将创建/重置所有必需的数据表:');
      console.log('   - backend_userinfo (用户表)');
      console.log('   - backend_registrationsubmission (注册提交表)');
      console.log('   - backend_attendeetransfer (参会者转让表)');
      console.log('   - backend_refundrequest (退款请求表)');
      console.log('   - backend_invoicerequest (发票请求表)');
      console.log('   - backend_invoicefile (发票文件表)');
    }
    
    await sequelize.sync({ force });
    console.log(\`✅ 数据库表结构\${force ? '重置并' : ''}同步完成\`);
    
    if (!dbExists || force) {
      console.log('✅ 所有数据表已成功创建/重置');
    }
    
    if (force) {
      console.log('⚠️  数据库已重置，所有数据被清空');
    }
    
    // 检查是否存在管理员用户
    const adminExists = await User.findOne({ 
      where: { 
        username: 'admin'
      } 
    });
    
    if (!adminExists) {
      console.log('👤 正在创建默认管理员用户...');
      
      const defaultPassword = getDefaultAdminPassword();
      const defaultEmail = getDefaultAdminEmail();
      
      await User.create({
        username: 'admin',
        password: defaultPassword, // 将被自动哈希
        fullname: 'System Administrator',
        role: 'admin', // 权限角色设为 admin
        first_name: 'System',
        last_name: 'Administrator',
        email: defaultEmail,
        is_superuser: true,
        is_active: true,
        date_joined: new Date()
      });
      
      console.log('✅ 默认管理员用户创建成功');
      console.log('📋 管理员信息:');
      console.log(\`   用户名: admin\`);
      console.log(\`   密码: \${defaultPassword}\`);
      console.log(\`   邮箱: \${defaultEmail}\`);
      console.log('⚠️  请在首次登录后更改密码！');
    } else {
      console.log('👤 管理员用户已存在');
    }
    
    // 显示当前数据库统计
    const userCount = await User.count();
    const submissionCount = await RegistrationSubmission.count();
    
    console.log('📊 当前数据库状态:');
    console.log(\`   - 用户数量: \${userCount}\`);
    console.log(\`   - 注册提交数量: \${submissionCount}\`);
    
    console.log('✅ 数据库初始化完成');
    
    console.log('\\n🚀 使用提示:');
    console.log('   - 启动服务器: npm start');
    console.log('   - 重置数据库: node mgt/init-db.js --reset');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 数据库初始化错误:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('⚠️  关闭数据库连接时出错:', closeError.message);
    }
  }
}

// 运行初始化
initializeDatabase();
`;

  fs.writeFileSync(dbInitFile, initScript, 'utf8');
  console.log(`📝 已创建数据库初始化脚本: ${dbInitFile}`);
}

/**
 * 清理临时文件
 */
function cleanupTempFiles() {
  try {
    if (fs.existsSync(sqliteCheckFile)) {
      fs.unlinkSync(sqliteCheckFile);
      console.log(`🗑️  已清理临时文件: ${sqliteCheckFile}`);
    }
    if (fs.existsSync(dbInitFile)) {
      fs.unlinkSync(dbInitFile);
      console.log(`🗑️  已清理临时文件: ${dbInitFile}`);
    }
    
    // 检查 tmp 目录是否为空，如果为空则删除目录
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      if (files.length === 0) {
        fs.rmdirSync(tmpDir);
        console.log(`🗑️  已清理空临时目录: ${tmpDir}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  清理临时文件时出错:', error.message);
  }
}

/**
 * 主进程执行流程
 */
async function main() {
  try {
    console.log('🎯 数据库初始化主进程启动');
    console.log(`📁 工作目录: ${process.cwd()}`);
    console.log(`🔧 参数: ${process.argv.slice(2).join(' ') || '(无)'}`);
    
    // 第一步: 创建并运行 SQLite3 检测脚本
    console.log('📋 第一阶段: SQLite3 驱动检测');
    createSQLiteCheckScript();
    await runChildProcess(sqliteCheckFile, 'SQLite3 驱动检测');
    
    // 第二步: 创建并运行数据库初始化脚本
    console.log('📋 第二阶段: 数据库初始化');
    createDatabaseInitScript();
    await runChildProcess(dbInitFile, '数据库初始化');

    console.log('🎉 所有任务已完成！数据库初始化成功');

  } catch (error) {
    console.error('❌ 主进程执行失败:', error.message);
    process.exit(1);
  } finally {
    // 清理临时文件
    cleanupTempFiles();
  }
}

// 运行主进程
main();
