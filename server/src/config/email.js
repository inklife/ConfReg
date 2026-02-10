/**
 * ICPADS 2025 邮箱服务配置文件
 * 支持阿里云企业邮箱服务
 * 
 * 注意：环境变量已在 app.js 中加载，这里直接使用 process.env
 */

// 会议名称配置（从环境变量读取）
const CONFERENCE_NAME = process.env.CONFREG_CONFERENCE_NAME || 'ICPADS 2025';
const CONFERENCE_NAME_SHORT = process.env.CONFREG_CONFERENCE_NAME_SHORT || 'ICPADS2025';
const CONFERENCE_NAME_FULL = process.env.CONFREG_CONFERENCE_NAME_FULL || 'International Conference on Parallel and Distributed Systems';

const emailConfig = {
  // 阿里云企业邮箱SMTP配置
  smtp: {
    host: process.env.CONFREG_EMAIL_HOST || 'smtp.qiye.aliyun.com',
    port: process.env.CONFREG_EMAIL_PORT || 465,
    secure: true, // 使用SSL
    auth: {
      user: process.env.CONFREG_EMAIL_USER, // 企业邮箱账号，必须在环境变量中配置
      pass: process.env.CONFREG_EMAIL_PASSWORD // 企业邮箱密码，必须在环境变量中配置
    },
    tls: {
      rejectUnauthorized: false
    }
  },
  
  // 默认发件人信息
  from: {
    name: process.env.CONFREG_EMAIL_FROM_NAME || CONFERENCE_NAME,
    address: process.env.CONFREG_EMAIL_FROM_ADDRESS || process.env.CONFREG_EMAIL_USER
  },
  
  // 邮件模板配置
  templates: {
    // 邮箱验证模板
    verification: {
      subject: `${CONFERENCE_NAME} - 邮箱验证`,
      template: 'verification'
    },
    // 密码重置模板
    passwordReset: {
      subject: `${CONFERENCE_NAME} - 密码重置`,
      template: 'password-reset'
    },
    // 注册确认模板
    registrationConfirm: {
      subject: `${CONFERENCE_NAME} - 注册确认`,
      template: 'registration-confirm'
    }
  },
  
  // 会议名称配置
  conference: {
    name: CONFERENCE_NAME,
    nameShort: CONFERENCE_NAME_SHORT,
    nameFull: CONFERENCE_NAME_FULL
  },
  
  // 验证码配置
  verification: {
    codeLength: 6, // 验证码长度
    expiryMinutes: 15, // 验证码有效期（分钟）
    maxAttempts: 5 // 最大尝试次数
  }
};

// 验证邮箱配置
const validateEmailConfig = () => {
  const errors = [];
  
  if (!emailConfig.smtp.auth.user) {
    errors.push('CONFREG_EMAIL_USER 环境变量未配置');
  }
  
  if (!emailConfig.smtp.auth.pass) {
    errors.push('CONFREG_EMAIL_PASSWORD 环境变量未配置');
  }
  
  if (!emailConfig.from.address) {
    errors.push('CONFREG_EMAIL_FROM_ADDRESS 环境变量未配置');
  }
  
  if (errors.length > 0) {
    console.warn('⚠️  邮箱配置警告:');
    errors.forEach(error => console.warn(`   - ${error}`));
    console.warn('   请在 .env 文件中配置以下环境变量:');
    console.warn('   - CONFREG_EMAIL_USER=your-email@yourdomain.com');
    console.warn('   - CONFREG_EMAIL_PASSWORD=your-email-password');
    console.warn('   - CONFREG_EMAIL_FROM_ADDRESS=your-email@yourdomain.com');
    console.warn(`   - CONFREG_EMAIL_FROM_NAME=${CONFERENCE_NAME}`);
  }
  
  return errors.length === 0;
};

module.exports = {
  emailConfig,
  validateEmailConfig
};
