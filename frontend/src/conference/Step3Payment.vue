<template>
  <div class="step-container">
    <div class="header">
      <h1>Step 3: Payment</h1>
      <div class="progress-container">
        <button 
          class="progress-nav-btn progress-nav-left"
          @click="goBack"
          title="Previous step"
        >
          <i class="el-icon-arrow-left"></i>
        </button>
        <div class="progress-bar">
          <div class="progress" :style="{ width: '60%' }"></div>
        </div>
        <button 
          class="progress-nav-btn progress-nav-right"
          @click="nextStep"
          :disabled="!canProceed"
          title="Next step"
        >
          <i class="el-icon-arrow-right"></i>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- 订单摘要 -->
      <div class="order-summary">
        <h3>Order Summary</h3>
        <div class="summary-row">
          <span>Registration Type:</span>
          <strong>{{ selectedProduct && selectedProduct.code || 'Not selected' }}</strong>
        </div>
        <div class="summary-row">
          <span>Base Registration Fee:</span>
          <strong>${{ selectedProduct && selectedProduct.price || 0 }} USD</strong>
        </div>
        <div v-if="extraPagesCount > 0" class="summary-row">
          <span>Extra Page Fee ({{ extraPagesCount }} page{{ extraPagesCount > 1 ? 's' : '' }}<template v-if="userInfo.paperType === 'research'">, pages {{ parseInt(userInfo.paperPages) - extraPagesCount + 1 }}-{{ userInfo.paperPages }}</template><template v-else-if="userInfo.paperType === 'poster'">, pages {{ parseInt(userInfo.paperPages) - extraPagesCount + 1 }}-{{ userInfo.paperPages }}</template>):</span>
          <strong>${{ extraPageFee }} USD</strong>
        </div>
        <div class="summary-row total-row">
          <span>Total Amount:</span>
          <div>
            <strong class="price">${{ totalAmount }} USD</strong>
            <div v-if="selectedMethod === 'domestic'" class="rmb-price">¥{{ totalAmountDomesticRMB }} RMB</div>
          </div>
        </div>
      </div>

      <!-- 价格免责声明 -->
      <div class="price-disclaimer-wrapper" v-if="serverConfig && serverConfig.deadlines && serverConfig.deadlines.priceDisclaimer">
        <el-collapse v-model="priceDisclaimerActive">
          <el-collapse-item name="1">
            <template slot="title">
              <i class="el-icon-info"></i>
              <span class="collapse-title">Price Information Notice</span>
            </template>
            <div class="disclaimer-content" v-html="serverConfig.deadlines.priceDisclaimer"></div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 支付方式选择 -->
      <div class="payment-methods">
        <h3>Select Payment Method</h3>
        <div class="method-grid">
          <div 
            v-for="method in paymentMethods" 
            :key="method.id"
            class="method-card"
            :class="{ 'selected': selectedMethod === method.id }"
            @click="selectMethod(method.id)"
          >
            <i :class="method.icon" class="method-icon"></i>
            <div class="method-name">{{ method.name }}</div>
            <div class="method-desc">{{ method.description }}</div>
          </div>
        </div>
      </div>

      <!-- 支付详情 -->
      <div v-if="selectedMethod" class="payment-details">
        <div v-if="selectedMethod === 'international'" class="bank-payment">
          <h3>International Bank Transfer</h3>
          
          <!-- 手续费提示 -->
          <div class="transfer-fee-notice-wrapper">
            <div class="transfer-fee-notice-box" @click="showTransferFeeDialog = true">
              <i class="el-icon-warning"></i>
              <span class="notice-text">Important Notice about Transfer Fees</span>
              <i class="el-icon-arrow-right arrow-icon"></i>
            </div>
          </div>
          
          <div class="bank-info">
            <div class="info-section">
              <h4>Beneficiary's Details</h4>
              <p><strong>Account Number:</strong> 01266320164304</p>
              <p><strong>Name:</strong> YUAN LONGZHI</p>
              <p><strong>Phone:</strong> +852 97562070</p>
              <p><strong>Address:</strong></p>
              <p class="address-line">ROOM G7751, YEUNGKIN MAN BUILD.</p>
              <p class="address-line">CITY UNIVERSITY OF HONG KONG</p>
              <p class="address-line">83,TAT CHEE AVENUE, KLN HONG KONG</p>
            </div>
            
            <div class="info-section">
              <h4>Beneficiary's Bank Details</h4>
              <p><strong>Country / Region:</strong> Hong Kong</p>
              <p><strong>SWIFT Code:</strong> BKCHHKHHXXX</p>
              <p><strong>Bank Name:</strong> Bank of China (Hong Kong) Limited</p>
              <p><strong>Bank Address:</strong> 1 Garden Road,Central, Hong Kong</p>
            </div>
            
            <div class="info-section">
              <p><strong>Reference:</strong> Name+ICPADS 2025+PaperID</p>
            </div>
          </div>
          <div class="reference-box">
            <div class="ref-title">Transfer reference</div>
            <div class="ref-format">Format: <code>Name+ICPADS 2025+PaperID</code></div>
            <div class="ref-copy">
              <el-input :value="transferReferenceFilled" readonly size="small" class="ref-input"></el-input>
              <el-button size="small" @click="copyReference(transferReferenceFilled)"><i class="el-icon-document-copy"></i> Copy</el-button>
            </div>
          </div>
          <div class="note">
            After successful transfer, please submit the transfer receipt in <strong>Step 4</strong>.
          </div>
        </div>

        <div v-if="selectedMethod === 'domestic'" class="qr-payment">
          <h3>Domestic Payment</h3>
          <div class="amount-display">
            <div class="amount-row">
              <span>Amount to Pay:</span>
              <strong class="rmb-amount">¥{{ totalAmountDomesticRMB }} RMB</strong>
            </div>
          </div>
          <div class="bank-info domestic-bank">
            <p><strong>账户名称：</strong>合肥博研会议会务服务有限公司</p>
            <p><strong>开户行：</strong>中国邮政储蓄银行股份有限公司安徽自贸试验区合肥片区支行</p>
            <p><strong>账户号码：</strong>934012013000728814</p>
            <p><strong>转账附言：</strong> Name+ICPADS 2025+PaperID</p>
          </div>
          <div class="reference-box cn">
            <div class="ref-title">转账附言</div>
            <div class="ref-format">格式：<code>Name+ICPADS 2025+PaperID</code></div>
            <div class="ref-copy">
              <el-input :value="transferReferenceFilled" readonly size="small" class="ref-input"></el-input>
              <el-button size="small" @click="copyReference(transferReferenceFilled)"><i class="el-icon-document-copy"></i> 复制</el-button>
            </div>
          </div>
          <div class="note">
            转账成功需要提交转账成功回执（请在<strong>第四步</strong>上传）。
          </div>
        </div>
      </div>
    </div>

    <div class="actions">
      <el-button @click="goBack">Back</el-button>
      <el-button 
        type="primary" 
        @click="nextStep"
        :disabled="!canProceed"
      >
        Next Step
      </el-button>
    </div>

    <!-- 移动端下滑提示 -->
    <div class="scroll-hint" v-if="showScrollHint">
      <i class="el-icon-arrow-down"></i> Scroll down
    </div>

    <!-- 手续费说明对话框 -->
    <el-dialog
      title="Important Notice about Transfer Fees"
      :visible.sync="showTransferFeeDialog"
      width="80%"
      :close-on-click-modal="true"
      custom-class="transfer-fee-dialog"
    >
      <div class="dialog-content">
        <p class="dialog-notice">
          <i class="el-icon-warning"></i>
          <span>
            <strong>Please note:</strong> We will accept the registration fee based on the actual amount received after deducting transfer fees. 
            You may need to cover additional fees when making the payment or send a supplementary transfer to ensure the full amount is received.
          </span>
        </p>
        
        <div class="fee-image-wrapper">
          <el-image
            ref="feeImage"
            :src="transferFeeImageUrl"
            :preview-src-list="[transferFeeImageUrl]"
            fit="contain"
            class="fee-image"
          >
            <div slot="error" class="image-slot">
              <i class="el-icon-picture-outline"></i>
              <p>Failed to load image</p>
            </div>
          </el-image>
          <div class="image-hint">
            <i class="el-icon-zoom-in"></i> Click image to view full size
          </div>
        </div>
        
        <div class="dialog-footer-info">
          <p>For detailed information about transfer fees, please visit:</p>
          <a 
            href="https://www.bochk.com/en/crossborder/remittance/charges.html" 
            target="_blank" 
            class="dialog-link"
          >
            <i class="el-icon-link"></i> Bank of China (Hong Kong) - Remittance Charges
          </a>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script>
export default {
  name: 'Step3Payment',
  props: {
    id: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      selectedMethod: 'domestic',
      currentUserId: null,
      showScrollHint: false,
      initialScrollTop: 0,
      hasScrolled: false,
      editMode: false,
      serverConfig: null, // 服务器配置
      priceDisclaimerActive: [], // 价格免责声明折叠面板状态（空数组表示折叠）
      showTransferFeeDialog: false, // 手续费说明对话框
      transferFeeImageUrl: require('../assets/transfee.jpg'), // 手续费图片
      paymentMethods: [
        {
          id: 'international',
          name: 'International Payment',
          description: 'Bank transfer for international users',
          icon: 'el-icon-bank-card'
        },
        {
          id: 'domestic',
          name: 'China Mainland Payment',
          description: 'Bank transfer for China users',
          icon: 'el-icon-chat-round'
        }
      ]
    }
  },
  computed: {
    selectedProduct() {
      if (!this.currentUserId) return null;
      const saved = localStorage.getItem(this.getStorageKey('conferenceProductSelection'));
      return saved ? JSON.parse(saved) : null;
    },
    userInfo() {
      if (!this.currentUserId) return {};
      const saved = localStorage.getItem(this.getStorageKey('conferenceUserInfo'));
      return saved ? JSON.parse(saved) : {};
    },
    // 获取超页费单价
    extraPageFeePerPage() {
      try {
        const config = localStorage.getItem('conferenceExtraPageFee');
        const feeConfig = config ? JSON.parse(config) : { usd: 80, rmb: 600 };
        return feeConfig.usd;
      } catch (error) {
        return 80;
      }
    },
    // 计算超页费用
    extraPageFee() {
      if (!this.userInfo.paperPages || !this.userInfo.paperType || this.userInfo.paperType === 'none') return 0;
      const pages = parseInt(this.userInfo.paperPages);
      const paperType = this.userInfo.paperType;
      const feePerPage = this.extraPageFeePerPage;
      
      if (paperType === 'research') {
        // Research paper: 8页内不计费，第9-10页每页收费
        if (pages > 8) {
          return (pages - 8) * feePerPage;
        }
      } else if (paperType === 'poster') {
        // Poster: 2页内不计费，第3页及以上每页收费
        if (pages > 2) {
          return (pages - 2) * feePerPage;
        }
      }
      return 0;
    },
    // 超页页数（用于人民币计算）
    extraPagesCount() {
      if (!this.userInfo.paperPages || !this.userInfo.paperType || this.userInfo.paperType === 'none') return 0;
      const pages = parseInt(this.userInfo.paperPages);
      const paperType = this.userInfo.paperType;
      
      if (paperType === 'research') {
        return pages > 8 ? (pages - 8) : 0;
      } else if (paperType === 'poster') {
        return pages > 2 ? (pages - 2) : 0;
      }
      return 0;
    },
    // 计算总价格
    totalAmount() {
      const basePrice = this.selectedProduct ? this.selectedProduct.price : 0;
      return basePrice + this.extraPageFee;
    },
    // 获取超页费人民币单价
    extraPageFeePerPageRMB() {
      try {
        const config = localStorage.getItem('conferenceExtraPageFee');
        const feeConfig = config ? JSON.parse(config) : { usd: 80, rmb: 600 };
        return feeConfig.rmb;
      } catch (error) {
        return 600;
      }
    },
    // 计算人民币金额（不按汇率，使用固定价格）
    totalAmountDomesticRMB() {
      if (!this.selectedProduct) return 0;
      
      // 有则用本地保存的 priceRMB，缺失时根据产品代码回退到固定人民币价目
      let baseRMB = 0;
      if (this.selectedProduct.priceRMB != null) {
        baseRMB = this.selectedProduct.priceRMB;
      } else {
        const code = this.selectedProduct.code;
        const priceMapRMB = {
          'IEEE Member': 5000,
          'Non-IEEE Member': 6000,
          'Life Member': 3600,
          'Student - IEEE Member': 3600,
          'Student - Non-IEEE Member': 4400
        };
        baseRMB = priceMapRMB[code] || 0;
      }
      
      const extraRMB = this.extraPagesCount * this.extraPageFeePerPageRMB; // 超页费用
      return baseRMB + extraRMB;
    },
    canProceed() {
      return !!this.selectedMethod;
    },
    // 自动填充的附言字符串（用于复制）
    transferReferenceFilled() {
      const name = (this.userInfo && this.userInfo.name) ? this.userInfo.name : 'Name';
      const pid = (this.userInfo && this.userInfo.paperId) ? this.userInfo.paperId : 'PaperID';
      return `${name}+ICPADS 2025+${pid}`;
    }
  },
  async mounted() {
    await this.loadConfig();
    this.initializeUserData();
    
    // 检测编辑模式
    if (this.id && this.id !== 'new') {
      this.editMode = true;
      console.log('Step3 - Edit mode detected, registration ID:', this.id);
    }
    
    this.checkScrollHint();
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.checkScrollHint);
  },
  methods: {
    async loadConfig() {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/config');
        
        if (response.data.success) {
          this.serverConfig = response.data.data;
          console.log('Step3 - Configuration loaded successfully');
        }
      } catch (error) {
        console.error('Step3 - Failed to load configuration:', error);
      }
    },
    async copyReference(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const input = document.createElement('input');
          input.value = text;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
        }
        this.$message.success('Copied');
      } catch (e) {
        this.$message.error('Copy failed');
      }
    },
    checkScrollHint() {
      if (window.innerWidth <= 768 && !this.hasScrolled) {
        // 检查是否需要显示下滑提示
        this.$nextTick(() => {
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;
          const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
          
          // 记录初始滚动位置
          this.initialScrollTop = currentScrollTop;
          
          // 如果页面内容超出视窗高度，显示提示
          if (documentHeight > windowHeight + 100) { // 增加100px缓冲
            this.showScrollHint = true;
          }
        });
      } else {
        this.showScrollHint = false;
      }
    },

    handleScroll() {
      if (this.showScrollHint && window.innerWidth <= 768) {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDistance = Math.abs(currentScrollTop - this.initialScrollTop);
        
        // 用户滚动超过80px就隐藏提示
        if (scrollDistance > 80) {
          this.showScrollHint = false;
          this.hasScrolled = true;
        }
      }
    },

    async initializeUserData() {
      // 获取当前登录用户信息
      const currentUser = this.$store.state.account.user;
      if (!currentUser || !currentUser.id) {
        console.warn('No user logged in, redirecting to login');
        this.$router.push('/login');
        return;
      }

      this.currentUserId = currentUser.id;
      
      // 如果是编辑模式，先尝试从后端加载特定注册记录的数据
      if (this.editMode && this.id && this.id !== 'new') {
        await this.loadBackendRegistrationData();
      }
      
      this.loadPaymentMethod();
    },

    getStorageKey(baseName) {
      // 生成带用户ID和注册记录ID的存储键名
      // 如果有注册记录ID（编辑模式），包含在键名中以区分不同注册记录
      if (this.id && this.id !== 'new') {
        return `${baseName}_${this.currentUserId}_${this.id}`;
      }
      // 新建注册时，只用用户ID
      return `${baseName}_${this.currentUserId}`;
    },

    async loadBackendRegistrationData() {
      try {
        console.log('Step3 - Loading backend registration data for ID:', this.id);
        
        // 验证ID格式
        if (!/^\d+$/.test(this.id)) {
          console.warn('Step3 - Invalid registration ID format:', this.id);
          this.$message.warning('Invalid registration ID');
          this.$router.push('/dashboard?tab=registrations');
          return;
        }
        
        const axios = (await import('axios')).default;
        
        const response = await axios.get(`/api/submissions/registration/${this.id}`, {
          withCredentials: true
        });
        
        console.log('Step3 - Backend registration response:', response.data);
        
        if (response.data.success && response.data.registration_data) {
          const regData = response.data.registration_data;
          
          // 保存支付方式到 localStorage
          if (regData.payment_method) {
            localStorage.setItem(
              this.getStorageKey('conferencePaymentMethod'), 
              regData.payment_method
            );
          }
          
          console.log('Step3 - Backend data saved to localStorage');
        } else {
          // 注册记录不存在
          console.warn('Step3 - Registration not found for ID:', this.id);
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
      } catch (error) {
        console.error('Step3 - Failed to load backend registration data:', error);
        
        // 如果是404错误，说明ID不存在
        if (error.response && error.response.status === 404) {
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
        // 其他错误不阻塞流程
      }
    },

    loadPaymentMethod() {
      if (!this.currentUserId) return;
      
      const saved = localStorage.getItem(this.getStorageKey('conferencePaymentMethod'));
      if (saved) {
        this.selectedMethod = saved;
      } else {
        // 默认选择国内支付方式
        this.selectedMethod = 'domestic';
        localStorage.setItem(this.getStorageKey('conferencePaymentMethod'), 'domestic');
      }
    },

    selectMethod(methodId) {
      this.selectedMethod = methodId;
      if (this.currentUserId) {
        localStorage.setItem(this.getStorageKey('conferencePaymentMethod'), methodId);
      }
      // 重新检查滚动提示，因为支付详情可能会改变页面高度
      this.$nextTick(() => {
        // 重置滚动状态，因为页面内容发生了变化
        this.hasScrolled = false;
        this.checkScrollHint();
      });
    },

    nextStep() {
      if (!this.canProceed) {
        this.$message.error('Please select a payment method');
        return;
      }
      
      this.$emit('step-complete', { 
        paymentMethod: this.selectedMethod 
      });
      
      if (this.id === 'new') {
        this.$router.push('/conference/new/step4');
      } else if (this.editMode && this.id) {
        this.$router.push(`/conference/${this.id}/step4`);
      } else {
        this.$router.push('/conference/new/step4');
      }
    },

    goBack() {
      if (this.id === 'new') {
        this.$router.push('/conference/new/step2');
      } else if (this.editMode && this.id) {
        this.$router.push(`/conference/${this.id}/step2`);
      } else {
        this.$router.push('/conference/new/step2');
      }
    }
  },

  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.checkScrollHint);
  }
}
</script>

<style scoped>
.step-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 28px;
}

.header h1 {
  color: #409EFF;
  margin-bottom: 18px;
  font-size: 26px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 15px;
  justify-content: center;
}

.progress-nav-btn {
  background: #409EFF;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  font-size: 16px;
}

.progress-nav-btn:hover:not(:disabled) {
  background: #66b3ff;
  transform: scale(1.1);
}

.progress-nav-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
  transform: none;
}

.progress-bar {
  flex: 1;
  max-width: 600px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: #409EFF;
  transition: width 0.3s ease;
}

.content {
  margin-bottom: 28px;
}

.order-summary {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.order-summary h3 {
  color: #409EFF;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
  font-size: 17px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.summary-row .price {
  color: #f56c6c;
  font-size: 19px;
}

.total-row {
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: bold;
}

.total-row .price {
  font-size: 21px;
}

.rmb-price {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.price-disclaimer-wrapper {
  margin-bottom: 20px;
  max-width: 650px;
}

.price-disclaimer-wrapper >>> .el-collapse {
  border: 1px solid #91d5ff;
  border-radius: 6px;
  background: #e6f7ff;
}

.price-disclaimer-wrapper >>> .el-collapse-item {
  border-radius: 6px;
}

.price-disclaimer-wrapper >>> .el-collapse-item__header {
  background: #e6f7ff;
  color: #096dd9;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border-bottom: none;
  border-radius: 6px;
  line-height: 20px;
  height: auto;
}

.price-disclaimer-wrapper >>> .el-collapse-item__header.is-active {
  border-bottom: 1px solid #91d5ff;
  border-radius: 6px 6px 0 0;
}

.price-disclaimer-wrapper >>> .el-collapse-item__wrap {
  background: #f0f9ff;
  border-bottom: none;
  border-radius: 0 0 6px 6px;
}

.price-disclaimer-wrapper >>> .el-collapse-item__content {
  padding: 14px 16px;
  color: #003a8c;
  font-size: 13px;
  line-height: 1.7;
}

.price-disclaimer-wrapper >>> .el-collapse-item__arrow {
  color: #1890ff;
}

.price-disclaimer-wrapper .el-icon-info {
  color: #1890ff;
  font-size: 16px;
  margin-right: 8px;
}

.price-disclaimer-wrapper .collapse-title {
  color: #096dd9;
  font-weight: 500;
}

.price-disclaimer-wrapper >>> .disclaimer-content strong {
  color: #096dd9;
  font-weight: 600;
}

/* 手续费说明样式 */
.transfer-fee-notice-wrapper {
  margin-bottom: 20px;
}

.transfer-fee-notice-box {
  background: #fff7e6;
  border: 1px solid #ffc069;
  border-radius: 6px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.transfer-fee-notice-box:hover {
  background: #ffe7ba;
  border-color: #fa8c16;
  box-shadow: 0 2px 8px rgba(250, 140, 22, 0.15);
}

.transfer-fee-notice-box .el-icon-warning {
  color: #fa8c16;
  font-size: 18px;
  flex-shrink: 0;
}

.transfer-fee-notice-box .notice-text {
  color: #d46b08;
  font-weight: 500;
  font-size: 14px;
  flex: 1;
}

.transfer-fee-notice-box .arrow-icon {
  color: #fa8c16;
  font-size: 16px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.transfer-fee-notice-box:hover .arrow-icon {
  transform: translateX(4px);
}

/* 手续费对话框样式 */
.transfer-fee-dialog >>> .el-dialog {
  border-radius: 10px;
  max-width: 800px;
}

.transfer-fee-dialog >>> .el-dialog__header {
  background: #fff7e6;
  border-bottom: 1px solid #ffc069;
  padding: 16px 20px;
}

.transfer-fee-dialog >>> .el-dialog__title {
  color: #d46b08;
  font-weight: 600;
  font-size: 16px;
}

.transfer-fee-dialog >>> .el-dialog__body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-notice {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 12px;
  border-radius: 8px;
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.dialog-notice i {
  color: #fa8c16;
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.dialog-notice span {
  flex: 1;
}

.fee-image-wrapper {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.fee-image {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  cursor: pointer;
}

.fee-image >>> img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-hint {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.image-hint i {
  font-size: 14px;
}

.image-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.image-slot i {
  font-size: 48px;
  margin-bottom: 12px;
}

.image-slot p {
  margin: 0;
  font-size: 14px;
}

.dialog-footer-info {
  background: #f0f7ff;
  border: 1px solid #91d5ff;
  padding: 12px;
  border-radius: 8px;
}

.dialog-footer-info p {
  margin: 0 0 8px 0;
  color: #096dd9;
  font-size: 13px;
}

.dialog-link {
  color: #1890ff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
}

.dialog-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.amount-display {
  background: #f0f7ff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #409EFF;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rmb-amount {
  color: #f56c6c;
  font-size: 20px;
  font-weight: bold;
}

.domestic-bank {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.domestic-bank p {
  margin: 8px 0;
  font-size: 15px;
}

.payment-methods {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.payment-methods h3 {
  color: #409EFF;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
  font-size: 17px;
}

.method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.method-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.method-card:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.method-card.selected {
  border-color: #409EFF;
  background: #f0f7ff;
}

.method-icon {
  font-size: 36px;
  color: #409EFF;
  margin-bottom: 10px;
}

.method-name {
  font-size: 17px;
  font-weight: bold;
  color: #333;
  margin-bottom: 6px;
}

.method-desc {
  color: #666;
  font-size: 14px;
}

.payment-details {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 280px;
}

.qr-payment {
  text-align: center;
}

.qr-payment h3 {
  color: #409EFF;
  margin-bottom: 16px;
  font-size: 17px;
}



.bank-payment h3 {
  color: #409EFF;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
  font-size: 17px;
}

.bank-info {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.bank-info .info-section {
  margin-bottom: 20px;
}

.bank-info .info-section:last-child {
  margin-bottom: 0;
}

.bank-info h4 {
  color: #409EFF;
  font-size: 16px;
  margin: 0 0 12px 0;
  font-weight: 600;
  border-bottom: 2px solid #409EFF;
  padding-bottom: 6px;
}

.bank-info p {
  margin: 6px 0;
  font-size: 15px;
}

.bank-info .address-line {
  margin: 3px 0 3px 20px;
  font-size: 14px;
  color: #666;
}

.note {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.reference-box {
  background: #f0f7ff;
  border: 1px solid #cfe5ff;
  color: #1a5fb4;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin: 12px 0;
}
.reference-box .ref-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.reference-box .ref-format code {
  background: #e8f2ff;
  padding: 2px 6px;
  border-radius: 4px;
}
.reference-box .ref-copy {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.reference-box .ref-input >>> .el-input__inner {
  color: #1a5fb4;
}

.actions {
  display: flex;
  justify-content: space-between;
  padding: 18px 0;
  border-top: 1px solid #e8e8e8;
  margin-top: 18px;
}

.el-button {
  padding: 12px 28px;
  border-radius: 8px;
}

/* 下滑提示 */
.scroll-hint {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(64, 158, 255, 0.9);
  color: white;
  padding: 10px 18px;
  border-radius: 25px;
  font-size: 13px;
  white-space: nowrap;
  animation: bounce 2s infinite;
  z-index: 1000;
  display: none;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  40% {
    transform: translateX(-50%) translateY(-10px);
  }
  60% {
    transform: translateX(-50%) translateY(-5px);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .step-container {
    padding: 12px;
  }

  .header {
    margin-bottom: 20px;
  }

  .header h1 {
    font-size: 20px;
    margin-bottom: 16px;
  }

  .progress-container {
    gap: 10px;
  }

  .progress-nav-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .progress-bar {
    max-width: none;
    height: 6px;
  }

  .content {
    margin-bottom: 20px;
  }

  .order-summary,
  .payment-methods,
  .payment-details {
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 8px;
  }

  .order-summary h3,
  .payment-methods h3,
  .bank-payment h3 {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .summary-row {
    padding: 6px 0;
    font-size: 14px;
  }

  .summary-row .price {
    font-size: 17px;
  }

  .total-row .price {
    font-size: 18px;
  }

  .rmb-price {
    font-size: 12px;
  }

  .price-disclaimer-wrapper {
    margin-bottom: 16px;
    max-width: 100%;
  }

  .price-disclaimer-wrapper >>> .el-collapse-item__header {
    padding: 10px 12px;
    font-size: 13px;
  }

  .price-disclaimer-wrapper >>> .el-collapse-item__content {
    padding: 12px;
    font-size: 12px;
    line-height: 1.6;
  }

  .price-disclaimer-wrapper .el-icon-info {
    font-size: 14px;
    margin-right: 6px;
  }

  .amount-display {
    padding: 12px;
  }

  .rmb-amount {
    font-size: 18px;
  }

  .amount-row {
    font-size: 14px;
  }

  .domestic-bank {
    padding: 12px;
  }

  .domestic-bank p {
    font-size: 13px;
    margin: 6px 0;
  }

  .method-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .method-card {
    padding: 16px;
  }

  .method-icon {
    font-size: 28px;
  }

  .method-name {
    font-size: 15px;
  }

  .method-desc {
    font-size: 12px;
  }

  .payment-details {
    min-height: 240px;
  }



  .bank-info {
    padding: 12px;
  }

  .bank-info p {
    font-size: 13px;
    margin: 4px 0;
  }

  .note {
    padding: 10px;
    font-size: 12px;
  }

  .actions {
    padding: 16px 0;
    margin-top: 16px;
    gap: 12px;
  }

  .actions .el-button {
    flex: 1;
    margin: 0;
    padding: 12px 20px;
  }

  /* 移动端显示下滑提示 */
  .scroll-hint {
    display: block;
  }
}

@media (max-width: 480px) {
  .step-container {
    padding: 8px;
  }

  .header h1 {
    font-size: 18px;
  }

  .order-summary,
  .payment-methods,
  .payment-details {
    padding: 12px;
    margin-bottom: 12px;
  }

  .order-summary h3,
  .payment-methods h3,
  .bank-payment h3 {
    font-size: 15px;
  }

  .method-card {
    padding: 12px;
  }

  .method-icon {
    font-size: 24px;
  }

  .method-name {
    font-size: 14px;
  }

  .price-disclaimer-wrapper {
    margin-bottom: 12px;
  }

  .price-disclaimer-wrapper >>> .el-collapse-item__header {
    padding: 8px 10px;
    font-size: 12px;
  }

  .price-disclaimer-wrapper >>> .el-collapse-item__content {
    padding: 10px;
    font-size: 11px;
    line-height: 1.5;
  }

  .price-disclaimer-wrapper .el-icon-info {
    font-size: 13px;
    margin-right: 4px;
  }

  /* 移动端手续费说明样式 */
  .transfer-fee-notice-wrapper {
    margin-bottom: 12px;
  }

  .transfer-fee-notice-box {
    padding: 10px 12px;
  }

  .transfer-fee-notice-box .el-icon-warning {
    font-size: 16px;
  }

  .transfer-fee-notice-box .notice-text {
    font-size: 12px;
  }

  .transfer-fee-notice-box .arrow-icon {
    font-size: 14px;
  }

  .transfer-fee-dialog >>> .el-dialog {
    width: 95% !important;
    max-width: 95%;
  }

  .transfer-fee-dialog >>> .el-dialog__body {
    padding: 16px;
    max-height: 70vh;
  }

  .dialog-notice {
    font-size: 12px;
    padding: 10px;
  }

  .fee-image-wrapper {
    padding: 8px;
    height: 45vh;
  }

  .image-hint {
    font-size: 11px;
  }

  .dialog-footer-info {
    padding: 10px;
  }

  .dialog-footer-info p {
    font-size: 12px;
  }

  .dialog-link {
    font-size: 13px;
  }

  .payment-details {
    min-height: 200px;
  }

  .actions {
    padding: 12px 0;
  }

  .actions .el-button {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
