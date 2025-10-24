const {sequelize} = require('../src/config/database');

async function checkTables() {
  try {
    const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('数据库中的所有表:');
    results.forEach(r => console.log(' -', r.name));
    
    // 检查 registration_submissions 相关的表
    const submissionTables = results.filter(r => r.name.toLowerCase().includes('submission') || r.name.toLowerCase().includes('registration'));
    console.log('\n注册相关的表:');
    submissionTables.forEach(r => console.log(' -', r.name));
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkTables();
