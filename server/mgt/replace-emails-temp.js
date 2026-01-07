/**
 * 临时脚本 - 随机替换所有表中的email字段
 * 警告：此脚本会修改数据库中的所有email地址！
 * 使用前请务必备份数据库！
 */

const { sequelize } = require('../src/config/database');
const { User, RegistrationSubmission, InvoiceRequest } = require('../src/models');

// 可用的email地址列表
const AVAILABLE_EMAILS = [
  'qiaoshuang241@qq.com',
  '319825685@qq.com',
  '1160882912@qq.com',
  'woaini881314@foxmail.com',
  'sqiao@mail.ustc.edu.cn',
  'qiaoshuang@ustc.edu'
];

/**
 * 随机选择一个email地址
 */
function getRandomEmail() {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_EMAILS.length);
  return AVAILABLE_EMAILS[randomIndex];
}

/**
 * 替换User表中的email字段
 */
async function replaceUserEmails() {
  console.log('\n=== 开始替换 User (backend_userinfo) 表的email字段 ===');
  
  try {
    const users = await User.findAll();
    console.log(`找到 ${users.length} 个用户记录`);
    
    let updatedCount = 0;
    for (const user of users) {
      const oldEmail = user.email;
      const oldBackupEmail = user.backup_email;
      
      // 替换主邮箱
      user.email = getRandomEmail();
      
      // 如果有备用邮箱，也替换
      if (oldBackupEmail) {
        user.backup_email = getRandomEmail();
      }
      
      await user.save();
      updatedCount++;
      
      console.log(`✓ 用户 ${user.username} (ID: ${user.id}):`);
      console.log(`  主邮箱: ${oldEmail} → ${user.email}`);
      if (oldBackupEmail) {
        console.log(`  备用邮箱: ${oldBackupEmail} → ${user.backup_email}`);
      }
    }
    
    console.log(`\n✅ User表: 成功更新 ${updatedCount} 条记录`);
    return updatedCount;
  } catch (error) {
    console.error('❌ 替换User表email时出错:', error);
    throw error;
  }
}

/**
 * 替换RegistrationSubmission表中的email字段
 */
async function replaceRegistrationEmails() {
  console.log('\n=== 开始替换 RegistrationSubmission (backend_registrationsubmission) 表的email字段 ===');
  
  try {
    const registrations = await RegistrationSubmission.findAll();
    console.log(`找到 ${registrations.length} 个注册记录`);
    
    let updatedCount = 0;
    for (const registration of registrations) {
      const oldEmail = registration.email;
      registration.email = getRandomEmail();
      await registration.save();
      updatedCount++;
      
      console.log(`✓ 注册记录 ${registration.name} (ID: ${registration.id}): ${oldEmail} → ${registration.email}`);
    }
    
    console.log(`\n✅ RegistrationSubmission表: 成功更新 ${updatedCount} 条记录`);
    return updatedCount;
  } catch (error) {
    console.error('❌ 替换RegistrationSubmission表email时出错:', error);
    throw error;
  }
}

/**
 * 替换InvoiceRequest表中的contactEmail字段
 */
async function replaceInvoiceEmails() {
  console.log('\n=== 开始替换 InvoiceRequest (invoice_requests) 表的contactEmail字段 ===');
  
  try {
    const invoices = await InvoiceRequest.findAll();
    console.log(`找到 ${invoices.length} 个发票申请记录`);
    
    let updatedCount = 0;
    for (const invoice of invoices) {
      if (invoice.contactEmail) {
        const oldEmail = invoice.contactEmail;
        invoice.contactEmail = getRandomEmail();
        await invoice.save();
        updatedCount++;
        
        console.log(`✓ 发票申请 (ID: ${invoice.id}): ${oldEmail} → ${invoice.contactEmail}`);
      }
    }
    
    console.log(`\n✅ InvoiceRequest表: 成功更新 ${updatedCount} 条记录`);
    return updatedCount;
  } catch (error) {
    console.error('❌ 替换InvoiceRequest表email时出错:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  Email 批量随机替换脚本');
  console.log('========================================');
  console.log('\n⚠️  警告：此操作将修改数据库中所有的email地址！');
  console.log('⚠️  请确保已经备份数据库！');
  console.log('\n可用的email地址：');
  AVAILABLE_EMAILS.forEach((email, index) => {
    console.log(`  ${index + 1}. ${email}`);
  });
  console.log('\n等待5秒后开始执行...');
  console.log('如需取消，请按 Ctrl+C\n');
  
  // 等待5秒，给用户取消的机会
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');
    
    // 开始替换
    const startTime = Date.now();
    
    const userCount = await replaceUserEmails();
    const registrationCount = await replaceRegistrationEmails();
    const invoiceCount = await replaceInvoiceEmails();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // 统计信息
    console.log('\n========================================');
    console.log('  执行完成！');
    console.log('========================================');
    console.log(`✅ User表 (backend_userinfo): ${userCount} 条记录`);
    console.log(`✅ RegistrationSubmission表 (backend_registrationsubmission): ${registrationCount} 条记录`);
    console.log(`✅ InvoiceRequest表 (invoice_requests): ${invoiceCount} 条记录`);
    console.log(`\n总计: ${userCount + registrationCount + invoiceCount} 条记录被更新`);
    console.log(`耗时: ${duration} 秒`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ 执行过程中发生错误:', error);
    console.error('\n建议：请检查数据库连接和模型配置');
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
}

// 执行主函数
main().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
