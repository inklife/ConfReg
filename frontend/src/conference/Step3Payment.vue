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
          <span>Amount:</span>
          <strong class="price">${{ selectedProduct && selectedProduct.price || 0 }} USD</strong>
        </div>
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
        <div v-if="selectedMethod === 'domestic'" class="qr-payment">
          <h3>WeChat Pay</h3>
          <div class="qr-container">
            <img src="@img/payment.png" alt="WeChat Pay QR Code" class="qr-code">
          </div>
          <p class="qr-instruction">
            Open WeChat and scan the QR code to complete payment
          </p>
        </div>

        <div v-if="selectedMethod === 'international'" class="bank-payment">
          <h3>Bank Transfer</h3>
          <div class="bank-info">
            <p><strong>Bank Name:</strong> Example Bank</p>
            <p><strong>Account Number:</strong> 1234567890</p>
            <p><strong>Swift Code:</strong> EXAMPLESWIFT</p>
            <p><strong>Reference:</strong> ICPADS2025-{{ userInfo.name }}</p>
          </div>
          <div class="note">
            Please include your name and "ICPADS2025" in the transfer reference.
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
  </div>
</template>

<script>
export default {
  name: 'Step3Payment',
  data() {
    return {
      selectedMethod: null,
      currentUserId: null,
      showScrollHint: false,
      initialScrollTop: 0,
      hasScrolled: false,
      paymentMethods: [
        {
          id: 'domestic',
          name: 'WeChat Pay',
          description: 'For domestic users',
          icon: 'el-icon-chat-round'
        },
        {
          id: 'international',
          name: 'Bank Transfer',
          description: 'For international users',
          icon: 'el-icon-bank-card'
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
    canProceed() {
      return !!this.selectedMethod;
    }
  },
  mounted() {
    this.initializeUserData();
    this.checkScrollHint();
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.checkScrollHint);
  },
  methods: {
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

    initializeUserData() {
      // 获取当前登录用户信息
      const currentUser = this.$store.state.account.user;
      if (!currentUser || !currentUser.id) {
        console.warn('No user logged in, redirecting to login');
        this.$router.push('/login');
        return;
      }

      this.currentUserId = currentUser.id;
      this.loadPaymentMethod();
    },

    getStorageKey(baseName) {
      return `${baseName}_${this.currentUserId}`;
    },

    loadPaymentMethod() {
      if (!this.currentUserId) return;
      
      const saved = localStorage.getItem(this.getStorageKey('conferencePaymentMethod'));
      if (saved) {
        this.selectedMethod = saved;
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
      this.$router.push('/conference/step4');
    },

    goBack() {
      this.$router.push('/conference/step2');
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

.qr-container {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 10px;
  display: inline-block;
  margin-bottom: 16px;
}

.qr-code {
  width: 160px;
  height: 160px;
  object-fit: contain;
}

.qr-instruction {
  color: #666;
  font-size: 15px;
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

.bank-info p {
  margin: 6px 0;
  font-size: 15px;
}

.note {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
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

  .qr-code {
    width: 140px;
    height: 140px;
  }

  .qr-instruction {
    font-size: 13px;
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

  .qr-code {
    width: 120px;
    height: 120px;
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
