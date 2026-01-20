/**
 * 会议注册系统邮件服务工具类
 * 提供邮件发送、验证码生成等功能
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { emailConfig, validateEmailConfig } = require('../config/email');

// 会议名称（从配置中读取）
const CONFERENCE_NAME = emailConfig.conference.name;
const CONFERENCE_NAME_SHORT = emailConfig.conference.nameShort;

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  /**
   * 初始化邮件服务
   */
  async init() {
    try {
      // 验证配置
      this.isConfigured = validateEmailConfig();
      
      if (!this.isConfigured) {
        console.warn('⚠️  邮件服务未完全配置，部分功能可能不可用');
        return;
      }

      // 创建邮件传输器
      this.transporter = nodemailer.createTransport(emailConfig.smtp);
      
      // 验证SMTP连接
      await this.verifyConnection();
      
      console.log('✅ 邮件服务初始化成功');
      
    } catch (error) {
      console.error('❌ 邮件服务初始化失败:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * 验证SMTP连接
   */
  async verifyConnection() {
    if (!this.transporter) {
      throw new Error('邮件传输器未初始化');
    }
    
    try {
      await this.transporter.verify();
      console.log('✅ SMTP连接验证成功');
      return true;
    } catch (error) {
      console.error('❌ SMTP连接验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送邮件
   * @param {Object} options - 邮件选项
   * @param {string} options.to - 收件人邮箱
   * @param {string} options.subject - 邮件主题
   * @param {string} options.html - HTML内容
   * @param {string} options.text - 纯文本内容
   */
  async sendEmail(options) {
    if (!this.isConfigured) {
      throw new Error('邮件服务未配置');
    }

    if (!this.transporter) {
      throw new Error('邮件传输器未初始化');
    }

    const mailOptions = {
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ 邮件发送成功: ${options.to}`);
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      console.error(`❌ 邮件发送失败: ${options.to}`, error.message);
      throw error;
    }
  }

  /**
   * 生成验证码
   * @param {number} length - 验证码长度
   * @returns {string} 验证码
   */
  generateVerificationCode(length = emailConfig.verification.codeLength) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[crypto.randomInt(0, digits.length)];
    }
    return code;
  }

  /**
   * 发送注册邮箱验证码
   * @param {string} email - 邮箱地址
   * @param {string} userName - 用户名
   * @param {string} verificationCode - 验证码
   * @returns {Object} 发送结果
   */
  async sendRegistrationVerificationEmail(email, userName, verificationCode) {
    const subject = `${CONFERENCE_NAME} - Email Verification for Registration`;
    const html = this.generateRegistrationVerificationEmailHTML(verificationCode, userName);
    const text = this.generateRegistrationVerificationEmailText(verificationCode, userName);
    
    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        html,
        text
      });
      
      return {
        success: true,
        message: 'Registration verification code sent',
        expiryMinutes: 15
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 发送其他类型验证码邮件（统一方法）
   * @param {string} email - 邮箱地址
   * @param {string} userName - 用户名
   * @param {string} verificationCode - 验证码
   * @param {string} type - 验证类型
   * @returns {Object} 发送结果
   */
  async sendVerificationEmailWithCode(email, userName, verificationCode, type = 'email-verification') {
    let subject, html, text;
    
    switch (type) {
      case 'username-update':
        subject = `${CONFERENCE_NAME} - Username Update Verification`;
        html = this.generateUsernameUpdateVerificationHTML(verificationCode, userName);
        text = this.generateUsernameUpdateVerificationText(verificationCode, userName);
        break;
      case 'password-reset':
        subject = `${CONFERENCE_NAME} - Password Reset Verification`;
        html = this.generateVerificationEmailHTML(verificationCode, userName);
        text = this.generateVerificationEmailText(verificationCode, userName);
        break;
      case 'backup-email':
        subject = `${CONFERENCE_NAME} - Backup Email Verification`;
        html = this.generateVerificationEmailHTML(verificationCode, userName);
        text = this.generateVerificationEmailText(verificationCode, userName);
        break;
      default:
        subject = `${CONFERENCE_NAME} - Email Verification`;
        html = this.generateVerificationEmailHTML(verificationCode, userName);
        text = this.generateVerificationEmailText(verificationCode, userName);
    }
    
    try {
      const result = await this.sendEmail({
        to: email,
        subject,
        html,
        text
      });
      
      return {
        success: true,
        message: '验证码已发送',
        expiryMinutes: 15
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 发送密码重置邮件（统一方法：包含安全码和链接）
   * @param {string} email - 邮箱地址
   * @param {string} userName - 用户名
   * @param {string} resetCode - 重置安全码
   * @param {string} resetLink - 重置链接
   * @returns {Object} 发送结果
   */
  async sendPasswordResetEmail(email, userName, resetCode, resetLink) {
    const subject = `${CONFERENCE_NAME} - Password Reset`;
    const html = this.generatePasswordResetEmailHTML(userName, resetCode, resetLink);
    const text = this.generatePasswordResetEmailText(userName, resetCode, resetLink);
    
    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  /**
   * 生成注册邮箱验证HTML模板
   */
  generateRegistrationVerificationEmailHTML(code, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .verification-code { 
            background-color: #28a745; 
            color: white; 
            padding: 20px 30px; 
            font-size: 32px; 
            font-weight: bold;
            text-align: center; 
            border-radius: 8px; 
            margin: 25px 0;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            border: 3px solid #1e7e34;
          }
          .instructions {
            background-color: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          .warning { color: #dc3545; font-weight: bold; }
          .highlight { color: #007bff; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2>${CONFERENCE_NAME} - Registration Email Verification</h2>
          </div>
          <div class="content">
            <p>Dear ${userName || 'User'},</p>
            <p>Thank you for joining ${CONFERENCE_NAME}! To complete your registration, please verify your email address using the verification code below:</p>
            
            <div class="verification-code">${code}</div>
            
            <div class="instructions">
              <h3>How to verify your email:</h3>
              <ol>
                <li>Return to the registration page</li>
                <li>Enter the 6-digit verification code above</li>
                <li>Click "Verify Email" button</li>
                <li>Complete your registration</li>
              </ol>
            </div>
            
            <p><span class="warning">⚠️ This verification code will expire in 15 minutes.</span></p>
            <p>This code is required to complete your account registration. If you did not request this verification, please ignore this email.</p>
            
            <p class="highlight">Why email verification is required:</p>
            <ul>
              <li>Ensures account security</li>
              <li>Enables important conference notifications</li>
              <li>Required for password recovery</li>
              <li>Confirms your contact information</li>
            </ul>
            
            <p>After verification, you'll be able to create your account and access all conference features.</p>
            
            <p>Best regards,<br>${CONFERENCE_NAME} Conference Team</p>
          </div>
          <div class="footer">
            <p>This email was sent automatically. Please do not reply.</p>
            <p>© ${CONFERENCE_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成注册邮箱验证纯文本模板
   */
  generateRegistrationVerificationEmailText(code, userName) {
    return `
${CONFERENCE_NAME} - Registration Email Verification

Dear ${userName || 'User'},

Thank you for joining ${CONFERENCE_NAME}! To complete your registration, please verify your email address using the verification code below:

VERIFICATION CODE: ${code}

How to verify your email:
1. Return to the registration page
2. Enter the 6-digit verification code above
3. Click "Verify Email" button
4. Complete your registration

⚠️ This verification code will expire in 15 minutes.

This code is required to complete your account registration. If you did not request this verification, please ignore this email.

Why email verification is required:
- Ensures account security
- Enables important conference notifications
- Required for password recovery
- Confirms your contact information

After verification, you'll be able to create your account and access all conference features.

Best regards,
${CONFERENCE_NAME} Conference Team

This email was sent automatically. Please do not reply.
© ${CONFERENCE_NAME}
    `;
  }

  /**
   * 生成邮箱验证HTML模板
   */
  generateVerificationEmailHTML(code, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .verification-code { 
            background-color: #007bff; 
            color: white; 
            padding: 15px 25px; 
            font-size: 24px; 
            font-weight: bold;
            text-align: center; 
            border-radius: 5px; 
            margin: 20px 0;
            letter-spacing: 3px;
          }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2>${CONFERENCE_NAME} 邮箱验证</h2>
          </div>
          <div class="content">
            <p>亲爱的 ${userName || '用户'}，</p>
            <p>您正在进行邮箱验证，您的验证码是：</p>
            <div class="verification-code">${code}</div>
            <p><strong>验证码有效期为 ${emailConfig.verification.expiryMinutes} 分钟</strong></p>
            <p>如果您没有申请此验证码，请忽略此邮件。</p>
            <p>感谢您使用 ${CONFERENCE_NAME} 会议注册系统！</p>
          </div>
          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>© ${CONFERENCE_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成邮箱验证纯文本模板
   */
  generateVerificationEmailText(code, userName) {
    return `
${CONFERENCE_NAME} 邮箱验证

亲爱的 ${userName || '用户'}，

您正在进行邮箱验证，您的验证码是：${code}

验证码有效期为 ${emailConfig.verification.expiryMinutes} 分钟。

如果您没有申请此验证码，请忽略此邮件。

感谢您使用 ${CONFERENCE_NAME} 会议注册系统！

此邮件由系统自动发送，请勿回复。
© ${CONFERENCE_NAME}
    `;
  }

  /**
   * 生成密码重置HTML模板（英文版，包含安全码和链接）
   */
  generatePasswordResetEmailHTML(userName, resetCode, resetLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .security-code { 
            background-color: #dc3545; 
            color: white; 
            padding: 20px 30px; 
            font-size: 32px; 
            font-weight: bold;
            text-align: center; 
            border-radius: 8px; 
            margin: 25px 0;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            border: 3px solid #c82333;
          }
          .reset-button { 
            background-color: #007bff; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
            font-size: 16px;
          }
          .instructions {
            background-color: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          .warning { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2>${CONFERENCE_NAME} Password Reset</h2>
          </div>
          <div class="content">
            <p>Dear ${userName},</p>
            <p>You have requested to reset your password. You can reset your password using either method below:</p>
            
            <div class="instructions">
              <h3>Method 1: Use Security Code</h3>
              <p>Enter this security code on the password reset page:</p>
            </div>
            <div class="security-code">${resetCode}</div>
            
            <div class="instructions">
              <h3>Method 2: Click Reset Link</h3>
              <p>Or simply click the button below to reset your password directly:</p>
            </div>
            <p style="text-align: center;">
              <a href="${resetLink}" class="reset-button">Reset Password</a>
            </p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
            
            <p class="warning">⚠️ This security code will expire in 30 minutes.</p>
            <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
            
            <p>Best regards,<br>${CONFERENCE_NAME} Conference Team</p>
          </div>
          <div class="footer">
            <p>This email was sent automatically. Please do not reply.</p>
            <p>© ${CONFERENCE_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成密码重置纯文本模板（英文版，包含安全码和链接）
   */
  generatePasswordResetEmailText(userName, resetCode, resetLink) {
    return `
${CONFERENCE_NAME} Password Reset

Dear ${userName},

You have requested to reset your password. You can reset your password using either method below:

METHOD 1: SECURITY CODE
Enter this security code on the password reset page:

${resetCode}

METHOD 2: RESET LINK
Copy and paste this link into your browser:

${resetLink}

IMPORTANT: This security code will expire in 30 minutes.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
${CONFERENCE_NAME} Conference Team

This email was sent automatically. Please do not reply.
© ${CONFERENCE_NAME}
    `;
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      connected: this.transporter !== null,
      config: {
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        fromName: emailConfig.from.name,
        fromAddress: emailConfig.from.address
      }
    };
  }

  /**
   * 生成用户名更新验证HTML模板
   */
  generateUsernameUpdateVerificationHTML(code, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .verification-code { 
            background-color: #ff6b35; 
            color: white; 
            padding: 20px 30px; 
            font-size: 32px; 
            font-weight: bold;
            text-align: center; 
            border-radius: 8px; 
            margin: 25px 0;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            border: 3px solid #e55a2b;
          }
          .security-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #fdcb6e;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          .warning { color: #dc3545; font-weight: bold; }
          .highlight { color: #007bff; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2>${CONFERENCE_NAME} - Username Update Verification</h2>
          </div>
          <div class="content">
            <p>Dear ${userName || 'User'},</p>
            <p>You have requested to update your username for your ${CONFERENCE_NAME} account. For security purposes, please verify this action using the verification code below:</p>
            
            <div class="verification-code">${code}</div>
            
            <div class="security-notice">
              <h4>🔒 Security Notice</h4>
              <p><strong>Username can only be changed once every 7 days.</strong></p>
              <p>If you did not request this username change, please ignore this email and consider changing your account password.</p>
            </div>
            
            <p><strong>This verification code will expire in 15 minutes.</strong></p>
            <p>Please enter this code on the username update page to confirm your change.</p>
            
            <p>Best regards,<br>${CONFERENCE_NAME} Team</p>
          </div>
          <div class="footer">
            <p>This email was sent automatically. Please do not reply to this message.</p>
            <p>© ${CONFERENCE_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成用户名更新验证纯文本模板
   */
  generateUsernameUpdateVerificationText(code, userName) {
    return `
${CONFERENCE_NAME} - Username Update Verification

Dear ${userName || 'User'},

You have requested to update your username for your ${CONFERENCE_NAME} account. For security purposes, please verify this action using the verification code below:

Verification Code: ${code}

SECURITY NOTICE:
- Username can only be changed once every 7 days.
- If you did not request this username change, please ignore this email and consider changing your account password.

This verification code will expire in 15 minutes.
Please enter this code on the username update page to confirm your change.

Best regards,
${CONFERENCE_NAME} Team

---
This email was sent automatically. Please do not reply to this message.
© ${CONFERENCE_NAME}
    `;
  }
}

const emailService = new EmailService();

module.exports = emailService;
