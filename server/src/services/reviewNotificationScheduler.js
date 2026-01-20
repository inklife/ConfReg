/**
 * 审核通知定时任务服务
 * 
 * 每天北京时间 9:00 检查过去24小时内审核的注册，发送通知邮件
 * 这样可以给管理员留出反应时间，避免手误操作导致立即发送邮件
 * 
 * 使用 node-cron 实现稳定的定时任务调度
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const RegistrationSubmission = require('../models/RegistrationSubmission');
const emailService = require('../config/email');

// 会议名称
const CONFERENCE_NAME = process.env.CONFERENCE_NAME || 'ICPADS 2025';

/**
 * 发送审核通过邮件
 */
async function sendApprovalEmail(submission) {
  const userName = submission.name || 'Attendee';
  const subject = `${CONFERENCE_NAME} - Registration Approved`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, Helvetica, sans-serif; color:#111;">
        <p>Dear ${userName},</p>
        <p>Your ${CONFERENCE_NAME} registration has been <strong style="color:#16a34a;">approved</strong>.</p>
        <p>
          Registration Info:<br/>
          - Product: <strong>${submission.product_code || 'N/A'}</strong><br/>
          - Paper ID: <strong>${submission.paper_id || 'N/A'}</strong>
        </p>
        <p>Thank you for your registration. We look forward to seeing you at the conference.</p>
        <p style="background-color:#f0f9ff; border-left:4px solid #3b82f6; padding:12px; margin:16px 0;">
          <strong style="color:#1e40af;">📄 Invoice Application</strong><br/>
          <span style="color:#374151; font-size:14px;">You can now apply for an invoice through your user dashboard.</span>
        </p>
        <p style="color:#6b7280; font-size:12px;">This email was sent automatically. Please do not reply.</p>
      </body>
    </html>`;
  const text = `Dear ${userName},\n\nYour ${CONFERENCE_NAME} registration has been approved.\n\nProduct: ${submission.product_code || 'N/A'}\nPaper ID: ${submission.paper_id || 'N/A'}\n\n📄 Invoice Application:\nYou can now apply for an invoice through your user dashboard.\n\nThank you.`;

  await emailService.sendEmail({
    to: submission.email,
    subject,
    html,
    text
  });
}

/**
 * 发送审核拒绝邮件
 */
async function sendRejectionEmail(submission) {
  const userName = submission.name || 'Attendee';
  const reason = (submission.review_notes || '').trim();
  const subject = `${CONFERENCE_NAME} - Registration Rejected`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, Helvetica, sans-serif; color:#111;">
        <p>Dear ${userName},</p>
        <p>We regret to inform you that your ${CONFERENCE_NAME} registration has been <strong style="color:#dc2626;">rejected</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : ''}
        <p>You may contact the organizing committee for further assistance.</p>
        <p style="color:#6b7280; font-size:12px;">This email was sent automatically. Please do not reply.</p>
      </body>
    </html>`;
  const text = `Dear ${userName},\n\nYour ${CONFERENCE_NAME} registration has been rejected.${reason ? `\nReason: ${reason}` : ''}\n\nYou may contact the organizing committee for further assistance.`;

  await emailService.sendEmail({
    to: submission.email,
    subject,
    html,
    text
  });
}

/**
 * 处理待发送的审核通知
 * 查找过去24小时内审核的注册并发送邮件
 */
async function processReviewNotifications() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  console.log(`[ReviewNotification] 开始处理审核通知 - ${now.toISOString()}`);
  console.log(`[ReviewNotification] 查找时间范围: ${twentyFourHoursAgo.toISOString()} ~ ${now.toISOString()}`);

  try {
    // 查找过去24小时内审核通过或拒绝的注册
    const submissions = await RegistrationSubmission.findAll({
      where: {
        review_time: {
          [Op.gte]: twentyFourHoursAgo,
          [Op.lte]: now
        },
        status: {
          [Op.in]: ['approved', 'rejected']
        }
      },
      order: [['review_time', 'ASC']]
    });

    console.log(`[ReviewNotification] 找到 ${submissions.length} 条待发送通知`);

    let successCount = 0;
    let failCount = 0;

    for (const submission of submissions) {
      try {
        if (submission.status === 'approved') {
          await sendApprovalEmail(submission);
          console.log(`[ReviewNotification] ✅ 发送批准邮件成功: ID=${submission.id}, Email=${submission.email}`);
        } else if (submission.status === 'rejected') {
          await sendRejectionEmail(submission);
          console.log(`[ReviewNotification] ✅ 发送拒绝邮件成功: ID=${submission.id}, Email=${submission.email}`);
        }
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`[ReviewNotification] ❌ 发送邮件失败: ID=${submission.id}, Email=${submission.email}`, error.message);
      }

      // 每封邮件之间间隔500ms，避免发送过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[ReviewNotification] 处理完成: 成功=${successCount}, 失败=${failCount}`);
    return { total: submissions.length, success: successCount, fail: failCount };

  } catch (error) {
    console.error('[ReviewNotification] 处理审核通知时出错:', error);
    throw error;
  }
}

/**
 * 启动定时任务
 * 使用 node-cron，每天北京时间 9:00 执行
 * 
 * Cron 表达式: '0 9 * * *' 表示每天9点执行
 * timezone: 'Asia/Shanghai' 确保使用北京时间
 */
function startScheduler() {
  console.log('[ReviewNotification] 启动审核通知定时任务 (node-cron)...');

  // 每天北京时间 9:00 执行
  const task = cron.schedule('0 9 * * *', async () => {
    console.log(`[ReviewNotification] 定时任务触发 - ${new Date().toISOString()}`);
    try {
      await processReviewNotifications();
    } catch (error) {
      console.error('[ReviewNotification] 定时任务执行失败:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'  // 北京时间
  });

  // 显示下次执行时间
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  console.log(`[ReviewNotification] 当前北京时间: ${beijingTime.toLocaleString('zh-CN')}`);
  console.log('[ReviewNotification] 任务将在每天北京时间 09:00 执行');
  console.log('[ReviewNotification] 定时任务已启动 ✅');

  return task;
}

module.exports = {
  startScheduler,
  processReviewNotifications, // 导出用于手动触发或测试
  sendApprovalEmail,
  sendRejectionEmail
};
