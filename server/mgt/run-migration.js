/**
 * 数据库迁移脚本
 * 运行指定的 SQL 迁移文件
 */

const path = require('path');
const fs = require('fs');
const { sequelize } = require('../src/config/database');

async function runMigration(migrationFile) {
  try {
    console.log('🚀 开始数据库迁移...');
    console.log(`📄 迁移文件: ${migrationFile}`);
    
    // 读取 SQL 文件
    const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ 迁移文件不存在: ${migrationPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('📖 已读取 SQL 内容');
    
    // 分割 SQL 语句（按分号分割，但忽略注释）
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 找到 ${statements.length} 条 SQL 语句`);
    
    // 开始事务
    const transaction = await sequelize.transaction();
    
    try {
      // 执行每条 SQL 语句
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`\n执行语句 ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        await sequelize.query(statement, { transaction });
        console.log('✅ 执行成功');
      }
      
      // 提交事务
      await transaction.commit();
      console.log('\n✅ 所有迁移语句执行成功');
      console.log('✅ 事务已提交');
      
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      console.error('❌ 迁移失败，已回滚事务');
      throw error;
    }

    console.log('\n🎉 迁移成功完成！所有字段已添加。');

    
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

console.log('='.repeat(60));
console.log('    数据库迁移工具');
console.log('='.repeat(60));

runMigration(migrationFile)
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
