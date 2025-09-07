const PDFWorkerPool = require('./pdfWorkerPool');

// 创建全局PDF工作池 - 使用按需创建模式
// lazyInit: true = 按需创建Worker，节省启动内存
// lazyInit: false = 预创建Worker，更快响应但占用更多内存
const pdfWorkerPool = new PDFWorkerPool(4, true); // 最多4个Worker，按需创建

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('🔄 收到 SIGINT 信号，正在关闭 PDF Worker Pool...');
  await pdfWorkerPool.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 收到 SIGTERM 信号，正在关闭 PDF Worker Pool...');
  await pdfWorkerPool.shutdown();
  process.exit(0);
});

/**
 * 将Sequelize模型转换为普通对象，以便Worker线程序列化
 * @param {Object} submission - Sequelize模型实例
 * @returns {Object} 普通JavaScript对象
 */
function serializeSubmission(submission) {
  // 如果已经是普通对象，直接返回
  if (!submission.toJSON) {
    return submission;
  }
  
  // 转换为普通对象
  const plainObject = submission.toJSON();
  
  // 确保日期对象被正确序列化
  if (plainObject.submission_time && typeof plainObject.submission_time === 'object') {
    plainObject.submission_time = plainObject.submission_time.toISOString();
  }
  
  if (plainObject.review_time && typeof plainObject.review_time === 'object') {
    plainObject.review_time = plainObject.review_time.toISOString();
  }
  
  return plainObject;
}

/**
 * 使用Worker线程生成收据PDF
 * @param {Object} submission - 提交数据
 * @param {Object} customOptions - PDF选项
 * @returns {Promise<Buffer>} PDF缓冲区
 */
async function generateReceiptPDF(submission, customOptions = {}) {
  try {
    console.log(`📄 请求生成收据PDF: 提交ID ${submission.id}`);
    
    // 序列化提交数据
    const serializedSubmission = serializeSubmission(submission);
    
    const pdfBuffer = await pdfWorkerPool.generatePDF({
      type: 'receipt',
      submission: serializedSubmission,
      options: customOptions
    });
    
    console.log(`✅ 收据PDF生成完成: 提交ID ${submission.id}, 大小: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
    
  } catch (error) {
    console.error(`❌ 收据PDF生成失败: 提交ID ${submission.id}`, error);
    throw error;
  }
}

/**
 * 使用Worker线程生成确认函PDF
 * @param {Object} submission - 提交数据
 * @param {Object} customOptions - PDF选项
 * @returns {Promise<Buffer>} PDF缓冲区
 */
async function generateConfirmationLetterPDF(submission, customOptions = {}) {
  try {
    console.log(`📄 请求生成确认函PDF: 提交ID ${submission.id}`);
    
    // 序列化提交数据
    const serializedSubmission = serializeSubmission(submission);
    
    const pdfBuffer = await pdfWorkerPool.generatePDF({
      type: 'confirmation-letter',
      submission: serializedSubmission,
      options: customOptions
    });
    
    console.log(`✅ 确认函PDF生成完成: 提交ID ${submission.id}, 大小: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
    
  } catch (error) {
    console.error(`❌ 确认函PDF生成失败: 提交ID ${submission.id}`, error);
    throw error;
  }
}

/**
 * 使用Worker线程生成注册信息PDF
 * @param {Object} submission - 提交数据
 * @param {Object} customOptions - PDF选项
 * @returns {Promise<Buffer>} PDF缓冲区
 */
async function generateRegistrationInfoPDF(submission, customOptions = {}) {
  try {
    console.log(`📄 请求生成注册信息PDF: 提交ID ${submission.id}`);
    
    // 序列化提交数据
    const serializedSubmission = serializeSubmission(submission);
    
    const pdfBuffer = await pdfWorkerPool.generatePDF({
      type: 'registration-info',
      submission: serializedSubmission,
      options: customOptions
    });
    
    console.log(`✅ 注册信息PDF生成完成: 提交ID ${submission.id}, 大小: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
    
  } catch (error) {
    console.error(`❌ 注册信息PDF生成失败: 提交ID ${submission.id}`, error);
    throw error;
  }
}

/**
 * 获取PDF工作池状态
 * @returns {Object} 工作池统计信息
 */
function getPDFWorkerPoolStats() {
  return pdfWorkerPool.getStats();
}

/**
 * 检查PDF服务健康状态
 * @returns {Object} 健康状态信息
 */
function getHealthStatus() {
  const stats = pdfWorkerPool.getStats();
  const memUsage = process.memoryUsage();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    workers: stats.workers,
    queue: stats.queue,
    performance: stats.stats,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    }
  };
}

// 保持与原始pdfGenerator.js的兼容性
const crypto = require('crypto');

/**
 * 生成收据编号
 * @param {number} submissionId - 提交ID
 * @returns {string} 收据编号
 */
function generateReceiptNumber(submissionId) {
  const hash = crypto.createHash('md5').update(submissionId.toString()).digest('hex').toUpperCase().slice(0, 6);
  return `ICPADS-${hash}`;
}

module.exports = {
  generateReceiptPDF,
  generateConfirmationLetterPDF,
  generateRegistrationInfoPDF,
  generateReceiptNumber,
  getPDFWorkerPoolStats,
  getHealthStatus,
  pdfWorkerPool // 导出工作池实例以便测试和监控
};
