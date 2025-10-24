const {sequelize} = require('../src/config/database');

async function checkColumns() {
  try {
    const [results] = await sequelize.query("PRAGMA table_info(backend_registrationsubmission)");
    console.log('backend_registrationsubmission 表的所有字段:');
    console.log('');
    results.forEach(r => {
      console.log(`  ${r.name.padEnd(30)} ${r.type.padEnd(15)} ${r.notnull ? 'NOT NULL' : 'NULL'.padEnd(8)} ${r.dflt_value ? 'DEFAULT: ' + r.dflt_value : ''}`);
    });
    
    const paperTypeField = results.find(r => r.name === 'paper_type');
    if (paperTypeField) {
      console.log('\n✅ paper_type 字段已成功添加!');
      console.log('   类型:', paperTypeField.type);
      console.log('   默认值:', paperTypeField.dflt_value);
    } else {
      console.log('\n❌ paper_type 字段未找到');
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkColumns();
