<template>
  <div class="step-container">
    <div class="header">
      <h1>Step 4: Confirmation</h1>
      <div class="progress-container">
        <button 
          class="progress-nav-btn progress-nav-left"
          @click="goBack"
          title="Previous step"
        >
          <i class="el-icon-arrow-left"></i>
        </button>
        <div class="progress-bar">
          <div class="progress" :style="{ width: '80%' }"></div>
        </div>
        <button 
          class="progress-nav-btn progress-nav-right"
          @click="submitRegistration"
          :disabled="!canSubmit"
          :loading="isSubmitting"
          title="Submit registration"
        >
          <i class="el-icon-arrow-right"></i>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- 信息确认 -->
      <div class="confirmation-summary">
        <h3>Please Review Your Information</h3>
        
        <!-- 产品信息 -->
        <div class="info-section">
          <h4>Registration Details</h4>
          <div class="info-row">
            <span>Registration Category:</span>
            <strong>{{ getRegistrationCategory() }}</strong>
          </div>
          <div class="info-row">
            <span>Membership Type:</span>
            <strong>{{ selectedProduct ? selectedProduct.code : 'Not selected' }}</strong>
          </div>
          <div class="info-row">
            <span>Base Registration Fee:</span>
            <div class="price-display">
              <strong class="price" v-if="isInternational">${{ basePriceUSD }} USD</strong>
              <strong class="price-rmb" v-if="isDomestic">¥{{ basePriceRMB }} RMB</strong>
            </div>
          </div>
          <div class="info-row" v-if="extraPagesCount > 0">
            <span>Extra Page Fee ({{ extraPagesCount }} pages):</span>
            <div class="price-display">
              <strong class="price" v-if="isInternational">${{ extraPageFeeUSD }} USD</strong>
              <strong class="price-rmb" v-if="isDomestic">¥{{ extraPageFeeRMB }} RMB</strong>
            </div>
          </div>
          <div class="info-row" v-if="userInfo.paperId">
            <span>Paper ID:</span>
            <strong>{{ userInfo.paperId }}</strong>
          </div>
          <div class="info-row" v-if="userInfo.paperPages">
            <span>Paper Pages:</span>
            <strong>{{ userInfo.paperPages }}</strong>
            <span v-if="parseInt(userInfo.paperPages) > 8" class="extra-fee-note">
              (Extra page fee applies: $80 / RMB 600)
            </span>
          </div>
          <div class="info-row">
            <span>Total Amount:</span>
            <div class="price-display">
              <strong class="price" v-if="isInternational">${{ totalUSD }} USD</strong>
              <strong class="price-rmb" v-if="isDomestic">¥{{ totalRMB }} RMB</strong>
            </div>
          </div>
        </div>

        <!-- 个人信息 -->
        <div class="info-section">
          <h4>Personal Information</h4>
          <div class="info-row">
            <span>Full Name:</span>
            <strong>{{ userInfo.name || 'Not provided' }}</strong>
          </div>
          <div class="info-row">
            <span>Email:</span>
            <strong>{{ userInfo.email || 'Not provided' }}</strong>
          </div>
          <div class="info-row">
            <span>Institution:</span>
            <strong>{{ userInfo.affiliation || 'Not provided' }}</strong>
          </div>
        </div>

        <!-- 支付方式 -->
        <div class="info-section">
          <h4>Payment Method</h4>
          <div class="info-row">
            <span>Method:</span>
            <strong>{{ paymentMethodName }}</strong>
          </div>
        </div>
      </div>

      <!-- 支付凭证上传 -->
      <div class="payment-proof">
        <h3>Upload Payment Screenshot</h3>
        <p class="upload-instruction">
          Please upload a screenshot of your payment confirmation as proof of payment.
        </p>
        
        <div class="upload-compact">
          <div class="upload-section">
            <el-upload
              class="upload-demo"
              :auto-upload="false"
              :on-change="handleFileChange"
              :show-file-list="false"
              accept="image/*"
              action="#"
            >
              <el-button size="small" type="primary">
                <i class="el-icon-upload"></i> Choose File
              </el-button>
            </el-upload>
            <div class="upload-tip">jpg/png files with a size less than 5MB</div>
          </div>

          <div v-if="uploadedProof" class="preview-section">
            <div class="preview-label">Uploaded Payment Proof:</div>
            <div class="preview-content">
              <img :src="uploadedProof" alt="Payment Proof" class="proof-preview-small">
              <el-button 
                size="mini" 
                @click="removeProof" 
                class="remove-btn-inline"
              >
                Remove
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 显示缺失字段的提示 -->
      <div v-if="!canSubmit" class="submit-requirements">
        <div class="requirements-header">
          <i class="el-icon-warning-outline"></i>
          <h4>Please complete the following to submit:</h4>
        </div>
        <ul class="requirements-list">
          <li v-if="!selectedProduct" class="missing-item">
            <i class="el-icon-close"></i> Registration type selection
          </li>
          <li v-if="!userInfo.name" class="missing-item">
            <i class="el-icon-close"></i> Full name
          </li>
          <!-- 移除email检查，因为email现在总是从用户账户自动加载 -->
          <li v-if="!paymentMethod" class="missing-item">
            <i class="el-icon-close"></i> Payment method
          </li>
          <li v-if="!uploadedProof" class="missing-item">
            <i class="el-icon-close"></i> Payment screenshot
          </li>
        </ul>
      </div>
    </div>

    <div class="actions">
      <el-button @click="goBack">Back</el-button>
      <el-button 
        type="primary" 
        @click="submitRegistration"
        :disabled="!canSubmit"
        :loading="isSubmitting"
      >
        Submit Registration
      </el-button>
    </div>

    <!-- 自定义确认对话框 -->
    <div v-if="showConfirmDialog" class="custom-dialog-overlay" @click="handleOverlayClick">
      <div class="custom-dialog" @click.stop>
        <div class="dialog-header">
          <h3><i class="el-icon-warning"></i> Warning: Approved Registration Will Be Overwritten</h3>
        </div>
        <div class="dialog-content">
          <div class="dialog-icon">
            <i class="el-icon-warning-outline"></i>
          </div>
          <div class="dialog-message">
            <p class="warning-title">Your current registration has been approved.</p>
            <p class="warning-details">If you submit this form, it will:</p>
            <ul class="warning-list">
              <li><strong>Overwrite</strong> your existing approved registration data</li>
              <li><strong>Reset</strong> your registration status to "Pending Review"</li>
              <li><strong>Require</strong> administrator approval again</li>
            </ul>
            <p class="warning-question">Are you sure you want to continue?</p>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn cancel-btn" @click="cancelSubmission">
            <i class="el-icon-close"></i> Cancel
          </button>
          <button class="dialog-btn confirm-btn" @click="confirmSubmission">
            <i class="el-icon-check"></i> Yes, Overwrite and Resubmit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Step4Confirmation',
  props: {
    id: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      uploadedProof: null,
      paymentFile: null, // 存储实际文件对象
      isSubmitting: false,
      currentUserId: null,
      showConfirmDialog: false, // 自定义确认对话框显示状态
      editMode: false // 是否处于编辑模式
    }
  },
  computed: {
    selectedProduct() {
      if (!this.currentUserId) return null;
      try {
        const saved = localStorage.getItem(this.getStorageKey('conferenceProductSelection'));
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load product selection:', error);
      }
      return null;
    },
    userInfo() {
      if (!this.currentUserId) return {};
      try {
        const saved = localStorage.getItem(this.getStorageKey('conferenceUserInfo'));
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load user info:', error);
      }
      return {};
    },
    paymentMethod() {
      if (!this.currentUserId) return null;
      return localStorage.getItem(this.getStorageKey('conferencePaymentMethod'));
    },
    paymentMethodName() {
      // 与第三步展示的名称保持一致
      const methods = {
        'international': 'International Bank Transfer',
        'domestic': 'China Mainland Payment'
      };
      return methods[this.paymentMethod] || 'Not selected';
    },
    isDomestic() {
      return this.paymentMethod === 'domestic';
    },
    isInternational() {
      return this.paymentMethod === 'international';
    },
    // 计算超页和金额（与第三步逻辑一致）
    extraPagesCount() {
      if (!this.userInfo.paperPages) return 0;
      const pages = parseInt(this.userInfo.paperPages);
      return pages > 8 ? (pages - 8) : 0;
    },
    basePriceUSD() {
      return this.selectedProduct ? (this.selectedProduct.price || 0) : 0;
    },
    basePriceRMB() {
      if (!this.selectedProduct) return 0;
      // 有则用本地保存的 priceRMB，缺失时根据产品代码回退到固定人民币价目
      if (this.selectedProduct.priceRMB != null) return this.selectedProduct.priceRMB;
      const code = this.selectedProduct.code;
      const priceMapRMB = {
        'IEEE Member': 5000,
        'Non-IEEE Member': 6000,
        'Life Member': 3600,
        'Student - IEEE Member': 3600,
        'Student - Non-IEEE Member': 4400
      };
      return priceMapRMB[code] || 0;
    },
    extraPageFeeUSD() {
      return this.extraPagesCount * 80; // 每超1页 $80
    },
    extraPageFeeRMB() {
      return this.extraPagesCount * 600; // 每超1页 ¥600
    },
    totalUSD() {
      return this.basePriceUSD + this.extraPageFeeUSD;
    },
    totalRMB() {
      return this.basePriceRMB + this.extraPageFeeRMB;
    },
    canSubmit() {
      // Email不再需要检查，因为它会自动从用户账户中获取
      // 后端会确保当前用户有有效的email地址
      return this.selectedProduct && 
             this.userInfo.name && 
             this.paymentMethod && 
             this.uploadedProof; // 只需要有上传的凭证预览即可
    }
  },
  mounted() {
    this.initializeUserData();
    
    // 检测是否处于编辑模式
    if (this.id && this.id !== 'new') {
      this.editMode = true;
      console.log('Step4 - Edit mode detected, registration ID:', this.id);
    }
  },
  methods: {
    getRegistrationCategory() {
      if (!this.selectedProduct) return 'Not selected';
      
      const productCode = this.selectedProduct.code;
      
      // 根据产品代码判断是全额注册还是学生注册
      if (productCode.includes('Student')) {
        return 'Student Registration';
      } else {
        return 'Full Registration';
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
      
      // 首先尝试从后端恢复数据
      await this.loadBackendDataIfNeeded();
      
      // 然后加载本地保存的支付凭证
      this.loadUploadedProof();
      this.debugData();
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

    debugData() {
      console.log('=== Step4Confirmation Debug Info ===');
      console.log('currentUserId:', this.currentUserId);
      console.log('selectedProduct:', this.selectedProduct);
      console.log('userInfo:', this.userInfo);
      console.log('paymentMethod:', this.paymentMethod);
      console.log('uploadedProof:', !!this.uploadedProof);
      console.log('paymentFile:', !!this.paymentFile);
      
      // 检查第一步的证明文件
      const savedProofFile = localStorage.getItem(this.getStorageKey('conferenceProofFile'));
      console.log('savedProofFile exists:', !!savedProofFile);
      if (savedProofFile) {
        const sizeInKB = Math.round(savedProofFile.length * 0.75 / 1024); // 估算base64图片大小
        console.log('savedProofFile size estimate:', sizeInKB + 'KB');
      }
      
      console.log('canSubmit:', this.canSubmit);
      console.log('canSubmit breakdown:');
      console.log('  - selectedProduct:', !!this.selectedProduct);
      console.log('  - userInfo.name:', !!this.userInfo.name);
      console.log('  - userInfo.email (auto-loaded):', !!this.userInfo.email);
      console.log('  - paymentMethod:', !!this.paymentMethod);
      console.log('  - uploadedProof:', !!this.uploadedProof);
      console.log('====================================');
    },

    async loadBackendDataIfNeeded() {
      try {
        // 检查是否已有本地数据
        const hasLocalProduct = localStorage.getItem(this.getStorageKey('conferenceProductSelection'));
        const hasLocalUserInfo = localStorage.getItem(this.getStorageKey('conferenceUserInfo'));
        const hasLocalPaymentProof = localStorage.getItem(this.getStorageKey('conferencePaymentProof'));
        
        // 如果本地数据完整，跳过后端检查
        if (hasLocalProduct && hasLocalUserInfo && hasLocalPaymentProof) {
          console.log('Step4 - Local data is complete, skipping backend check');
          return;
        }
        
        // 调用后端API获取注册数据
        const axios = (await import('axios')).default;
        
        let apiUrl;
        let response;
        
        // 如果有 ID 参数（编辑模式），获取特定的注册记录
        if (this.id && this.id !== 'new') {
          console.log('Step4 - Loading specific registration:', this.id);
          
          // 验证ID格式
          if (!/^\d+$/.test(this.id)) {
            console.warn('Step4 - Invalid registration ID format:', this.id);
            this.$message.warning('Invalid registration ID');
            this.$router.push('/dashboard?tab=registrations');
            return;
          }
          
          apiUrl = `/api/submissions/registration/${this.id}`;
          response = await axios.get(apiUrl, {
            withCredentials: true
          });
        } else {
          // 否则获取最新的注册记录
          console.log('Step4 - Loading latest registration');
          apiUrl = '/api/submissions/check-registration';
          response = await axios.get(apiUrl, {
            withCredentials: true
          });
        }
        
        console.log('Step4 - Backend registration data:', response.data);
        
        if (response.data.success && (response.data.has_submission || response.data.registration_data)) {
          await this.saveBackendDataToLocalStorage(response.data);
        } else if (this.id && this.id !== 'new') {
          // 如果是编辑模式但没有找到数据，说明ID不存在
          console.warn('Step4 - Registration not found for ID:', this.id);
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
        
      } catch (error) {
        console.error('Failed to load backend data:', error);
        
        // 如果是404错误且在编辑模式，说明ID不存在
        if (this.id && this.id !== 'new' && error.response && error.response.status === 404) {
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
        // 其他错误不阻塞流程
      }
    },

    async saveBackendDataToLocalStorage(backendData) {
      if (!this.currentUserId || !backendData.registration_data) {
        return;
      }
      
      const regData = backendData.registration_data;
      const images = backendData.images || {};
      
      try {
        // 保存产品选择数据（如果本地没有）
        if (!localStorage.getItem(this.getStorageKey('conferenceProductSelection'))) {
          const productData = {
            code: regData.product_code,
            price: regData.product_price,
            description: this.getProductDescription(regData.product_code)
          };
          localStorage.setItem(
            this.getStorageKey('conferenceProductSelection'), 
            JSON.stringify(productData)
          );
        }
        
        // 保存用户信息（如果本地没有）
        if (!localStorage.getItem(this.getStorageKey('conferenceUserInfo'))) {
          const userInfo = {
            name: regData.name,
            email: regData.email,
            phone: regData.phone,
            affiliation: regData.affiliation,
            paperId: regData.paper_id
          };
          localStorage.setItem(
            this.getStorageKey('conferenceUserInfo'), 
            JSON.stringify(userInfo)
          );
        }
        
        // 加载证明文件图片（如果本地没有）
        if (images.proof && !localStorage.getItem(this.getStorageKey('conferenceProofFile'))) {
          await this.loadAndSaveImage(images.proof, 'conferenceProofFile');
        }
        
        // 加载支付截图（如果本地没有）
        if (images.screenshot && !localStorage.getItem(this.getStorageKey('conferencePaymentProof'))) {
          await this.loadAndSaveImage(images.screenshot, 'conferencePaymentProof');
        }
        
        // 保存支付方式信息（如果本地没有）
        if (regData.payment_method && !localStorage.getItem(this.getStorageKey('conferencePaymentMethod'))) {
          localStorage.setItem(this.getStorageKey('conferencePaymentMethod'), regData.payment_method);
        }
        
        console.log('Step4 - Backend data saved to localStorage');
        
      } catch (error) {
        console.warn('Failed to save backend data to localStorage:', error);
      }
    },

    getProductDescription(productCode) {
      const products = [
        { 
          code: 'IEEE Member', 
          price: 700,
          priceRMB: 5000,
          description: 'For IEEE members'
        },
        { 
          code: 'Non-IEEE Member', 
          price: 840,
          priceRMB: 6000,
          description: 'For non-IEEE members'
        },
        { 
          code: 'Life Member', 
          price: 500,
          priceRMB: 3600,
          description: 'For IEEE life members'
        },
        { 
          code: 'Student - IEEE Member', 
          price: 500,
          priceRMB: 3600,
          description: 'For students with IEEE membership'
        },
        { 
          code: 'Student - Non-IEEE Member', 
          price: 610,
          priceRMB: 4400,
          description: 'For students without IEEE membership'
        }
      ];
      
      const product = products.find(p => p.code === productCode);
      return product ? product.description : '';
    },

    async loadAndSaveImage(imageUrl, storageKey) {
      try {
        // 从后端加载图片
        const axios = (await import('axios')).default;
        
        let fullUrl;
        if (imageUrl.startsWith('http')) {
          fullUrl = imageUrl;
        } else {
          const baseUrl = window.location.origin; // 使用浏览器地址栏推断baseUrl
          fullUrl = `${baseUrl}${imageUrl}`;
        }
        
        console.log(`Step4 - Loading image from: ${fullUrl}`);
        
        const response = await axios.get(fullUrl, {
          responseType: 'blob',
          withCredentials: true
        });
        
        const blob = response.data;
        
        // 检查文件大小，超过2MB的不存储到localStorage
        const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB
        const shouldStore = blob.size <= MAX_STORAGE_SIZE;
        
        if (!shouldStore) {
          console.log(`Step4 - Backend image too large (${Math.round(blob.size / 1024)}KB), skipping localStorage storage`);
          // 如果是支付截图，仍然需要从后端加载并显示，只是不存本地
          if (storageKey === 'conferencePaymentProof') {
            const reader = new FileReader();
            reader.onload = () => {
              this.uploadedProof = reader.result;
              console.log(`Step4 - Large backend image loaded for display only: ${storageKey}`);
            };
            reader.readAsDataURL(blob);
          }
          return; // 跳过localStorage存储
        }
        
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64Data = reader.result;
            
            // 检查存储空间
            if (!this.checkStorageQuota(base64Data)) {
              console.log('Step4 - Storage quota exceeded for backend image, cleaning up...');
              this.cleanupOldStorageData();
              
              // 再次尝试
              if (!this.checkStorageQuota(base64Data)) {
                console.warn(`Step4 - Cannot save backend image to localStorage due to quota: ${storageKey}`);
                // 如果是支付截图，仍然显示但不存储
                if (storageKey === 'conferencePaymentProof') {
                  this.uploadedProof = base64Data;
                }
                resolve(); // 不阻塞流程
                return;
              }
            }
            
            try {
              localStorage.setItem(this.getStorageKey(storageKey), base64Data);
              console.log(`Step4 - Image loaded and saved to localStorage: ${storageKey}`);
              
              // 如果是支付截图，同时更新当前组件的状态
              if (storageKey === 'conferencePaymentProof') {
                this.uploadedProof = base64Data;
              }
              
              resolve();
            } catch (storageError) {
              console.warn(`Step4 - Failed to save backend image to localStorage: ${storageKey}`, storageError);
              // 如果是支付截图，仍然显示但不存储
              if (storageKey === 'conferencePaymentProof') {
                this.uploadedProof = base64Data;
              }
              resolve(); // 不阻塞流程
            }
          };
          reader.onerror = () => {
            console.warn(`Step4 - Failed to read backend image: ${storageKey}`);
            resolve(); // 不阻塞流程
          };
          reader.readAsDataURL(blob);
        });
        
      } catch (error) {
        console.warn(`Step4 - Failed to load image ${imageUrl}:`, error);
        // 不阻塞流程
      }
    },

    loadUploadedProof() {
      if (!this.currentUserId) return;
      
      console.log('=== Step4 - Loading uploaded proof ===');
      console.log('currentUserId:', this.currentUserId);
      
      const saved = localStorage.getItem(this.getStorageKey('conferencePaymentProof'));
      console.log('savedPaymentProof exists:', !!saved);
      
      if (saved) {
        console.log('Loading payment proof from localStorage...');
        this.uploadedProof = saved;
        // 从base64创建File对象（用于提交）
        this.createFileFromBase64(saved);
        console.log('Payment proof loaded and file object created');
      } else {
        console.log('No payment proof found in localStorage');
      }
      
      console.log('=== Step4 - Proof loading complete ===');
      console.log('uploadedProof exists:', !!this.uploadedProof);
      console.log('paymentFile exists:', !!this.paymentFile);
    },

    createFileFromBase64(base64Data) {
      try {
        // 从base64数据创建File对象
        const arr = base64Data.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        this.paymentFile = new File([u8arr], 'payment.jpg', { type: mime });
        console.log('Created payment file object from base64 data');
      } catch (error) {
        console.warn('Failed to create payment file from base64:', error);
      }
    },



    // 检查localStorage可用空间
    checkStorageQuota(data) {
      const testKey = '_storage_test_';
      try {
        localStorage.setItem(testKey, data);
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    },

    // 清理旧的localStorage数据
    cleanupOldStorageData() {
      try {
        const keys = Object.keys(localStorage);
        const cleanupPatterns = [
          /temp_/,
          /^documentTasks/,
        ];
        
        keys.forEach(key => {
          const shouldCleanup = cleanupPatterns.some(pattern => pattern.test(key));
          if (shouldCleanup) {
            console.log(`Step4 - Cleaning up old storage data: ${key}`);
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Step4 - Failed to cleanup old storage data:', error);
      }
    },

    handleFileChange(file) {
      const isImage = file.raw.type.indexOf('image/') === 0;
      const isLt5M = file.raw.size / 1024 / 1024 < 5;

      if (!isImage) {
        this.$message.error('Upload file must be an image!');
        return;
      }
      if (!isLt5M) {
        this.$message.error('Upload file size cannot exceed 5MB!');
        return;
      }

      // 检查文件大小，超过2MB的不存储到localStorage
      const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB
      const shouldStore = file.raw.size <= MAX_STORAGE_SIZE;
      
      if (!shouldStore) {
        console.log(`Step4 - File too large (${Math.round(file.raw.size / 1024)}KB), skipping localStorage storage`);
        this.$message.info(`Image size: ${Math.round(file.raw.size / 1024)}KB. Large images won't be cached locally.`);
      }

      // 读取文件并创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        
        this.uploadedProof = base64Data;
        this.paymentFile = file.raw; // 保存原始文件对象
        
        // 只有小文件才存储到localStorage
        if (shouldStore && this.currentUserId) {
          try {
            // 检查存储空间
            if (!this.checkStorageQuota(base64Data)) {
              console.log('Step4 - Storage quota exceeded, cleaning up...');
              this.cleanupOldStorageData();
              
              // 再次检查，如果还是不行就跳过存储
              if (!this.checkStorageQuota(base64Data)) {
                console.warn('Step4 - Storage quota still exceeded, skipping localStorage');
              } else {
                localStorage.setItem(this.getStorageKey('conferencePaymentProof'), base64Data);
              }
            } else {
              localStorage.setItem(this.getStorageKey('conferencePaymentProof'), base64Data);
            }
          } catch (storageError) {
            console.warn('Step4 - Failed to save to localStorage:', storageError);
            // 不显示错误消息，因为不存储到localStorage不影响功能
          }
        }
        
        this.$message.success('Payment proof uploaded successfully!');
      };
      
      reader.onerror = () => {
        this.$message.error('Failed to read image file');
      };
      
      reader.readAsDataURL(file.raw);
    },

    removeProof() {
      this.uploadedProof = null;
      this.paymentFile = null;
      if (this.currentUserId) {
        localStorage.removeItem(this.getStorageKey('conferencePaymentProof'));
      }
      this.$message.info('Payment proof removed');
    },

    async submitRegistration() {
      if (!this.canSubmit) {
        this.$message.error('Please complete all required fields and upload payment proof');
        return;
      }

      console.log('🔍 Step4: 开始提交注册...');
      
      // Check if there's an approved submission
      const hasApprovedSubmission = await this.checkApprovedSubmission();
      
      console.log('🔍 Step4: 检查结果 hasApprovedSubmission =', hasApprovedSubmission);
      
      if (hasApprovedSubmission) {
        // 显示自定义确认对话框
        console.log('⚠️ Step4: 发现已批准的注册，显示确认对话框');
        this.showConfirmDialog = true;
        console.log('⚠️ Step4: showConfirmDialog =', this.showConfirmDialog);
      } else {
        // No approved submission, submit directly
        console.log('✅ Step4: 无已批准注册，直接提交');
        this.performSubmission();
      }
    },

    async checkApprovedSubmission() {
      try {
        console.log('🔍 Step4: 调用 API 检查已批准的注册...');
        console.log('🔍 Step4: 当前编辑模式 editMode =', this.editMode);
        console.log('🔍 Step4: 当前注册ID this.id =', this.id);
        
        // 如果是新建注册（id='new' 或没有 id），不需要检查，直接提交
        if (!this.id || this.id === 'new') {
          console.log('✅ Step4: 新建注册模式，无需检查已批准状态');
          return false;
        }
        
        const axios = (await import('axios')).default;
        
        let apiUrl;
        let response;
        
        // 如果是编辑模式且有具体的ID，检查这个特定的注册记录
        if (this.editMode && this.id && this.id !== 'new') {
          console.log('🔍 Step4: 编辑模式 - 检查特定注册记录 ID:', this.id);
          apiUrl = `/api/submissions/registration/${this.id}`;
          response = await axios.get(apiUrl, {
            withCredentials: true
          });
          
          console.log('🔍 Step4: 特定注册记录 API 响应:', response.data);
          
          // 检查这个特定注册是否已批准
          if (response.data.success && response.data.registration_data) {
            const status = response.data.status || 
                          (response.data.registration_data && response.data.registration_data.status);
            const approved = response.data.approved === true || status === 'approved';
            
            console.log('🔍 Step4: 特定注册状态 status =', status);
            console.log('🔍 Step4: 特定注册是否批准 approved =', approved);
            
            if (approved) {
              console.log('⚠️ Step4: 当前编辑的注册已被批准！');
              return true;
            }
          }
        }
        
        console.log('ℹ️ Step4: 未发现已批准的注册');
        return false;
      } catch (error) {
        console.error('❌ Step4: 检查已批准注册失败:', error);
        console.error('❌ Step4: 错误详情:', error.response?.data || error.message);
        // Continue with normal flow if check fails
        return false;
      }
    },

    async performSubmission() {
      this.isSubmitting = true;

      try {
        // 创建FormData来提交多部分表单数据
        const formData = new FormData();
        
        // 添加用户数据（不再包含email，后端会从用户账户信息中获取）
        formData.append('name', this.userInfo.name || '');
        formData.append('phone', this.userInfo.phone || '');
        formData.append('affiliation', this.userInfo.affiliation || '');
        formData.append('paper_id', this.userInfo.paperId || '');
        formData.append('paper_pages', this.userInfo.paperPages || '');
        
        // 添加产品信息
        formData.append('productCode', this.selectedProduct.code || '');
        formData.append('productPrice', this.selectedProduct.price || '');
        formData.append('productPriceRMB', this.selectedProduct.priceRMB || '');
        
        // 添加总金额（包含超页费）
        formData.append('totalAmountUSD', this.totalUSD);
        formData.append('totalAmountRMB', this.totalRMB);
        
        // 添加超页费信息
        formData.append('extraPageFeeUSD', this.extraPageFeeUSD);
        formData.append('extraPageFeeRMB', this.extraPageFeeRMB);
        
        // 添加注册类别信息
        const registrationCategory = this.selectedProduct.code && this.selectedProduct.code.includes('Student') ? 'student' : 'full';
        formData.append('registrationCategory', registrationCategory);
        
        // 添加支付方式信息
        formData.append('paymentMethod', this.paymentMethod || 'international');
        
        // 如果处于编辑模式，添加editId
        if (this.editMode && this.id) {
          formData.append('editId', this.id);
        }
        
        // 处理支付截图文件
        let screenshotFileToUpload = this.paymentFile;
        
        // 如果没有文件对象但有base64数据，转换为文件对象
        if (!screenshotFileToUpload && this.uploadedProof) {
          try {
            // 将base64转换为blob
            const response = await fetch(this.uploadedProof);
            const blob = await response.blob();
            
            // 创建文件对象
            screenshotFileToUpload = new File([blob], 'payment_proof.png', {
              type: blob.type || 'image/png'
            });
            
            console.log('Created screenshot file object from base64:', screenshotFileToUpload);
          } catch (error) {
            console.error('Failed to convert base64 to file:', error);
            this.$message.error('Failed to process payment proof. Please re-upload the image.');
            this.isSubmitting = false;
            return;
          }
        }
        
        if (screenshotFileToUpload) {
          formData.append('screenshot', screenshotFileToUpload);
        } else {
          this.$message.error('Payment proof is missing. Please upload the image again.');
          this.isSubmitting = false;
          return;
        }

        // 处理第一步的证明文件
        const savedProofFile = localStorage.getItem(this.getStorageKey('conferenceProofFile'));
        if (savedProofFile) {
          try {
            // 将base64转换为blob
            const response = await fetch(savedProofFile);
            const blob = await response.blob();
            
            // 创建文件对象
            const proofFileToUpload = new File([blob], 'verification_proof.png', {
              type: blob.type || 'image/png'
            });
            
            formData.append('proof', proofFileToUpload);
            console.log('Added proof file to form data:', proofFileToUpload);
          } catch (error) {
            console.warn('Failed to process proof file, continuing without it:', error);
            // 证明文件不是必须的，所以失败了也继续提交
          }
        } else {
          console.log('No proof file found in localStorage, continuing without it');
        }

        // 调用后端API
        const axios = (await import('axios')).default;
        
        console.log('FormData contents:');
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(key, `File: ${value.name}, Size: ${value.size}, Type: ${value.type}`);
          } else {
            console.log(key, value);
          }
        }
        
        // 使用完整路径
        const response = await axios.post('/api/submissions/submit', formData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          this.$message.success('Registration submitted successfully!');
          
          // 保存注册数据到localStorage（使用用户关联的键名）
          const registrationData = {
            product: this.selectedProduct,
            userInfo: this.userInfo,
            paymentMethod: this.paymentMethod,
            submittedAt: new Date().toISOString(),
            registrationId: (response.data.data && response.data.data.id) || 'REG-' + Date.now()
          };
          
          localStorage.setItem(this.getStorageKey('conferenceRegistrationData'), JSON.stringify(registrationData));
          localStorage.setItem(this.getStorageKey('conferenceRegistrationId'), registrationData.registrationId);
          
          // 跳转到收据页面
          if (this.id === 'new') {
            this.$router.push('/conference/new/step5');
          } else if (this.editMode && this.id) {
            this.$router.push(`/conference/${this.id}/step5`);
          } else {
            this.$router.push('/conference/new/step5');
          }
        } else {
          this.$message.error(response.data.message || 'Submission failed. Please try again.');
        }
        
      } catch (error) {
        console.error('Submission error:', error);
        const errorMessage = (error.response && error.response.data && error.response.data.message) 
          || 'An error occurred during submission. Please try again.';
        this.$message.error(errorMessage);
      } finally {
        this.isSubmitting = false;
      }
    },

    // 自定义对话框方法
    handleOverlayClick() {
      // 点击遮罩层关闭对话框
      this.cancelSubmission();
    },

    cancelSubmission() {
      // 用户点击取消或点击遮罩层
      this.showConfirmDialog = false;
      this.$message.info('Submission cancelled');
      this.$router.push('/dashboard');
    },

    confirmSubmission() {
      // 用户确认继续提交
      this.showConfirmDialog = false;
      // 执行提交
      this.performSubmission();
    },

    goBack() {
      if (this.id === 'new') {
        this.$router.push('/conference/new/step3');
      } else if (this.editMode && this.id) {
        this.$router.push(`/conference/${this.id}/step3`);
      } else {
        this.$router.push('/conference/new/step3');
      }
    }
  }
}
</script>

<style scoped>
.step-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  color: #409EFF;
  margin-bottom: 16px;
  font-size: 24px;
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
  margin-bottom: 24px;
}

.confirmation-summary {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.confirmation-summary h3 {
  color: #409EFF;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
  font-size: 16px;
}

.info-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.info-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.info-section h4 {
  color: #333;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}

.info-row span {
  color: #666;
}

.extra-fee-note {
  color: #f56c6c !important;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
}

.price-display {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-row .price {
  color: #f56c6c;
  font-size: 16px;
}

.info-row .price-rmb {
  color: #909399;
  font-size: 14px;
  font-weight: normal;
}

.payment-proof {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payment-proof h3 {
  color: #409EFF;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
  font-size: 16px;
}

.upload-instruction {
  color: #666;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.3;
}

.upload-compact {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-demo {
  flex-shrink: 0;
}

.upload-tip {
  font-size: 11px;
  color: #999;
  line-height: 1.2;
}

.preview-section {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.preview-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.proof-preview-small {
  width: 80px;
  height: 60px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #e0e0e0;
}

.remove-btn-inline {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
}

.remove-btn-inline:hover {
  background-color: #f78989;
  border-color: #f78989;
}

.upload-demo {
  margin-bottom: 0;
}

.uploaded-proof h4 {
  color: #333;
  margin-bottom: 10px;
  font-size: 14px;
}

.proof-preview {
  max-width: 200px;
  max-height: 150px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  gap: 16px;
  border-top: 1px solid #e8e8e8;
  margin-top: 16px;
}

.submit-requirements {
  background: #fff8e1;
  border: 1px solid #ffcc02;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  box-shadow: 0 2px 6px rgba(255, 204, 2, 0.1);
}

.requirements-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.requirements-header i {
  color: #ff9800;
  font-size: 18px;
}

.requirements-header h4 {
  color: #e65100;
  font-weight: 600;
  margin: 0;
  font-size: 15px;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 6px;
}

.missing-item {
  color: #e65100;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 4px;
  border-left: 2px solid #ff9800;
}

.missing-item i {
  color: #f44336;
  font-size: 12px;
  font-weight: bold;
}

/* 自定义确认对话框样式 */
.custom-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.custom-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: dialogShow 0.3s ease-out;
}

@keyframes dialogShow {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  padding: 20px 20px 15px;
  text-align: center;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 2px solid #ff9800;
  border-radius: 12px 12px 0 0;
}

.dialog-header h3 {
  margin: 0;
  color: #e65100;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.dialog-header h3 i {
  font-size: 24px;
  color: #f57c00;
}

.dialog-content {
  padding: 24px;
  text-align: left;
}

.dialog-icon {
  text-align: center;
  margin-bottom: 16px;
}

.dialog-icon i {
  font-size: 56px;
  color: #ff9800;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.dialog-message {
  color: #666;
  font-size: 15px;
  line-height: 1.6;
}

.dialog-message .warning-title {
  font-size: 16px;
  font-weight: 600;
  color: #e65100;
  margin: 0 0 12px 0;
}

.dialog-message .warning-details {
  font-weight: 500;
  color: #555;
  margin: 12px 0 8px 0;
}

.dialog-message .warning-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 16px 0;
}

.dialog-message .warning-list li {
  padding: 8px 12px;
  margin: 6px 0;
  background: #fff8e1;
  border-left: 4px solid #ff9800;
  border-radius: 4px;
  color: #555;
}

.dialog-message .warning-list li strong {
  color: #e65100;
  font-weight: 600;
}

.dialog-message .warning-question {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 0 0;
  text-align: center;
}

.dialog-actions {
  padding: 0 20px 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-btn {
  flex: 1;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.dialog-btn i {
  font-size: 16px;
}

.cancel-btn {
  background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
  color: white;
}

.cancel-btn:hover {
  background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.cancel-btn:active {
  background: linear-gradient(135deg, #43a047 0%, #388e3c 100%);
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.2);
}

.confirm-btn {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #ffb74d 0%, #ff9800 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
}

.confirm-btn:active {
  background: linear-gradient(135deg, #f57c00 0%, #e65100 100%);
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
}

.el-button {
  padding: 10px 24px;
  border-radius: 6px;
}

/* Element UI 上传组件样式调整 */
.el-upload {
  display: inline-block;
}

.remove-btn {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: white;
}

.remove-btn:hover {
  background-color: #f78989;
  border-color: #f78989;
}

/* 自定义对话框移动端优化 */
@media (max-width: 576px) {
  .custom-dialog-overlay {
    padding: 10px;
  }

  .custom-dialog {
    border-radius: 8px;
    max-width: none;
    width: 100%;
    margin: 0;
  }

  .dialog-header {
    padding: 16px 16px 0;
  }

  .dialog-header h3 {
    font-size: 16px;
    line-height: 1.3;
  }

  .dialog-content {
    padding: 16px;
  }

  .dialog-icon i {
    font-size: 40px;
  }

  .dialog-message {
    font-size: 14px;
    line-height: 1.4;
  }

  .dialog-actions {
    padding: 0 16px 16px;
    gap: 8px;
  }

  .dialog-btn {
    padding: 12px 16px;
    font-size: 13px;
    min-height: 44px;
  }
}

@media (max-width: 400px) {
  .custom-dialog-overlay {
    padding: 8px;
  }

  .custom-dialog {
    border-radius: 6px;
  }

  .dialog-header {
    padding: 12px 12px 0;
  }

  .dialog-header h3 {
    font-size: 15px;
  }

  .dialog-content {
    padding: 12px;
  }

  .dialog-icon {
    margin-bottom: 12px;
  }

  .dialog-icon i {
    font-size: 36px;
  }

  .dialog-message {
    font-size: 13px;
  }

  .dialog-actions {
    padding: 0 12px 12px;
    gap: 6px;
    flex-direction: column;
  }

  .dialog-btn {
    padding: 14px 20px;
    font-size: 14px;
    min-height: 48px;
    width: 100%;
  }
}
</style>
