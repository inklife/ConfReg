/**
 * JavaScript 迁移脚本运行器
 * 运行 JavaScript 格式的数据库迁移文件
 */

const path = require('path');
const fs = require('fs');
const { sequelize } = require('../src/config/database');

async function runJSMigration(migrationFile) {
  try {
    console.log('🚀 开始数据库迁移...');
    console.log(`📄 迁移文件: ${migrationFile}`);
    
    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ 迁移文件不存在: ${migrationPath}`);
      process.exit(1);
    }
    
    // 加载迁移模块
    const migration = require(migrationPath);
    console.log('📖 已加载迁移模块');
    
    if (!migration.up || typeof migration.up !== 'function') {
      console.error('❌ 迁移文件必须导出一个 up 函数');
      process.exit(1);
    }
    
    // 执行迁移
    console.log('\n📝 执行迁移...');
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    
    console.log('\n✅ 迁移成功完成！');
    
  } catch (error) {
    console.error('❌ 迁移执行失败:');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// 从命令行参数获取迁移文件名
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ 请提供迁移文件名作为参数');
  console.log('用法: node run-js-migration.js <migration-file.js>');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('    JavaScript 数据库迁移工具');
console.log('='.repeat(60));

runJSMigration(migrationFile)
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('    迁移完成');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch(error => {
    console.error('\n迁移失败:', error);
    process.exit(1);
  });
