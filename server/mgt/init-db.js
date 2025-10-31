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

// 配置文件路径
const configJsonPath = path.join(__dirname, '../database/config.json');

// 确保临时目录存在
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

/**
 * 初始化配置文件 config.json
 */
function initializeConfigJson() {
  try {
    // 检查配置文件是否存在
    if (fs.existsSync(configJsonPath)) {
      console.log('✅ 配置文件已存在: database/config.json');
      return;
    }

    console.log('📄 配置文件不存在，正在创建默认配置...');

    // 默认配置模板
    const defaultConfig = {
      "registrationFees": {
        "fullRegistration": [
          {
            "code": "IEEE Member",
            "description": "For IEEE members",
            "earlyBird": {
              "usd": 700,
              "rmb": 5000
            },
            "lateRegistration": {
              "usd": 850,
              "rmb": 6100
            },
            "benefits": [
              "Presentation and Publication of one paper",
              "Access to all conference sessions",
              "A copy of the proceedings",
              "Program brochure and conference goodies (e.g., bags/paper/pens)",
              "Lunch, coffee breaks, banquet and reception"
            ]
          },
          {
            "code": "Non-IEEE Member",
            "description": "For non-IEEE members",
            "earlyBird": {
              "usd": 840,
              "rmb": 6000
            },
            "lateRegistration": {
              "usd": 990,
              "rmb": 7100
            },
            "benefits": [
              "Presentation and Publication of one paper",
              "Access to all conference sessions",
              "A copy of the proceedings",
              "Program brochure and conference goodies (e.g., bags/paper/pens)",
              "Lunch, coffee breaks, banquet and reception"
            ]
          }
        ],
        "attendeeRegistration": [
          {
            "code": "IEEE Student Member/Life Member",
            "description": "For IEEE student members or life members",
            "earlyBird": {
              "usd": 500,
              "rmb": 3600
            },
            "lateRegistration": {
              "usd": 650,
              "rmb": 4700
            },
            "benefits": [
              "Access to all conference sessions",
              "A copy of the proceedings",
              "Program brochure and conference goodies (e.g., bags/paper/pens)",
              "Lunch, coffee breaks, banquet and reception"
            ]
          },
          {
            "code": "Student - Non-IEEE Member",
            "description": "For students without IEEE membership",
            "earlyBird": {
              "usd": 610,
              "rmb": 4400
            },
            "lateRegistration": {
              "usd": 760,
              "rmb": 5500
            },
            "benefits": [
              "Access to all conference sessions",
              "A copy of the proceedings",
              "Program brochure and conference goodies (e.g., bags/paper/pens)",
              "Lunch, coffee breaks, banquet and reception"
            ]
          },
          {
            "code": "Attendee - IEEE Member",
            "description": "For attendees with IEEE membership",
            "earlyBird": {
              "usd": 610,
              "rmb": 4400
            },
            "lateRegistration": {
              "usd": 760,
              "rmb": 5500
            },
            "benefits": [
              "Access to all conference sessions",
              "A copy of the proceedings",
              "Program brochure and conference goodies (e.g., bags/paper/pens)",
              "Lunch, coffee breaks, banquet and reception"
            ]
          },
          {
            "code": "Attendee - Non-IEEE Member",
            "description": "For attendees without IEEE membership",
            "earlyBird": {
              "usd": 700,
              "rmb": 5000
            },
            "lateRegistration": {
              "usd": 850,
              "rmb": 6100
            },
            "benefits": [
              "Access to all conference sessions",
              "A copy of the proceedings",
              "Program brochure and conference goodies (e.g., bags/paper/pens)",
              "Lunch, coffee breaks, banquet and reception"
            ]
          }
        ],
        "additionalFees": [
          {
            "code": "Extra page fee (per page)",
            "description": "One additional page (no more than 10 pages in total)",
            "earlyBird": {
              "usd": 80,
              "rmb": 600
            },
            "lateRegistration": {
              "usd": 80,
              "rmb": 600
            }
          },
          {
            "code": "Extra banquet tickets (per ticket)",
            "description": "One additional banquet ticket",
            "earlyBird": {
              "usd": 150,
              "rmb": 1100
            },
            "lateRegistration": {
              "usd": 150,
              "rmb": 1100
            }
          }
        ]
      },
      "deadlines": {
        "earlyBirdDeadline": "2025-10-31T23:59:59+08:00",
        "earlyBirdNote": "The Early Bird rate eligibility is determined by the <strong style='color: red;'>actual payment arrival date</strong>, not the registration submission date. You may complete the payment first and fill in the registration information later. As long as the payment arrives before October 31, 2025 (Beijing Time), the Early Bird rate will apply.",
        "priceDisclaimer": "The prices displayed on this page are calculated based on the assumption that you have not made an advance payment and are for reference only. If you have already made an advance payment, please refer to the registration fee policy on the official conference website for the actual applicable rates."
      },
      "processingFees": {
        "transferFee": {
          "usd": 150,
          "rmb": 1100
        },
        "refundFee": {
          "usd": 150,
          "rmb": 1100
        }
      },
      "announcement": {
        "enabled": true,
        "message": "Thanks for your registration. If your status shows as \"pending,\" this is a normal occurrence. Starting from October 31st, we are reviewing all registrations one by one."
      }
    };

    // 确保 database 目录存在
    const databaseDir = path.dirname(configJsonPath);
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true });
      console.log('📁 已创建目录: database/');
    }

    // 写入配置文件
    fs.writeFileSync(configJsonPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log('✅ 已创建默认配置文件: database/config.json');
    console.log('');
    console.log('⚠️  重要提示：');
    console.log('   📝 请检查并修改以下配置内容：');
    console.log('   1. 会议注册价格（USD/RMB）');
    console.log('   2. 早鸟价截止时间（当前设置：2025-10-31T23:59:59+08:00）');
    console.log('');
    console.log('   编辑方式：');
    console.log('   • 手动编辑文件: server/database/config.json');
    console.log('   • 或在管理员后台系统设置中编辑');
    console.log('');

  } catch (error) {
    console.error('❌ 初始化配置文件失败:', error.message);
    throw error;
  }
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
    
    // 第零步: 初始化配置文件
    console.log('📋 第零阶段: 配置文件检查与初始化');
    initializeConfigJson();
    
    // 第一步: 创建并运行 SQLite3 检测脚本
    console.log('📋 第一阶段: SQLite3 驱动检测');
    createSQLiteCheckScript();
    await runChildProcess(sqliteCheckFile, 'SQLite3 驱动检测');
    
    // 第二步: 创建并运行数据库初始化脚本
    console.log('📋 第二阶段: 数据库初始化');
    createDatabaseInitScript();
    await runChildProcess(dbInitFile, '数据库初始化');

    console.log('🎉 所有任务已完成！数据库初始化成功');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📌 重要配置检查清单：');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('1. 💰 会议价格配置');
    console.log('   文件位置: server/database/config.json');
    console.log('   需要检查: 各类参会者的价格（USD/RMB）是否正确');
    console.log('');
    console.log('2. ⏰ 早鸟价截止时间');
    console.log('   当前设置: 2025-10-31T23:59:59+08:00');
    console.log('   需要确认: 是否需要调整早鸟价截止日期');
    console.log('');
    console.log('3. 🔧 配置修改方式：');
    console.log('   选项 A: 手动编辑 server/database/config.json');
    console.log('   选项 B: 启动服务后在管理员后台系统设置中编辑');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

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
