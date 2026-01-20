#!/usr/bin/env node

/**
 * Admin用户重置脚本
 * 
 * 功能：
 * 1. 自动恢复admin用户的superuser权限和active状态
 * 2. 交互式输入新密码和新邮箱
 * 3. 确保admin用户具有管理员角色
 * 
 * 使用方法：
 * node mgt/reset-admin.js
 * 
 * 安全特性：
 * - 密码输入时不会显示在终端
 * - 邮箱格式验证
 * - 密码强度验证
 * - 操作确认提示
 */

const path = require('path');
const readline = require('readline');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 导入数据库配置和模型
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');

// 创建命令行界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 普通输入
 */
function normalInput(prompt) {
  return new Promise((resolve) => {
    try {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    } catch (error) {
      // 如果 readline 已关闭，返回空字符串
      resolve('');
    }
  });
}

/**
 * 验证邮箱格式
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码强度
 */
function validatePassword(password) {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6个字符' };
  }
  
  if (password.length > 255) {
    return { valid: false, message: '密码长度不能超过255个字符' };
  }
  
  // 建议密码包含多种字符类型
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (strength < 2) {
    return { 
      valid: true, 
      message: '密码强度较弱，建议包含大写字母、小写字母、数字和特殊字符',
      warning: true
    };
  }
  
  return { valid: true, message: '密码强度良好' };
}

/**
 * 确认操作
 */
async function confirmAction(message) {
  const answer = await normalInput(`${message} (y/N): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * 显示用户信息
 */
function displayUserInfo(user) {
  console.log('\n📋 当前admin用户信息:');
  console.log(`   用户名: ${user.username}`);
  console.log(`   全名: ${user.fullname}`);
  console.log(`   邮箱: ${user.email}`);
  console.log(`   角色: ${user.role}`);
  console.log(`   超级用户: ${user.is_superuser ? '是' : '否'}`);
  console.log(`   账户状态: ${user.is_active ? '激活' : '未激活'}`);
  console.log(`   创建时间: ${user.date_joined}`);
  console.log(`   最后登录: ${user.last_login || '从未登录'}`);
}

/**
 * 重置admin用户
 */
async function resetAdminUser() {
  try {
    console.log('🔍 正在查找admin用户...');
    
    // 查找admin用户
    let adminUser = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!adminUser) {
      console.log('❌ 未找到用户名为 "admin" 的用户');
      
      // 询问是否创建新的admin用户
      const createNew = await confirmAction('是否创建新的admin用户？');
      if (!createNew) {
        console.log('操作已取消');
        return;
      }
      
      console.log('📝 创建新的admin用户...');
      adminUser = User.build({
        username: 'admin',
        fullname: 'System Administrator',
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        is_superuser: true,
        is_active: true,
        date_joined: new Date()
      });
    } else {
      console.log('✅ 找到admin用户');
      displayUserInfo(adminUser);
    }
    
    // 输入新邮箱
    console.log('\n📧 设置新邮箱:');
    let newEmail;
    while (true) {
      newEmail = await normalInput('请输入新邮箱地址 (留空保持不变): ');
      if (!newEmail) {
        console.log('邮箱为空则不变');
        newEmail = adminUser.email; // 保持现有邮箱
        break;
      }
      if (!validateEmail(newEmail)) {
        console.log('❌ 邮箱格式不正确');
        continue;
      }
      break;
    }
    
    // 输入新密码
    console.log('\n🔐 设置新密码:');
    let newPassword;
    while (true) {
      newPassword = await normalInput('请输入新密码 (留空保持不变): ');
      if (!newPassword) {
        console.log('密码为空则不变');
        newPassword = adminUser.password; // 保持现有密码
        break;
      }
      
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        console.log(`❌ ${validation.message}`);
        continue;
      }
      
      if (validation.warning) {
        console.log(`⚠️  ${validation.message}`);
        const proceed = await confirmAction('是否继续使用此密码？');
        if (!proceed) {
          continue;
        }
      } else {
        console.log(`✅ ${validation.message}`);
      }
      
      // 确认密码
      const confirmPassword = await normalInput('请再次输入密码确认: ');
      if (newPassword !== confirmPassword) {
        console.log('❌ 两次输入的密码不一致，请重新输入');
        continue;
      }
      
      break;
    }
    
    // 显示即将进行的更改
    console.log('\n📋 即将进行的更改:');
    console.log(`   邮箱: ${adminUser.email || '(空)'} → ${newEmail === adminUser.email ? '(保持不变)' : newEmail}`);
    console.log(`   密码: ${newPassword === adminUser.password ? '(保持不变)' : '********'}`);
    console.log(`   角色: ${adminUser.role || 'user'} → admin`);
    console.log(`   超级用户: ${adminUser.is_superuser ? '是' : '否'} → 是`);
    console.log(`   账户状态: ${adminUser.is_active ? '激活' : '未激活'} → 激活`);
    
    // 最终确认
    const finalConfirm = await confirmAction('\n确认执行以上更改？');
    if (!finalConfirm) {
      console.log('操作已取消');
      return;
    }
    
    // 执行更新
    console.log('\n🔄 正在更新admin用户信息...');
    
    adminUser.email = newEmail;
    adminUser.password = newPassword; // User模型的beforeUpdate hook会自动哈希密码
    adminUser.role = 'admin';
    adminUser.is_superuser = true;
    adminUser.is_active = true;
    
    await adminUser.save();
    
    console.log('✅ admin用户信息重置成功！');
    
    // 显示最终结果
    console.log('\n🎉 重置完成！新的admin用户信息:');
    console.log(`   用户名: admin`);
    console.log(`   邮箱: ${newEmail}`);
    console.log(`   密码: ${newPassword === adminUser.password ? '[保持不变]' : '[已设置]'}`);
    console.log(`   角色: admin`);
    console.log(`   超级用户权限: 已激活`);
    console.log(`   账户状态: 已激活`);
    
    console.log('\n💡 使用提示:');
    console.log('   1. 请妥善保管新的登录凭据');
    console.log('   2. 建议首次登录后再次更改密码');
    console.log('   3. 可以使用此凭据登录管理后台');
    
  } catch (error) {
    console.error('\n❌ 重置admin用户时发生错误:');
    console.error(error.message);
    if (error.name === 'SequelizeValidationError') {
      console.error('\n验证错误详情:');
      error.errors.forEach(err => {
        console.error(`   - ${err.path}: ${err.message}`);
      });
    }
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔧 Admin用户重置工具');
  console.log('=====================================\n');
  
  try {
    // 测试数据库连接
    console.log('🔌 正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 执行重置操作
    await resetAdminUser();
    
  } catch (error) {
    console.error('\n💥 程序执行失败:');
    console.error(error.message);
    
    if (error.message.includes('SQLITE_CANTOPEN') || error.message.includes('no such file')) {
      console.error('\n🔧 可能的解决方案:');
      console.error('   1. 检查数据库文件是否存在');
      console.error('   2. 运行 npm run init-db 初始化数据库');
      console.error('   3. 检查 CONFREG_DB_PATH 环境变量设置');
    }
    
    process.exit(1);
  } finally {
    // 关闭数据库连接和命令行界面
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('关闭数据库连接时出现错误:', closeError.message);
    }
    try {
      rl.close();
    } catch (closeError) {
      // readline 可能已经被关闭，忽略错误
    }
  }
}

// 处理程序退出
process.on('SIGINT', () => {
  console.log('\n\n👋 程序被用户中断');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 程序收到终止信号');
  process.exit(0);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { resetAdminUser };
