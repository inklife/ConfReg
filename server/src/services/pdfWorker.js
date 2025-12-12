const { parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs').promises;
const QRCode = require('qrcode');
const crypto = require('crypto');

// 导入现有的工具函数
const { getChromiumExecutablePath } = require('../utils/cross-platform-chromium');

// 获取北京时间(UTC+8)的工具函数
function getBeijingTime() {
  const now = new Date();
  // 直接使用 toLocaleString 获取北京时区的时间
  return now;
}

function formatBeijingDateTime(date, format = 'full') {
  // 使用 Asia/Shanghai 时区格式化时间
  if (format === 'date') {
    // YYYY-MM-DD
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    return dateStr;
  } else if (format === 'time') {
    // HH:MM:SS
    const timeStr = date.toLocaleTimeString('en-GB', { 
      timeZone: 'Asia/Shanghai',
      hour12: false 
    });
    return timeStr;
  } else if (format === 'datetime') {
    // YYYY-MM-DD HH:MM:SS
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const timeStr = date.toLocaleTimeString('en-GB', { 
      timeZone: 'Asia/Shanghai',
      hour12: false 
    });
    return `${dateStr} ${timeStr}`;
  }
  return date.toISOString();
}

function generateReceiptNumber(submissionId) {
  const hash = crypto.createHash('md5').update(submissionId.toString()).digest('hex').toUpperCase().slice(0, 6);
  return `ICPADS-${hash}`;
}

async function generateQRCode(data) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
}

function getMarginMode(options) {
  if (!options.margin) return 'standard';
  
  const topMargin = options.margin.top || '5mm';
  if (topMargin === '0mm') return 'none';
  if (topMargin === '2mm') return 'minimal';
  return 'standard';
}

async function renderTemplate(templateName, data) {
  try {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    let template = await fs.readFile(templatePath, 'utf8');
    
    if (templateName === 'registration-info' && data.reviewDate) {
      const reviewTimelineItem = `
                    <div class="timeline-item">
                        <div class="timeline-date">${data.reviewDate}</div>
                        <div class="timeline-event">Registration reviewed and ${data.registrationStatus}</div>
                    </div>`;
      template = template.replace('{{REVIEW_TIMELINE_ITEM}}', reviewTimelineItem);
    } else {
      template = template.replace('{{REVIEW_TIMELINE_ITEM}}', '');
    }
    
    // Handle payment instructions section for receipt template
    if (templateName === 'receipt') {
      if (data.paymentInstructions) {
        const paymentInstructionsSection = `
                <!-- Payment Instructions -->
                <div style="margin-top: 15px; padding: 10px 12px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <div style="font-size: 0.85rem; color: #555; line-height: 1.5; white-space: pre-line;">${data.paymentInstructions}</div>
                </div>`;
        template = template.replace('{{PAYMENT_INSTRUCTIONS_SECTION}}', paymentInstructionsSection);
      } else {
        template = template.replace('{{PAYMENT_INSTRUCTIONS_SECTION}}', '');
      }
    }
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, value || '');
    }
    
    return template;
  } catch (error) {
    console.error('Template rendering error:', error);
    throw error;
  }
}

// Worker中的PDF生成函数
async function generatePDFFromHTML(html, options = {}) {
  let browser;
  try {
    const executablePath = getChromiumExecutablePath();
    
    // 基于测试结果的最小可工作参数集合
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ];

    // macOS 特定参数 - 基于调试测试的成功配置
    if (process.platform === 'darwin') {
      baseArgs.push(
        '--no-zygote',  // 这个组合在测试中成功了
        '--disable-extensions',
        '--no-first-run',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-default-apps',
        '--disable-translate',
        '--disable-logging'
      );
    }
    
    const launchOptions = {
      headless: true,
      executablePath: executablePath,
      timeout: 60000, // 增加超时时间到60秒
      args: baseArgs,
      // macOS 特定的环境变量
      env: process.platform === 'darwin' ? {
        ...process.env,
        'CHROME_NO_SANDBOX': '1'
      } : process.env,
      // 忽略默认参数，使用我们自定义的
      ignoreDefaultArgs: process.platform === 'darwin' ? [
        '--enable-automation',
        '--enable-blink-features=IdleDetection'
      ] : false
    };

    // 添加重试机制
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`🚀 尝试启动 Chromium (尝试 ${retryCount + 1}/${maxRetries + 1})`);
        // 启动参数已优化，详细信息可在调试模式下查看
        
        browser = await puppeteer.launch(launchOptions);
        console.log(`✅ Chromium 启动成功，Browser 实例已创建`);
        
        // 监听浏览器事件
        browser.on('disconnected', () => {
          console.log('🔄 浏览器连接已断开');
        });
        
        browser.on('targetchanged', (target) => {
          console.log(`🎯 Target 状态变化: ${target.type()} - ${target.url()}`);
        });
        
        const page = await browser.newPage();
        console.log(`📄 新页面创建成功`);
        
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1200, height: 800 });
        console.log(`🔧 页面配置完成`);
        
        // 监听页面错误
        page.on('error', err => {
          console.error('❌ Page error:', err);
        });
        
        page.on('pageerror', err => {
          console.error('❌ Page script error:', err);
        });
        
        page.on('response', response => {
          // 只记录非成功状态的响应
          if (response.status() >= 400) {
            console.log(`📡 Response: ${response.status()} ${response.url()}`);
          }
        });
        
        page.on('requestfailed', request => {
          console.error(`❌ Request failed: ${request.url()} - ${request.failure()?.errorText}`);
        });
        
        console.log(`📝 设置页面内容，HTML长度: ${html.length} 字符`);
        await page.setContent(html, { 
          waitUntil: 'networkidle0',
          timeout: 60000 // 增加页面加载超时
        });
        console.log(`✅ 页面内容设置完成，等待渲染...`);
        
        // 等待页面完全渲染
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`🎨 页面渲染等待完成`);
        
        const pdfOptions = {
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          width: '210mm',
          height: '297mm',
          margin: {
            top: '5mm',
            bottom: '5mm', 
            left: '5mm',
            right: '5mm'
          },
          ...options
        };
        
        console.log(`📄 开始生成 PDF，选项:`, JSON.stringify(pdfOptions, null, 2));
        
        // ⏰ 添加 3 秒延迟来测试队列功能
        console.log(`⏰ 开始 3 秒延迟，用于测试队列功能...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 秒 = 3000 毫秒
        console.log(`⏰ 3 秒延迟完成，继续生成 PDF...`);
        
        const pdfBuffer = await page.pdf(pdfOptions);
        console.log(`✅ PDF 生成成功，大小: ${pdfBuffer.length} bytes`);
        
        // 成功生成，跳出重试循环
        return pdfBuffer;
        
      } catch (error) {
        retryCount++;
        console.error(`❌ PDF生成失败 (尝试 ${retryCount}/${maxRetries + 1}):`, error.message);
        
        // 清理浏览器实例
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.warn('浏览器关闭错误:', closeError.message);
          }
          browser = null;
        }
        
        // 如果不是最后一次重试，等待后重试
        if (retryCount <= maxRetries) {
          console.log(`⏳ 等待 ${retryCount * 2} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
        } else {
          // 最后一次重试也失败了，抛出错误
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('❌ Worker PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// PDF生成处理函数
async function generateReceiptPDF(submission, customOptions = {}) {
  try {
    const now = getBeijingTime(); // 使用北京时间
    const receiptNumber = generateReceiptNumber(submission.id);
    const marginMode = getMarginMode(customOptions);
    
    const verificationData = JSON.stringify({
      type: 'receipt',
      receiptNumber,
      submissionId: submission.id,
      amount: submission.product_price,
      date: now.toISOString().split('T')[0]
    });
    
    const qrCodeDataURL = await generateQRCode(verificationData);
    
    // 根据支付方式确定金额和货币
    let amountPaid, currency, currencySymbol, amountDisplay;
    if (submission.payment_method === 'domestic' && submission.total_amount_rmb) {
      amountPaid = submission.total_amount_rmb;
      currency = 'CNY';
      currencySymbol = '¥';
    } else if (submission.payment_method === 'international' && submission.total_amount_usd) {
      amountPaid = submission.total_amount_usd;
      currency = 'USD';
      currencySymbol = '$';
    } else {
      // 后备逻辑：优先USD，其次RMB，最后product_price
      if (submission.total_amount_usd) {
        amountPaid = submission.total_amount_usd;
        currency = 'USD';
        currencySymbol = '$';
      } else if (submission.total_amount_rmb) {
        amountPaid = submission.total_amount_rmb;
        currency = 'CNY';
        currencySymbol = '¥';
      } else {
        amountPaid = submission.product_price;
        currency = 'USD';
        currencySymbol = '$';
      }
    }
    
    // 构建完整的金额显示字符串
    amountDisplay = `${currencySymbol}${amountPaid} ${currency}`;
    
    // 读取两张签名图片并转换为base64
    let signatureBase64_1 = '';
    let signatureBase64_2 = '';
    try {
      const signaturePath1 = path.join(__dirname, '../templates/assets/junwang.jpg');
      const signatureBuffer1 = await fs.readFile(signaturePath1);
      signatureBase64_1 = signatureBuffer1.toString('base64');
      
      const signaturePath2 = path.join(__dirname, '../templates/assets/yunyunfeng.jpg');
      const signatureBuffer2 = await fs.readFile(signaturePath2);
      signatureBase64_2 = signatureBuffer2.toString('base64');
    } catch (error) {
      console.error('Error reading signature images:', error);
    }
    
    // 格式化订单日期 - 使用北京时间
    const orderDate = submission.submission_time ? 
      new Date(submission.submission_time).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      }) + ' (UTC+8)' : 'N/A';
    
    // 根据registration_category确定产品描述
    let productDescription = 'Conference Registration';
    if (submission.registration_category === 'author' || submission.registration_category === 'full') {
      productDescription = 'Full Registration';
    } else if (submission.registration_category === 'attendee') {
      productDescription = 'Attendee Registration';
    }
    
    // 如果有product_code,使用更详细的描述
    if (submission.product_code) {
      productDescription = submission.product_code;
    }

    const templateData = {
      // Event Information
      eventTitle: 'ICPADS 2025 - International Conference on Parallel and Distributed Systems',
      eventLocation: 'Hefei, China',
      eventDates: 'December 14-18, 2025',
      confirmationNumber: receiptNumber,
      
      // Recipient Information
      attendeeName: submission.name,
      attendeeAffiliation: submission.affiliation || '-', // No affiliation provided
      attendeeEmail: submission.email,
      
      // Order Information
      orderNumber: crypto.createHash('md5').update(`${submission.id}-order`).digest('hex').toUpperCase().slice(0, 11),
      invoiceNumber: `ICPADS25-${crypto.createHash('md5').update(`${submission.id}-invoice`).digest('hex').slice(0, 12)}`,
      orderDate: orderDate,
      
      // Product Information
      productDescription: productDescription,
      registrationCategory: submission.registration_category === 'full' ? 'Full Registration' : 
                           submission.registration_category === 'attendee' ? 'Attendee Registration' : 
                           'Conference Registration',
      productPrice: `${currencySymbol}${amountPaid}`,
      quantity: '1',
      itemAmount: `${currencySymbol}${amountPaid}`,
      orderTotal: `${currencySymbol}${amountPaid}`,
      
      // Payment Information
      paymentDate: submission.submission_time ? 
        new Date(submission.submission_time).toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Shanghai'
        }) : 'N/A',
      paymentType: submission.payment_method === 'domestic' ? 'China Mainland Payment' : 'International Payment',
      paymentReference: `${submission.id}`,
      amountPaid: `${currencySymbol}${amountPaid}`,
      
      // Signatures
      signatureImage1: signatureBase64_1,
      signatureImage2: signatureBase64_2,
      signerNames: 'Jun Wang, Yunyun Feng',
      
      // Currency display control
      currencyNoticeDisplay: currency === 'USD' ? 'block' : 'none',
      
      // Payment instructions (from registration submission)
      paymentInstructions: submission.payment_instructions || '',
      
      // Legacy fields (kept for compatibility)
      receiptNumber,
      issueDate: `${formatBeijingDateTime(now, 'date')} (UTC+8)`,
      issueTime: formatBeijingDateTime(now, 'time'),
      paperTitle: submission.paper_id || 'N/A',
      productCode: submission.product_code,
      transactionDate: submission.submission_time ? 
        formatBeijingDateTime(submission.submission_time, 'datetime') : 'N/A',
      generationDateTime: `${formatBeijingDateTime(now, 'datetime')} (UTC+8)`,
      qrCodeDataURL: qrCodeDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      marginMode
    };
    
    const html = await renderTemplate('receipt', templateData);
    return await generatePDFFromHTML(html, customOptions);
  } catch (error) {
    console.error('Worker receipt PDF generation error:', error);
    throw error;
  }
}

async function generateConfirmationLetterPDF(submission, customOptions = {}) {
  try {
    const now = getBeijingTime(); // 使用北京时间
    const verificationCode = crypto.createHash('md5').update(`${submission.id}-${now.getTime()}`).digest('hex').toUpperCase().slice(0, 8);
    const marginMode = getMarginMode(customOptions);
    
    // 格式化北京时间为英文长日期格式
    const issueDateFormatted = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Shanghai'
    });
    
    const templateData = {
      issueDate: `${issueDateFormatted} (UTC+8)`,
      participantName: submission.name,
      emailAddress: submission.email,
      affiliation: submission.affiliation || 'N/A',
      registrationType: submission.product_code,
      registrationDate: submission.submission_time ? 
        submission.submission_time.toISOString().split('T')[0] : 'N/A',
      verificationCode,
      marginMode
    };
    
    const html = await renderTemplate('confirmation-letter', templateData);
    return await generatePDFFromHTML(html, customOptions);
  } catch (error) {
    console.error('Worker confirmation letter PDF generation error:', error);
    throw error;
  }
}

async function generateRegistrationInfoPDF(submission, customOptions = {}) {
  try {
    const now = getBeijingTime(); // 使用北京时间
    
    let statusClass = 'pending';
    if (submission.status === 'approved') statusClass = 'approved';
    else if (submission.status === 'rejected') statusClass = 'rejected';
    
    const marginMode = getMarginMode(customOptions);
    
    const verificationData = JSON.stringify({
      type: 'registration',
      submissionId: submission.id,
      name: submission.name,
      email: submission.email,
      status: submission.status,
      date: now.toISOString().split('T')[0]
    });
    
    const qrCodeDataURL = await generateQRCode(verificationData);
    
    const templateData = {
      fullName: submission.name,
      emailAddress: submission.email,
      phoneNumber: submission.phone || 'N/A',
      affiliation: submission.affiliation || 'N/A',
      paperId: submission.paper_id || 'N/A',
      registrationType: submission.product_code,
      registrationFee: submission.product_price,
      registrationStatus: submission.status?.toUpperCase() || 'PENDING',
      statusClass,
      submissionDate: submission.submission_time ? 
        submission.submission_time.toISOString().split('T')[0] : 'N/A',
      reviewDate: submission.review_time ? 
        submission.review_time.toISOString().split('T')[0] : null,
      generationDateTime: `${formatBeijingDateTime(now, 'datetime')} (UTC+8)`,
      qrCodeDataURL: qrCodeDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      marginMode
    };
    
    const html = await renderTemplate('registration-info', templateData);
    return await generatePDFFromHTML(html, customOptions);
  } catch (error) {
    console.error('Worker registration info PDF generation error:', error);
    throw error;
  }
}

async function generateMealVoucherPDF(mealVoucher, customOptions = {}) {
  try {
    const now = getBeijingTime(); // 使用北京时间
    const marginMode = getMarginMode(customOptions);
    
    // 生成二维码数据
    const verificationData = JSON.stringify({
      type: 'meal-voucher',
      voucherId: mealVoucher.id,
      voucherCode: mealVoucher.voucher_code || mealVoucher.voucherCode,
      name: mealVoucher.attendee_name || mealVoucher.attendeeName,
      email: mealVoucher.email
    });
    
    const qrCodeDataURL = await generateQRCode(verificationData);
    
    // 确定货币和金额
    let currencySymbol, unitPrice, totalAmount;
    const paymentMethod = mealVoucher.payment_method || mealVoucher.paymentMethod;
    
    if (paymentMethod === 'domestic') {
      currencySymbol = '¥';
      unitPrice = mealVoucher.unit_price_rmb || mealVoucher.unitPriceRmb || '1100.00';
      totalAmount = mealVoucher.total_amount_rmb || mealVoucher.totalAmountRmb || '1100.00';
    } else {
      currencySymbol = '$';
      unitPrice = mealVoucher.unit_price_usd || mealVoucher.unitPriceUsd || '150.00';
      totalAmount = mealVoucher.total_amount_usd || mealVoucher.totalAmountUsd || '150.00';
    }
    
    const templateData = {
      MARGIN_CLASS: `margin-${marginMode}`,
      ATTENDEE_NAME: mealVoucher.attendee_name || mealVoucher.attendeeName,
      EMAIL: mealVoucher.email,
      VOUCHER_CODE: mealVoucher.voucher_code || mealVoucher.voucherCode || 'N/A',
      QUANTITY: mealVoucher.quantity || 1,
      CURRENCY_SYMBOL: currencySymbol,
      UNIT_PRICE: unitPrice,
      TOTAL_AMOUNT: totalAmount,
      PAYMENT_METHOD: paymentMethod === 'domestic' ? 'Domestic (RMB)' : 'International (USD)',
      STATUS: (mealVoucher.status || 'pending').toUpperCase(),
      QR_CODE: qrCodeDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      GENERATION_DATE: `${formatBeijingDateTime(now, 'date')} (UTC+8)`
    };
    
    const html = await renderTemplate('meal-voucher', templateData);
    return await generatePDFFromHTML(html, customOptions);
  } catch (error) {
    console.error('Worker banquet ticket PDF generation error:', error);
    throw error;
  }
}

// 为了保持向后兼容性，创建别名
const generateBanquetTicketPDF = generateMealVoucherPDF;

// 监听主线程消息
parentPort.on('message', async (message) => {
  const { taskId, type, workerId, data } = message;
  
  try {
    console.log(`🔄 PDF Worker #${workerId || 'Unknown'} 开始处理任务 ${taskId}, 类型: ${type}`);
    
    // 反序列化日期字段
    if (data.submission) {
      if (data.submission.submission_time && typeof data.submission.submission_time === 'string') {
        data.submission.submission_time = new Date(data.submission.submission_time);
      }
      if (data.submission.review_time && typeof data.submission.review_time === 'string') {
        data.submission.review_time = new Date(data.submission.review_time);
      }
    }
    
    let pdfBuffer;
    
    switch (type) {
      case 'receipt':
        pdfBuffer = await generateReceiptPDF(data.submission, data.options);
        break;
      case 'confirmation-letter':
        pdfBuffer = await generateConfirmationLetterPDF(data.submission, data.options);
        break;
      case 'registration-info':
        pdfBuffer = await generateRegistrationInfoPDF(data.submission, data.options);
        break;
      case 'meal-voucher':
        pdfBuffer = await generateBanquetTicketPDF(data.submission, data.options);
        break;
      default:
        throw new Error(`Unknown PDF type: ${type}`);
    }
    
    // 将Buffer转换为Array以便传输
    const pdfArray = Array.from(pdfBuffer);
    
    console.log(`✅ PDF Worker #${workerId || 'Unknown'} 完成任务 ${taskId}, PDF大小: ${pdfBuffer.length} bytes`);
    
    parentPort.postMessage({
      taskId,
      workerId,
      success: true,
      pdfBuffer: pdfArray
    });
    
  } catch (error) {
    console.error(`❌ PDF Worker #${workerId || 'Unknown'} 任务 ${taskId} 失败:`, error);
    
    parentPort.postMessage({
      taskId,
      workerId,
      success: false,
      error: error.message
    });
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Worker uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Worker unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('📄 PDF Worker 已启动并等待任务分配...');
