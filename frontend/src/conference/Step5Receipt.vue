<template>
  <div class="step-container">
    <div class="header">
      <h1>Step 5: Registration Complete</h1>
      <div class="progress-container">
        <button 
          class="progress-nav-btn progress-nav-left"
          :class="{ 'progress-nav-warning': isApproved }"
          @click="goToPreviousStep"
          :title="isApproved ? 'Warning: Editing will reset approved status' : 'Previous step'"
        >
          <i class="el-icon-arrow-left"></i>
        </button>
        <div class="progress-bar">
          <div class="progress" :style="{ width: '100%' }"></div>
        </div>
        <button 
          class="progress-nav-btn progress-nav-right"
          @click="goToUserPanel"
          title="Go to user panel"
        >
          <i class="el-icon-arrow-right"></i>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- 成功提示 -->
      <div v-if="!isRefunded" class="success-banner" :class="{ 'approved': isApproved, 'pending': !isApproved && !isRejected, 'rejected': isRejected }">
        <i :class="isApproved ? 'el-icon-circle-check' : (isRejected ? 'el-icon-close' : 'el-icon-info')" class="success-icon"></i>
        <h2>{{ bannerTitle }}</h2>
        <p>{{ bannerMessage }}</p>
      </div>

      <!-- 退款提示 (针对已退款的注册) -->
      <div v-if="isRefunded" class="refund-notice">
        <div class="refund-header">
          <i class="el-icon-warning"></i>
          <h3>Registration Refunded</h3>
        </div>
        <div class="refund-body">
          <p>This registration has been refunded. Documents are no longer available for download.</p>
          <p>If you have any questions, please contact the conference organizers at <a href="mailto:registration@ieee-icpads.org.cn">registration@ieee-icpads.org.cn</a></p>
        </div>
      </div>

      <!-- 拒绝原因提示 (针对被拒绝的注册) -->
      <div v-if="isRejected" class="rejection-notice">
        <div class="rejection-header">
          <i class="el-icon-warning"></i>
          <h3>Rejection Details</h3>
        </div>
        <div class="rejection-body">
          <div class="rejection-reason">
            <label>Administrator Notes:</label>
            <p v-if="rejectionReason">{{ rejectionReason }}</p>
            <p v-else class="no-reason">No specific reason provided. Please contact the organizers for more information.</p>
          </div>
          <div v-if="reviewTime" class="rejection-time">
            <i class="el-icon-time"></i>
            <span>Reviewed on: {{ formatReviewDate(reviewTime) }}</span>
          </div>
          <!-- Debug info (remove in production) -->
          <div v-if="!rejectionReason" style="margin-top: 12px; padding: 12px; background: #f0f0f0; border-radius: 6px; font-size: 12px; color: #666;">
            <strong>Debug Info:</strong><br>
            Status: {{ backendRegistrationData ? backendRegistrationData.status : 'N/A' }}<br>
            Has backendData: {{ !!backendRegistrationData }}<br>
            Review Notes: {{ backendRegistrationData ? backendRegistrationData.review_notes : 'N/A' }}<br>
            Rejection Reason Computed: {{ rejectionReason || 'null' }}
          </div>
        </div>
        <div class="rejection-footer">
          <p>If you have any questions about the rejection, please contact the conference organizers at <a href="mailto:registration@ieee-icpads.org.cn">registration@ieee-icpads.org.cn</a></p>
        </div>
      </div>

      <!-- 注册信息摘要 -->
      <div class="registration-summary">
        <h3>Registration Summary</h3>
        
        <div class="summary-section">
          <h4>Personal Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name:</span>
              <span class="value">{{ userInfo.fullName }}</span>
            </div>
            <div class="info-item">
              <span class="label">Email:</span>
              <span class="value">{{ userInfo.email }}</span>
            </div>
            <div class="info-item">
              <span class="label">Organization:</span>
              <span class="value">{{ userInfo.organization }}</span>
            </div>
            <div class="info-item" v-if="userInfo.phone">
              <span class="label">Phone:</span>
              <span class="value">{{ userInfo.phone }}</span>
            </div>
            <div class="info-item" v-if="userInfo.paperType && userInfo.paperType !== 'none'">
              <span class="label">Paper Type:</span>
              <span class="value">
                <span v-if="userInfo.paperType === 'research'" style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Research Paper</span>
                <span v-else-if="userInfo.paperType === 'poster'" style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Poster</span>
              </span>
            </div>
            <div class="info-item" v-if="userInfo.paperID">
              <span class="label">Paper ID:</span>
              <span class="value">{{ userInfo.paperID }}</span>
            </div>
            <div class="info-item" v-if="userInfo.paperPages">
              <span class="label">Paper Pages:</span>
              <span class="value">{{ userInfo.paperPages }} pages</span>
            </div>
          </div>
        </div>

        <div class="summary-section">
          <h4>Registration Details</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Registration Category:</span>
              <span class="value registration-category">
                {{ getRegistrationCategory() }}
                <el-tag 
                  v-if="getRegistrationCategory() !== 'Not selected'"
                  :type="getRegistrationCategory().includes('Student') ? 'warning' : 'success'" 
                  size="mini" 
                  style="margin-left: 8px;">
                  {{ getRegistrationCategory().includes('Student') ? 'Student' : 'Full' }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="label">Membership Type:</span>
              <span class="value membership-type">
                {{ selectedProduct && selectedProduct.code }}
                <el-tag 
                  v-if="selectedProduct && selectedProduct.code && !selectedProduct.code.includes('Non') && selectedProduct.code.includes('IEEE')"
                  type="info" 
                  size="mini" 
                  style="margin-left: 8px;">
                  IEEE
                </el-tag>
              </span>
            </div>
            <div class="info-item" v-if="userInfo.paperPages > 0">
              <span class="label">Paper Pages:</span>
              <span class="value">
                {{ userInfo.paperPages }} pages
                <span v-if="paperPageLimit > 0" style="color: #909399; font-size: 12px;">
                  (limit: {{ paperPageLimit }})
                </span>
                <span v-if="extraPagesCount > 0" class="extra-pages">
                  - {{ extraPagesCount }} extra
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="label">Base Fee:</span>
              <span class="value price" v-if="isDomesticPayment">¥{{ basePriceRMB }} RMB</span>
              <span class="value price" v-else>${{ basePriceUSD }} USD</span>
            </div>
            <div class="info-item" v-if="extraPagesCount > 0">
              <span class="label">Extra Page Fee ({{ extraPagesCount }} pages):</span>
              <span class="value price" v-if="isDomesticPayment">¥{{ extraPageFeeRMB }} RMB</span>
              <span class="value price" v-else>${{ extraPageFeeUSD }} USD</span>
            </div>
            <div class="info-item">
              <span class="label">Total Amount:</span>
              <span class="value price total-price" v-if="isDomesticPayment">¥{{ totalRMB }} RMB</span>
              <span class="value price total-price" v-else>${{ totalUSD }} USD</span>
            </div>
            <div class="info-item">
              <span class="label">Payment Method:</span>
              <span class="value">
                {{ paymentMethodDisplayName }}
                <el-tag 
                  :type="isDomesticPayment ? 'success' : 'primary'" 
                  size="mini" 
                  style="margin-left: 8px;">
                  {{ isDomesticPayment ? 'Domestic' : 'International' }}
                </el-tag>
              </span>
            </div>
            <!-- <div class="info-item" v-if="registrationId">
              <span class="label">Registration ID:</span>
              <span class="value registration-id">{{ registrationId }}</span>
            </div> -->
          </div>
        </div>
      </div>

      <!-- 下载和操作 -->
      <div class="actions-section">
        <h3>Downloads & Actions</h3>
        <div class="action-buttons">
          <!-- 已完成任务的直接下载 -->
          <el-button 
            v-if="showCompletedTaskDownload"
            type="success" 
            icon="el-icon-download" 
            @click="downloadCompletedPDF(completedTaskId)"
            :title="'Your receipt is ready for download'"
          >
            Download Ready Receipt
          </el-button>
          
          <!-- 普通的生成下载按钮 -->
          <el-button 
            v-else
            type="primary" 
            icon="el-icon-download" 
            @click="downloadCertificate"
            :disabled="!isApproved || isRefunded"
            :loading="isGenerating"
            :title="isRefunded ? 'Receipt not available for refunded registration' : (isApproved ? 'Download your receipt' : 'Receipt will be available after approval')"
          >
            {{ isGenerating ? 'Generating...' : 'Download Receipt' }}
          </el-button>
          
          <el-button icon="el-icon-refresh" @click="refreshRegistrationStatus" class="refresh-button">
            Refresh Status
          </el-button>
          <el-button icon="el-icon-back" @click="goToPreviousStep" class="renew-button">
            Renew Info
          </el-button>
          <el-button icon="el-icon-s-home" @click="goToUserPanel" class="dashboard-button">
            Go to Dashboard
          </el-button>
        </div>
        
        <!-- 异步下载提示 -->
        <div v-if="isApproved" class="download-notice">
          <i class="el-icon-info"></i>
          <span>Receipt generation uses an async process. You can view progress and download from your 
            <router-link to="/dashboard?tab=documents" class="link highlight-link">Document Download</router-link> page.
          </span>
        </div>
      </div>

      <!-- 下一步说明 -->
      <div class="next-steps">
        <h3>What's Next?</h3>
        <div class="steps-list">
          <!-- <div class="step-item">
            <i class="el-icon-message"></i>
            <div>
              <strong>Email Confirmation</strong>
              <p>You will receive a confirmation email within 24 hours with your registration details.</p>
            </div>
          </div> -->
          <div class="step-item">
            <i class="el-icon-check"></i>
            <div>
              <strong>Payment Verification</strong>
              <p>Our team will verify your payment and update your registration status.</p>
            </div>
          </div>
          <div class="step-item">
            <i class="el-icon-document"></i>
            <div>
              <strong>Certificate Download</strong>
              <p>Once approved, you can download your participation certificate from your account.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 联系信息 -->
      <div class="contact-info">
        <h3>Need Help?</h3>
        <p>If you have any questions about your registration, please contact us:</p>
        <div class="contact-details">
          <p><i class="el-icon-message"></i> Email: registration@ieee-icpads.org.cn</p>
          <!-- <p><i class="el-icon-phone"></i> Phone: +1-234-567-8900</p> -->
          <p><i class="el-icon-time"></i> Office Hours: Monday - Friday, 9:00 AM - 5:00 PM Beijing Time</p>
        </div>
      </div>
    </div>

    <!-- <div class="actions">
      <el-button @click="startNewRegistration">
        Register Another Person
      </el-button>
      <el-button type="primary" @click="goToHome">
        Back to Home
      </el-button>
    </div> -->
  </div>
</template>

<script>
import { sseService } from '../_services/sse.service.js';

export default {
  name: 'Step5Receipt',
  props: {
    id: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      registrationId: '',
      loading: true,
      backendRegistrationData: null,
      error: null,
      currentUserId: null,
      editMode: false,
      isGenerating: false,
      currentTaskId: null,
      // 已完成任务的下载支持
      showCompletedTaskDownload: false,
      completedTaskId: null,
      // SSE回调引用，用于正确清理
      onProgressCallback: null,
      onCompletedCallback: null,
      onFailedCallback: null
    }
  },
  computed: {
    selectedProduct() {
      // 首先尝试从后端数据获取
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        const regData = this.backendRegistrationData.registration_data;
        
        // 根据产品代码获取人民币价格
        const priceMapRMB = {
          'IEEE Member': 5000,
          'Non-IEEE Member': 6000,
          'Life Member': 3600,
          'Student - IEEE Member': 3600,
          'Student - Non-IEEE Member': 4400
        };
        
        return {
          code: regData.product_code,
          price: regData.product_price,
          priceRMB: priceMapRMB[regData.product_code] || 0
        };
      }
      
      // 兜底：从localStorage获取（使用用户关联的键名）
      if (!this.currentUserId) return null;
      const saved = localStorage.getItem(this.getStorageKey('conferenceProductSelection'));
      return saved ? JSON.parse(saved) : null;
    },
    userInfo() {
      // 首先尝试从后端获取的数据
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        const regData = this.backendRegistrationData.registration_data;
        const paperType = regData.paper_type || 'none';
        
        // 调试日志
        if (!regData.paper_type) {
          console.warn('⚠️ Step5: paper_type is missing from backend data, using default:', paperType);
          console.log('📊 Backend regData:', regData);
        } else {
          console.log('✅ Step5: paper_type from backend:', regData.paper_type);
        }
        
        return {
          fullName: regData.name || '',
          email: regData.email || '',
          organization: regData.affiliation || '',
          phone: regData.phone || '',
          paperType: paperType,
          paperID: regData.paper_id || '',
          paperPages: regData.paper_pages || 0
        };
      }
      
      // 兜底：从localStorage获取数据（使用用户关联的键名）
      if (!this.currentUserId) return {};
      
      const registrationData = localStorage.getItem(this.getStorageKey('conferenceRegistrationData'));
      if (registrationData) {
        const regData = JSON.parse(registrationData);
        
        // Step4保存的数据结构：regData.userInfo包含用户信息
        if (regData.userInfo) {
          const paperType = regData.userInfo.paperType || 'none';
          
          console.log('📦 Step5: Loading from localStorage conferenceRegistrationData');
          console.log('📊 paperType from localStorage:', paperType);
          
          return {
            fullName: regData.userInfo.name || '',
            email: regData.userInfo.email || '',
            organization: regData.userInfo.affiliation || '',
            phone: regData.userInfo.phone || '',
            paperType: paperType,
            paperID: regData.userInfo.paperId || regData.userInfo.paper_id || '',
            paperPages: regData.userInfo.paperPages || 0
          };
        }
      }
      
      // 如果没有注册数据，尝试从用户信息获取
      const saved = localStorage.getItem(this.getStorageKey('conferenceUserInfo'));
      if (saved) {
        const userInfo = JSON.parse(saved);
        const paperType = userInfo.paperType || 'none';
        
        console.log('📦 Step5: Loading from localStorage conferenceUserInfo');
        console.log('📊 paperType from localStorage:', paperType);
        
        return {
          fullName: userInfo.name || userInfo.fullName || '',
          email: userInfo.email || '',
          organization: userInfo.invoiceTitle || userInfo.organization || userInfo.affiliation || '',
          phone: userInfo.phone || '',
          paperType: paperType,
          paperID: userInfo.paperID || userInfo.paper_id || userInfo.paperId || '',
          paperPages: userInfo.paperPages || 0
        };
      }
      
      console.log('⚠️ Step5: No data source found, returning empty userInfo');
      return {
        fullName: '',
        email: '',
        organization: '',
        phone: '',
        paperType: 'none',
        paperID: '',
        paperPages: 0
      };
    },
    paymentMethod() {
      // 首先尝试从后端数据获取
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data && this.backendRegistrationData.registration_data.payment_method) {
        return this.backendRegistrationData.registration_data.payment_method;
      }
      
      // 兜底：从localStorage获取
      if (!this.currentUserId) return '';
      return localStorage.getItem(this.getStorageKey('conferencePaymentMethod')) || '';
    },
    paymentMethodName() {
      const methods = {
        'domestic': 'WeChat Pay',
        'international': 'Bank Transfer'
      };
      return methods[this.paymentMethod] || 'Unknown';
    },
    paymentMethodDisplayName() {
      // 尝试从后端数据获取支付方式
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data && this.backendRegistrationData.registration_data.payment_method) {
        const method = this.backendRegistrationData.registration_data.payment_method;
        const methods = {
          'domestic': 'China Mainland Payment',
          'international': 'International Bank Transfer'
        };
        return methods[method] || method;
      }
      
      // 兜底：从localStorage获取
      const methods = {
        'domestic': 'China Mainland Payment',
        'international': 'International Bank Transfer'
      };
      return methods[this.paymentMethod] || 'International Bank Transfer';
    },
    // 计算超页数
    extraPagesCount() {
      let paperPages = 0;
      let paperType = 'research'; // 默认为 research
      
      // 首先从后端数据获取
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        paperPages = this.backendRegistrationData.registration_data.paper_pages || 0;
        paperType = this.backendRegistrationData.registration_data.paper_type || 'research';
      } else if (this.userInfo.paperPages) {
        paperPages = parseInt(this.userInfo.paperPages);
        paperType = this.userInfo.paperType || 'research';
      }
      
      // 如果 paper type 是 none，则没有超页费用
      if (paperType === 'none') {
        return 0;
      }
      
      // 根据不同的 paper type 设置页数限制
      let pageLimit = 8; // research paper 默认 8 页
      if (paperType === 'poster') {
        pageLimit = 2; // poster 限制 2 页
      }
      
      return paperPages > pageLimit ? (paperPages - pageLimit) : 0;
    },
    // 获取当前 paper type 的页数限制
    paperPageLimit() {
      let paperType = 'research';
      
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        paperType = this.backendRegistrationData.registration_data.paper_type || 'research';
      } else if (this.userInfo.paperType) {
        paperType = this.userInfo.paperType;
      }
      
      if (paperType === 'poster') {
        return 2;
      } else if (paperType === 'research') {
        return 8;
      }
      return 0; // none
    },
    // 基础价格
    basePriceUSD() {
      if (this.selectedProduct && this.selectedProduct.price) {
        return parseFloat(this.selectedProduct.price);
      }
      return 0;
    },
    // 超页费用
    extraPageFeeUSD() {
      // 优先使用后端返回的超页费
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        const extraFee = this.backendRegistrationData.registration_data.extra_page_fee_usd;
        if (extraFee !== null && extraFee !== undefined) {
          return parseFloat(extraFee);
        }
      }
      // 兜底：计算
      return this.extraPagesCount * 80; // 每超1页 $80
    },
    // 总价格
    totalUSD() {
      // 优先使用后端返回的总金额
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        const totalAmount = this.backendRegistrationData.registration_data.total_amount_usd;
        if (totalAmount !== null && totalAmount !== undefined) {
          return parseFloat(totalAmount);
        }
      }
      // 兜底：计算基础价格+超页费
      return this.basePriceUSD + this.extraPageFeeUSD;
    },
    // 判断是否为国内支付
    isDomesticPayment() {
      // 首先从后端数据获取支付方式
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data && this.backendRegistrationData.registration_data.payment_method) {
        return this.backendRegistrationData.registration_data.payment_method === 'domestic';
      }
      
      // 兜底：从localStorage获取
      return this.paymentMethod === 'domestic';
    },
    // 基础价格人民币
    basePriceRMB() {
      if (this.selectedProduct && this.selectedProduct.priceRMB) {
        return parseFloat(this.selectedProduct.priceRMB);
      }
      
      // 如果没有priceRMB，根据产品代码推断
      if (this.selectedProduct && this.selectedProduct.code) {
        const priceMapRMB = {
          'IEEE Member': 5000,
          'Non-IEEE Member': 6000,
          'Life Member': 3600,
          'Student - IEEE Member': 3600,
          'Student - Non-IEEE Member': 4400
        };
        return priceMapRMB[this.selectedProduct.code] || 0;
      }
      
      return 0;
    },
    // 超页费用人民币
    extraPageFeeRMB() {
      // 优先使用后端返回的超页费
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        const extraFee = this.backendRegistrationData.registration_data.extra_page_fee_rmb;
        if (extraFee !== null && extraFee !== undefined) {
          return parseFloat(extraFee);
        }
      }
      // 兜底：计算
      return this.extraPagesCount * 600; // 每超1页 ¥600
    },
    // 总价格人民币
    totalRMB() {
      // 优先使用后端返回的总金额
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        const totalAmount = this.backendRegistrationData.registration_data.total_amount_rmb;
        if (totalAmount !== null && totalAmount !== undefined) {
          return parseFloat(totalAmount);
        }
      }
      // 兜底：计算基础价格+超页费
      return this.basePriceRMB + this.extraPageFeeRMB;
    },
    isApproved() {
      // 根据后端数据判断是否已批准
      if (this.backendRegistrationData) {
        // 检查顶层的 approved 字段
        return this.backendRegistrationData.approved === true;
      }
      return false;
    },
    isRejected() {
      // 根据后端数据判断是否被拒绝
      if (this.backendRegistrationData) {
        // 检查多个可能的字段
        const status = this.backendRegistrationData.status || 
                      (this.backendRegistrationData.submission_data && this.backendRegistrationData.submission_data.status);
        console.log('Step5 - isRejected check:', {
          status,
          backendData: this.backendRegistrationData
        });
        return status === 'rejected';
      }
      return false;
    },
    isRefunded() {
      // 检查注册是否已退款
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data) {
        return this.backendRegistrationData.registration_data.is_refunded === true;
      }
      return false;
    },
    rejectionReason() {
      // 获取拒绝原因，尝试多个可能的字段位置
      if (this.backendRegistrationData) {
        const reason = this.backendRegistrationData.review_notes || 
                      this.backendRegistrationData.rejection_reason ||
                      (this.backendRegistrationData.submission_data && this.backendRegistrationData.submission_data.review_notes) ||
                      (this.backendRegistrationData.submission_data && this.backendRegistrationData.submission_data.rejection_reason);
        console.log('Step5 - rejectionReason check:', {
          reason,
          backendData: this.backendRegistrationData
        });
        return reason || null;
      }
      return null;
    },
    reviewTime() {
      // 获取审核时间，尝试多个可能的字段位置
      if (this.backendRegistrationData) {
        return this.backendRegistrationData.review_time || 
               this.backendRegistrationData.reviewed_at ||
               (this.backendRegistrationData.submission_data && this.backendRegistrationData.submission_data.review_time) ||
               (this.backendRegistrationData.submission_data && this.backendRegistrationData.submission_data.reviewed_at) ||
               null;
      }
      return null;
    },
    bannerTitle() {
      if (this.isRejected) {
        return 'Registration Rejected';
      }
      return this.isApproved ? 'Registration Approved!' : 'Thank you for your registration!';
    },
    bannerMessage() {
      if (this.isRejected) {
        return 'Unfortunately, your registration has been rejected. Please see the details below.';
      }
      return this.isApproved 
        ? 'Congratulations! Your registration has been approved and you can now download your certificate.' 
        : 'Your registration has been successfully submitted and is being processed.';
    },
    currentUser() {
      // 直接从store获取用户信息，保持实时同步
      return this.$store.state.account.user;
    }
  },
  async mounted() {
    // 检测编辑模式
    if (this.id && this.id !== 'new') {
      this.editMode = true;
      console.log('Step5 - Edit mode detected, registration ID:', this.id);
    }
    
    this.initializeUserData();
    await this.initSSE();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    formatReviewDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    getRegistrationCategory() {
      // 首先尝试从后端数据获取
      if (this.backendRegistrationData && this.backendRegistrationData.registration_data && this.backendRegistrationData.registration_data.registration_category) {
        const category = this.backendRegistrationData.registration_data.registration_category;
        // 只有当 category 是有效值时才使用，否则回退到根据产品代码判断
        if (category === 'attendee' || category === 'student') {
          return 'Attendee Registration';
        } else if (category === 'full') {
          return 'Full Registration';
        }
        // 如果是 'undefined' 或其他无效值，继续执行下面的兜底逻辑
      }
      
      // 兜底：根据产品代码判断
      if (!this.selectedProduct) return 'Not selected';
      
      const productCode = this.selectedProduct.code;
      if (productCode && productCode.includes('Student')) {
        return 'Attendee Registration';
      } else {
        return 'Not selected';
      }
    },
    initializeUserData() {
      // 检查当前登录用户信息 - currentUser现在是computed属性，自动从store获取
      if (!this.currentUser || !this.currentUser.id) {
        console.warn('No user logged in, redirecting to login');
        this.$router.push('/login');
        return;
      }

      this.currentUserId = this.currentUser.id;
      this.loadRegistrationData();
      
      // 检查是否有进行中的收据生成任务
      this.checkExistingReceiptTask();
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

    // 检查是否有进行中的收据生成任务
    async checkExistingReceiptTask() {
      try {
        console.log('🔍 Step5Receipt: 检查是否有进行中的收据任务...');
        
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/submissions/pending_tasks', {
          withCredentials: true
        });
        
        if (response.data && response.data.success && response.data.data.tasks) {
          const receiptTask = response.data.data.tasks.find(task => task.type === 'receipt');
          
          if (receiptTask) {
            console.log('📋 发现进行中的收据任务:', receiptTask);
            
            // 恢复任务状态
            this.currentTaskId = receiptTask.taskId;
            this.isGenerating = receiptTask.status === 'pending' || receiptTask.status === 'processing';
            
            // 添加到全局store
            if (this.$store) {
              this.$store.dispatch('tasks/addDownloadTask', {
                taskId: receiptTask.taskId,
                type: receiptTask.type,
                userId: this.currentUserId,
                status: receiptTask.status,
                progress: receiptTask.progress
              });
            }
            
            // 如果任务已生成，显示提示和下载按钮
            if (receiptTask.status === 'generated') {
              this.$message({
                message: 'Your receipt is ready! You can download it now or check the progress in Document Management.',
                type: 'success',
                duration: 5000
              });
              
              // 直接提供下载功能
              this.showCompletedTaskDownload = true;
              this.completedTaskId = receiptTask.taskId;
            }
          }
        }
      } catch (error) {
        console.error('❌ Step5Receipt: 检查pending任务失败:', error);
      }
    },

    async loadRegistrationData() {
      try {
        this.loading = true;
        this.error = null;
        
        // 调用后端API获取注册数据
        const axios = (await import('axios')).default;
        
        let apiUrl = '/api/submissions/check-registration';
        
        // 如果有ID参数，则调用获取指定ID注册信息的API
        if (this.id && this.id !== 'new') {
          console.log('Step5 - Loading specific registration ID:', this.id);
          
          // 验证ID是否为有效的数字
          if (!/^\d+$/.test(this.id)) {
            console.warn('Step5 - Invalid registration ID format:', this.id);
            this.$message.warning('Invalid registration ID');
            this.$router.push('/dashboard?tab=registrations');
            return;
          }
          
          // 通过ID获取指定注册信息
          apiUrl = `/api/submissions/registration/${this.id}`;
        } else {
          // 没有ID或ID为'new'，获取最新注册
          console.log('Step5 - Loading latest registration');
          apiUrl = '/api/submissions/check-registration';
        }
        
        const response = await axios.get(apiUrl, {
          withCredentials: true
        });
        
        console.log('Step5 - Backend registration data:', response.data);
        
        if (response.data.success && response.data.has_submission) {
          this.backendRegistrationData = response.data;
          // 生成注册ID（使用提交ID）
          if (response.data.registration_id) {
            this.registrationId = this.generateReceiptNumber(response.data.registration_id);
          } else {
            this.registrationId = this.generateRegistrationId();
          }
        } else {
          // 如果指定了ID但没有找到数据，说明ID不存在
          if (this.id && this.id !== 'new') {
            console.warn('Step5 - Registration not found for ID:', this.id);
            this.$message.warning('Registration not found');
            this.$router.push('/dashboard?tab=registrations');
            return;
          }
          // 如果后端没有数据，使用本地生成的ID
          this.registrationId = this.generateRegistrationId();
        }
        
      } catch (error) {
        console.error('Failed to load registration data:', error);
        
        // 如果是404错误且指定了ID，说明ID不存在
        if (this.id && this.id !== 'new' && error.response && error.response.status === 404) {
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
          return;
        }
        
        this.error = 'Failed to load registration data';
        this.registrationId = this.generateRegistrationId();
      } finally {
        this.loading = false;
        
        // 保存后端数据到 localStorage，以便后退到其他步骤时使用
        if (this.currentUserId && this.backendRegistrationData) {
          await this.saveBackendDataToLocalStorage();
        }
        
        // 保存注册完成状态（使用用户关联的键名）
        if (this.currentUserId) {
          localStorage.setItem(this.getStorageKey('conferenceRegistrationComplete'), 'true');
          if (this.registrationId) {
            localStorage.setItem(this.getStorageKey('conferenceRegistrationId'), this.registrationId);
          }
        }
      }
    },

    generateReceiptNumber(submissionId) {
      // 与后端相同的算法生成收据号
      const crypto = require('crypto-js');
      const hash = crypto.MD5(submissionId.toString()).toString().toUpperCase().slice(0, 6);
      return `ICPADS-${hash}`;
    },

    generateRegistrationId() {
      const prefix = 'ICPADS2025';
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      return `${prefix}-${timestamp}${random}`;
    },

    async saveBackendDataToLocalStorage() {
      if (!this.backendRegistrationData || !this.backendRegistrationData.registration_data) {
        return;
      }

      const regData = this.backendRegistrationData.registration_data;
      const images = this.backendRegistrationData.images || {};

      try {
        console.log('Step5 - Saving backend data to localStorage');

        // 保存产品选择数据
        const productData = {
          code: regData.product_code,
          price: regData.product_price,
          priceRMB: regData.product_price_rmb,
          description: this.getProductDescription(regData.product_code)
        };
        localStorage.setItem(
          this.getStorageKey('conferenceProductSelection'),
          JSON.stringify(productData)
        );

        // 保存用户信息
        const userInfo = {
          name: regData.name,
          email: regData.email,
          phone: regData.phone,
          affiliation: regData.affiliation,
          paperId: regData.paper_id,
          paperPages: regData.paper_pages
        };
        localStorage.setItem(
          this.getStorageKey('conferenceUserInfo'),
          JSON.stringify(userInfo)
        );

        // 保存支付方式
        if (regData.payment_method) {
          localStorage.setItem(
            this.getStorageKey('conferencePaymentMethod'),
            regData.payment_method
          );
        }

        // 加载并保存图片（如果有）
        if (images.proof) {
          await this.loadAndSaveImage(images.proof, 'conferenceProofFile');
        }

        if (images.screenshot) {
          await this.loadAndSaveImage(images.screenshot, 'conferencePaymentProof');
        }

        console.log('Step5 - Backend data saved to localStorage successfully');
      } catch (error) {
        console.warn('Step5 - Failed to save backend data to localStorage:', error);
      }
    },

    getProductDescription(productCode) {
      const products = {
        'IEEE Member': 'For IEEE members',
        'Non-IEEE Member': 'For non-IEEE members',
        'Life Member': 'For IEEE life members',
        'Student - IEEE Member': 'For students with IEEE membership',
        'Student - Non-IEEE Member': 'For students without IEEE membership'
      };
      return products[productCode] || '';
    },

    async loadAndSaveImage(imageUrl, storageKey) {
      try {
        const axios = (await import('axios')).default;

        // 构建完整URL
        let fullUrl = imageUrl;
        if (!imageUrl.startsWith('http')) {
          const baseUrl = window.location.origin;
          fullUrl = `${baseUrl}${imageUrl}`;
        }

        console.log(`Step5 - Loading image from: ${fullUrl}`);

        const response = await axios.get(fullUrl, {
          responseType: 'blob',
          withCredentials: true
        });

        const blob = response.data;

        // 检查文件大小，超过2MB的不存储到localStorage
        const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB
        if (blob.size > MAX_STORAGE_SIZE) {
          console.log(`Step5 - Image too large (${Math.round(blob.size / 1024)}KB), skipping localStorage storage`);
          return;
        }

        // 转换为 base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result;
          try {
            localStorage.setItem(this.getStorageKey(storageKey), base64Data);
            console.log(`Step5 - Image saved to localStorage: ${storageKey}`);
          } catch (storageError) {
            console.warn(`Step5 - Failed to save image to localStorage: ${storageKey}`, storageError);
          }
        };
        reader.readAsDataURL(blob);

      } catch (error) {
        console.warn(`Step5 - Failed to load image ${imageUrl}:`, error);
        // 不阻塞流程
      }
    },

    async downloadCertificate() {
      try {
        if (!this.isApproved) {
          this.$message.warning('Receipt is only available for approved registrations');
          return;
        }

        // 检查是否已经有任务在进行
        if (this.isGenerating && this.currentTaskId) {
          this.$message({
            message: 'Receipt generation is already in progress. You can check the progress in your user dashboard.',
            type: 'warning'
          });
          return;
        }

        // 检查全局 store 中是否有当前用户的 receipt 任务在进行
        if (this.$store && this.currentUser) {
          const existingTask = this.$store.getters['tasks/getUserTaskByType'](this.currentUser.id, 'receipt');
          if (existingTask && existingTask.status === 'processing') {
            this.$message({
              message: 'Receipt generation is already in progress. You can check the progress in your user dashboard.',
              type: 'warning'
            });
            return;
          }
        }

        this.$message.info('Starting receipt generation...');
        
        // 调用后端下载接口
        const axios = (await import('axios')).default;
        
        // 使用新的异步接口（SSE模式）
        await this.downloadReceiptAsync(axios);
        
      } catch (error) {
        console.error('Download certificate error:', error);
        if (error.response && error.response.status === 404) {
          this.$message.error('No approved registration found. Please contact support.');
        } else {
          this.$message.error(`Failed to download receipt: ${error.message || error}`);
        }
      }
    },

    async downloadReceiptAsync(axios) {
      try {
        // 第一步：启动PDF生成
        this.isGenerating = true;
        
        const generateResponse = await axios.post('/api/submissions/generate_receipt', {
          marginMode: 'standard', // 默认边距模式
          registrationId: this.id // 传递当前注册ID
        }, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!generateResponse.data.success) {
          throw new Error(generateResponse.data.message || 'Failed to start PDF generation');
        }

        const taskId = generateResponse.data.taskId;
        this.currentTaskId = taskId;
        console.log(`Receipt generation started with task ID: ${taskId}`);

        // 声明任务所有权 - 基于URL路径
        this.$globalSSEManager.claimTask(taskId, `Step5Receipt_${this.$route.path}`);

        // 将任务添加到全局 store，以便 DocumentManagement 组件可以查看进度
        if (this.$store && this.currentUser) {
          this.$store.dispatch('tasks/addDownloadTask', {
            taskId: taskId,
            type: 'receipt',
            userId: this.currentUser.id
          });
        }

        // 显示成功消息并提醒用户查看进度
        this.$message({
          message: 'Receipt generation started! You can view the progress in your user dashboard under Document Download section.',
          type: 'success',
          duration: 5000
        });

      } catch (error) {
        console.error('Async download error:', error);
        this.isGenerating = false;
        this.currentTaskId = null;
        
        // 如果是409冲突错误（重复任务），提示用户查看进度
        if (error.response && error.response.status === 409) {
          this.$message({
            message: 'Receipt generation is already in progress. You can check the progress in your user dashboard.',
            type: 'warning'
          });
          return;
        }
        
        throw error;
      }
    },

    // 初始化SSE连接
    async initSSE() {
      try {
        console.log('📡 Step5Receipt: 订阅SSE服务...');
        
        // 创建任务检查函数 - 基于URL路径
        const taskChecker = (taskId) => {
          // 只有在Step5页面且任务ID匹配时才认领任务
          const isOnStep5 = this.$route.path.includes('/conference/register/step5');
          const hasMyTask = taskId === this.currentTaskId;
          const isMyTask = isOnStep5 && hasMyTask;
          
          if (isMyTask) {
            console.log(`Step5Receipt: 确认任务 ${taskId} 属于我 (URL: ${this.$route.path})`);
          } else if (hasMyTask) {
            console.log(`Step5Receipt: 任务 ${taskId} 匹配但URL不匹配 (URL: ${this.$route.path})`);
          } else {
            console.log(`Step5Receipt: 任务 ${taskId} 不属于我 (currentTaskId: ${this.currentTaskId})`);
          }
          return isMyTask;
        };
        
        // 使用全局SSE管理器注册，并提供任务检查函数
        this.$globalSSEManager.registerComponent(`Step5Receipt_${this.$route.path}`, this.handleSSECompleted, taskChecker);
        
        // 创建其他回调函数并存储引用，便于后续清理
        this.onProgressCallback = this.handleSSEProgress.bind(this);
        this.onFailedCallback = this.handleSSEFailed.bind(this);
        
        // 初始化SSE服务并注册其他回调
        sseService.init({
          onProgress: this.onProgressCallback,
          onFailed: this.onFailedCallback
        });
        
      } catch (error) {
        console.error('❌ Step5Receipt: 初始化SSE失败:', error);
      }
    },

    // 清理资源
    cleanup() {
      // 从全局SSE管理器注销
      this.$globalSSEManager.unregisterComponent(`Step5Receipt_${this.$route.path}`);
      
      // 移除其他SSE回调函数
      if (this.onProgressCallback) {
        sseService.off('progress', this.onProgressCallback);
      }
      if (this.onFailedCallback) {
        sseService.off('failed', this.onFailedCallback);
      }
      
      // 清理回调引用
      this.onProgressCallback = null;
      this.onCompletedCallback = null;
      this.onFailedCallback = null;
      
      // 让SSE服务检查是否还有其他监听器，决定是否保持连接
      sseService.cleanup();
      
      this.isGenerating = false;
      this.currentTaskId = null;
    },

    // 处理SSE进度更新
    handleSSEProgress(data) {
      const { taskId, progress } = data;
      
      // 只处理当前任务的进度
      if (taskId === this.currentTaskId) {
        console.log(`📄 PDF生成进度: ${progress}%`);
        
        // 更新全局 store 中的进度
        if (this.$store) {
          this.$store.dispatch('tasks/updateTaskProgress', {
            taskId: taskId,
            progress: progress
          });
        }
        
        if (progress > 0) {
          this.$message({
            message: `Generating receipt... ${progress}%`,
            type: 'info',
            duration: 2000
          });
        }
      }
    },

    // 处理SSE完成通知
    handleSSECompleted(data) {
      const { taskId } = data;
      
      // 只处理当前任务的通知
      if (taskId === this.currentTaskId) {
        console.log('📄 PDF生成完成，全局管理器将处理自动下载');
        
        // 标记任务生成完成在全局 store 中
        if (this.$store) {
          this.$store.dispatch('tasks/generateTask', {
            taskId: taskId
          });
        }
        
        this.$message({
          message: 'Receipt ready! Downloading automatically...',
          type: 'success'
        });
        
        // 不再在组件中进行自动下载，让全局管理器处理
        // 只重置状态
        setTimeout(() => {
          this.isGenerating = false;
          this.currentTaskId = null;
        }, 2000); // 延迟2秒后重置状态
      }
    },

    // 处理SSE失败通知
    handleSSEFailed(data) {
      const { taskId, error } = data;
      
      // 只处理当前任务
      if (taskId === this.currentTaskId) {
        console.error('📄 PDF生成失败:', error);
        
        // 标记任务失败在全局 store 中
        if (this.$store) {
          this.$store.dispatch('tasks/failTask', {
            taskId: taskId,
            error: error || 'Unknown error'
          });
        }
        
        this.$message({
          message: `Receipt generation failed: ${error || 'Unknown error'}`,
          type: 'error'
        });
        
        // 重置状态
        this.isGenerating = false;
        this.currentTaskId = null;
      }
    },

    // 下载已完成的PDF
    async downloadCompletedPDF(taskId) {
      const downloadManager = this.$getDownloadManager();
      if (!downloadManager) {
        console.error('下载管理器未初始化');
        return;
      }
      
      const downloadKey = downloadManager.generateDownloadKey('step5', taskId);
      
      await downloadManager.downloadPDF({
        taskId,
        type: 'receipt',
        downloadKey,
        filename: `ICPADS2025_Receipt_${this.registrationId}.pdf`,
        context: this,
        onSuccess: (taskId) => {
          // 下载成功后先标记任务为已下载
          if (this.$store) {
            this.$store.dispatch('tasks/downloadTask', { taskId });
          }
          
          // 通知其他标签页下载已完成
          this.$globalSSEManager.notifyDownloadCompleted(taskId, 'receipt');
          
          // 延迟一段时间后从全局 store 中移除任务
          setTimeout(() => {
            if (this.$store) {
              this.$store.dispatch('tasks/removeTask', { taskId });
            }
          }, 2000); // 2秒后清理
          
          // 重置状态
          this.isGenerating = false;
          this.currentTaskId = null;
        },
        onError: (error) => {
          console.error('Error downloading completed PDF:', error);
          // 出错时也重置状态
          this.isGenerating = false;
          this.currentTaskId = null;
        }
      });
    },

    async refreshRegistrationStatus() {
      // 刷新注册状态
      try {
        this.$message.info('Refreshing registration status...');
        await this.loadRegistrationData();
        this.$message.success('Registration status refreshed successfully');
      } catch (error) {
        this.$message.error('Failed to refresh registration status');
      }
    },

    goToPreviousStep() {
      // 返回上一步（Step4会处理已批准注册的警告）
      if (this.editMode && this.id) {
        this.$router.push(`/conference/${this.id}/step4`);
      } else {
        this.$router.push('/conference/step4');
      }
    },

    goToUserPanel() {
      // 跳转到用户面板
      this.$router.push('/dashboard');
    },

    goToHome() {
      this.$router.push('/');
    }
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
  margin-bottom: 40px;
}

.header h1 {
  color: #409EFF;
  margin-bottom: 20px;
}

.header h1 {
  color: #409EFF;
  margin-bottom: 20px;
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

.progress-nav-warning {
  background: linear-gradient(135deg, #ff7043 0%, #ff6f00 100%) !important;
  box-shadow: 0 2px 8px rgba(255, 112, 67, 0.3);
}

.progress-nav-warning:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff5722 0%, #e65100 100%) !important;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(255, 87, 34, 0.4);
}

.progress-nav-right {
  background: linear-gradient(135deg, #409EFF 0%, #66b3ff 100%) !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.progress-nav-right:hover:not(:disabled) {
  background: linear-gradient(135deg, #337ab7 0%, #409EFF 100%) !important;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
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
  background: #4caf50;
  transition: width 0.3s ease;
}

.content {
  margin-bottom: 40px;
}

.success-banner {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  border-left: 4px solid #4caf50;
}

.success-banner.approved {
  border-left-color: #4caf50;
  background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
}

.success-banner.pending {
  border-left-color: #ff9800;
  background: linear-gradient(135deg, #fff3e0 0%, #fffe80 100%);
}

.success-banner.rejected {
  border-left-color: #f44336;
  background: linear-gradient(135deg, #ffebee 0%, #fce4ec 100%);
}

.success-icon {
  font-size: 32px;
  margin-right: 15px;
  color: #4caf50;
}

.success-banner.pending .success-icon {
  color: #ff9800;
}

.success-banner.approved .success-icon {
  color: #4caf50;
}

.success-banner.rejected .success-icon {
  color: #f44336;
}

.success-banner h2 {
  margin: 0 0 8px 0;
  color: #2e7d32;
  font-size: 24px;
  line-height: 1.3;
}

.success-banner.rejected h2 {
  color: #c62828;
}

.success-banner p {
  margin: 0;
  color: #4a6c4e;
  font-size: 16px;
  line-height: 1.4;
}

.success-banner.rejected p {
  color: #b71c1c;
}

/* Refund notice */
.refund-notice {
  background: #fff8e1;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(255, 152, 0, 0.1);
  margin-bottom: 30px;
  border: 2px solid #ffecb3;
}

.refund-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid #ffe082;
}

.refund-header i {
  font-size: 28px;
  color: #ff9800;
}

.refund-header h3 {
  color: #e65100;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.refund-body {
  margin-bottom: 0;
}

.refund-body p {
  color: #424242;
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.refund-body p:last-child {
  margin-bottom: 0;
}

.refund-body a {
  color: #1976d2;
  text-decoration: none;
}

.refund-body a:hover {
  text-decoration: underline;
}

/* Rejection notice */
.rejection-notice {
  background: #fff5f5;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(244, 67, 54, 0.1);
  margin-bottom: 30px;
  border: 2px solid #ffcdd2;
}

.rejection-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #ffcdd2;
}

.rejection-header i {
  font-size: 28px;
  color: #f44336;
}

.rejection-header h3 {
  color: #c62828;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.rejection-body {
  margin-bottom: 16px;
}

.rejection-reason {
  margin-bottom: 16px;
}

.rejection-reason label {
  display: block;
  color: #f56c6c;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rejection-reason p {
  color: #303133;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border-left: 3px solid #f56c6c;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.rejection-reason p.no-reason {
  color: #909399;
  font-style: italic;
  border-left-color: #e0e0e0;
}

.rejection-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
}

.rejection-time i {
  font-size: 14px;
}

.rejection-footer {
  padding-top: 16px;
  border-top: 1px solid #ffcdd2;
}

.rejection-footer p {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.rejection-footer a {
  color: #409EFF;
  text-decoration: none;
  font-weight: 500;
}

.rejection-footer a:hover {
  text-decoration: underline;
}

.registration-summary {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.registration-summary h3 {
  color: #409EFF;
  margin-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 8px;
  font-size: 18px;
}

.summary-section {
  margin-bottom: 18px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.summary-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.summary-section h4 {
  color: #333;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
}

.info-item {
  background: #f8f9fa;
  padding: 10px 14px;
  border-radius: 6px;
  border-left: 3px solid #e9ecef;
  transition: all 0.3s ease;
}

.info-item:hover {
  background: #e9ecef;
  border-left-color: #409EFF;
}

.info-item .label {
  display: block;
  color: #666;
  font-weight: 500;
  font-size: 12px;
  margin-bottom: 3px;
}

.info-item .value {
  display: block;
  color: #333;
  font-weight: 600;
  font-size: 14px;
}

.price {
  color: #f56c6c !important;
  font-size: 15px !important;
  font-weight: 700 !important;
}

.total-price {
  color: #e91e63 !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  background: linear-gradient(135deg, #fff3f3, #ffe0e0);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ffd0d0;
}

.actions-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.actions-section h3 {
  color: #409EFF;
  margin-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  font-size: 20px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  margin: 0; /* 确保所有按钮没有额外的margin */
}

.action-buttons .el-button--primary {
  background: linear-gradient(135deg, #409EFF 0%, #66b3ff 100%);
  border-color: #409EFF;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.action-buttons .el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}

.action-buttons .el-button--primary.is-disabled,
.action-buttons .el-button--primary:disabled {
  background: #c0c4cc !important;
  border-color: #c0c4cc !important;
  color: #ffffff !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  transform: none !important;
}

.action-buttons .el-button--primary.is-disabled:hover,
.action-buttons .el-button--primary:disabled:hover {
  background: #c0c4cc !important;
  border-color: #c0c4cc !important;
  color: #ffffff !important;
  transform: none !important;
  box-shadow: none !important;
}

/* Refresh Button - Orange */
.action-buttons .refresh-button {
  background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%) !important;
  border-color: #ff9800 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3) !important;
}

.action-buttons .refresh-button:hover {
  background: linear-gradient(135deg, #f57c00 0%, #ff9800 100%) !important;
  border-color: #f57c00 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(255, 152, 0, 0.4) !important;
}

/* Renew Button - Red */
.action-buttons .renew-button {
  background: linear-gradient(135deg, #f44336 0%, #ef5350 100%) !important;
  border-color: #f44336 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3) !important;
}

.action-buttons .renew-button:hover {
  background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%) !important;
  border-color: #d32f2f !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4) !important;
}

/* Dashboard Button - Green */
.action-buttons .dashboard-button {
  background: linear-gradient(135deg, #4caf50 0%, #81c784 100%) !important;
  border-color: #4caf50 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3) !important;
}

.action-buttons .dashboard-button:hover {
  background: linear-gradient(135deg, #388e3c 0%, #4caf50 100%) !important;
  border-color: #388e3c !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4) !important;
}

.download-notice {
  margin-top: 15px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  line-height: 1.8;
  display: flex;
  align-items: center;
  gap: 12px;
}

.download-notice i {
  color: #64748b;
  font-size: 18px;
  flex-shrink: 0;
}

.download-notice .link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
}

.download-notice .link.highlight-link {
  color: #3b82f6;
  font-weight: 600;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  white-space: nowrap;
}

.download-notice .link:hover {
  text-decoration: underline;
}

.download-notice .link.highlight-link:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  text-decoration: underline;
}

/* 编辑已批准注册的警告提示 */
.edit-warning-notice {
  margin-top: 20px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border: 2px solid #ff9800;
  border-left: 6px solid #f57c00;
  border-radius: 8px;
  color: #e65100;
  font-size: 14px;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.15);
}

.edit-warning-notice i {
  color: #f57c00;
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.edit-warning-notice .warning-content {
  flex: 1;
}

.edit-warning-notice .warning-content strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #e65100;
  margin-bottom: 8px;
}

.edit-warning-notice .warning-content p {
  margin: 0;
  line-height: 1.6;
  color: #bf360c;
}

.next-steps {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.next-steps h3 {
  color: #409EFF;
  margin-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  font-size: 20px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #409EFF;
  transition: all 0.3s ease;
}

.step-item:hover {
  background: #e9ecef;
  transform: translateX(5px);
}

.step-item i {
  font-size: 24px;
  margin-right: 15px;
  color: #409EFF;
  margin-top: 2px;
}

.step-item div {
  flex: 1;
}

.step-item strong {
  color: #333;
  display: block;
  margin-bottom: 5px;
  font-size: 16px;
}

.step-item p {
  color: #666;
  margin: 0;
  line-height: 1.5;
  font-size: 14px;
}

.contact-info {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.contact-info h3 {
  color: #409EFF;
  margin-bottom: 15px;
  font-size: 18px;
}

.contact-info > p {
  color: #666;
  margin-bottom: 20px;
  font-size: 15px;
}

.contact-details {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.contact-details p {
  margin: 8px 0;
  color: #333;
  display: flex;
  align-items: center;
  font-size: 15px;
}

.contact-details i {
  color: #28a745;
  margin-right: 10px;
  width: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-container {
    padding: 15px;
  }
  
  .header h1 {
    font-size: 20px;
    margin-bottom: 15px;
  }
  
  .success-banner {
    padding: 15px;
    flex-direction: column;
    text-align: center;
  }
  
  .success-banner .success-icon {
    margin-right: 0;
    margin-bottom: 10px;
    font-size: 28px;
  }
  
  .success-banner h2 {
    font-size: 20px;
    margin-bottom: 10px;
  }
  
  .success-banner p {
    font-size: 14px;
    line-height: 1.5;
  }
  
  .registration-summary {
    padding: 20px;
  }
  
  .registration-summary h3 {
    margin-bottom: 15px;
    font-size: 16px;
  }
  
  .summary-section {
    margin-bottom: 15px;
    padding-bottom: 12px;
  }
  
  .summary-section h4 {
    margin-bottom: 10px;
    font-size: 14px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .info-item {
    padding: 8px 12px;
  }
  
  .info-item .label {
    font-size: 11px;
  }
  
  .info-item .value {
    font-size: 13px;
  }
  
  .actions-section {
    padding: 20px;
  }
  
  .actions-section h3 {
    font-size: 18px;
    margin-bottom: 15px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 10px;
  }
  
  .action-buttons .el-button {
    width: 100%;
    margin: 0;
  }
  
  .next-steps {
    padding: 20px;
  }
  
  .next-steps h3 {
    font-size: 18px;
  }
  
  .step-item {
    flex-direction: column;
    text-align: center;
    padding: 15px;
  }
  
  .step-item i {
    margin-right: 0;
    margin-bottom: 15px;
    align-self: center;
    font-size: 28px;
  }
  
  .step-item div {
    width: 100%;
  }
  
  .step-item strong {
    font-size: 15px;
    margin-bottom: 8px;
  }
  
  .step-item p {
    font-size: 13px;
    line-height: 1.4;
  }
  
  .contact-info {
    padding: 20px;
  }
  
  .contact-info h3 {
    font-size: 16px;
  }
}

/* 新增的样式 */
.registration-category {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.membership-type {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.extra-pages {
  color: #E6A23C;
  font-weight: 500;
  margin-left: 8px;
  font-size: 0.9em;
}

.registration-id {
  font-family: 'Courier New', monospace;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  color: #409EFF;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .registration-category .el-tag,
  .membership-type .el-tag {
    margin-left: 4px !important;
    margin-top: 4px;
  }
}
</style>
