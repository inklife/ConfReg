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
            <span>Registration Type:</span>
            <strong>{{ selectedProduct ? selectedProduct.code : 'Not selected' }}</strong>
          </div>
          <div class="info-row">
            <span>Amount:</span>
            <strong class="price">${{ selectedProduct ? selectedProduct.price : 0 }} USD</strong>
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
          <div class="info-row">
            <span>Paper Title:</span>
            <strong>{{ userInfo.paperTitle || 'Not provided' }}</strong>
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
  </div>
</template>

<script>
export default {
  name: 'Step4Confirmation',
  data() {
    return {
      uploadedProof: null,
      paymentFile: null, // 存储实际文件对象
      isSubmitting: false,
      currentUserId: null
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
      const methods = {
        'domestic': 'WeChat Pay',
        'international': 'Bank Transfer'
      };
      return methods[this.paymentMethod] || 'Not selected';
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
  },
  methods: {
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
        
        // 使用完整路径
        const response = await axios.get('/api/submissions/check-registration', {
          withCredentials: true
        });
        
        console.log('Step4 - Backend registration data:', response.data);
        
        if (response.data.success && response.data.has_submission) {
          await this.saveBackendDataToLocalStorage(response.data);
        }
        
      } catch (error) {
        console.error('Failed to load backend data:', error);
        // 后端数据加载失败不影响正常流程
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
            paperTitle: regData.paper_id
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
        
        console.log('Step4 - Backend data saved to localStorage');
        
      } catch (error) {
        console.warn('Failed to save backend data to localStorage:', error);
      }
    },

    getProductDescription(productCode) {
      const products = [
        { 
          code: 'IEEE Member Registration', 
          price: 700, 
          description: 'For IEEE members with valid membership'
        },
        { 
          code: 'Non-IEEE Member Registration', 
          price: 840, 
          description: 'For non-IEEE members'
        },
        { 
          code: 'IEEE Student/Life Member Registration', 
          price: 500, 
          description: 'For students with IEEE membership'
        },
        { 
          code: 'Non-IEEE Student Member Registration', 
          price: 610, 
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
        const config = (await import('config')).default;
        

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
        
        // 将blob转换为base64
        const blob = response.data;
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64Data = reader.result;
            localStorage.setItem(this.getStorageKey(storageKey), base64Data);
            console.log(`Step4 - Image loaded and saved to localStorage: ${storageKey}`);
            
            // 如果是支付截图，同时更新当前组件的状态
            if (storageKey === 'conferencePaymentProof') {
              this.uploadedProof = base64Data;
            }
            
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
      } catch (error) {
        console.warn(`Step4 - Failed to load image ${imageUrl}:`, error);
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

      // 读取文件并创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedProof = e.target.result;
        this.paymentFile = file.raw; // 保存实际文件对象
        if (this.currentUserId) {
          localStorage.setItem(this.getStorageKey('conferencePaymentProof'), this.uploadedProof);
        }
        this.$message.success('Payment proof uploaded successfully!');
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

      // Check if there's an approved submission
      const hasApprovedSubmission = await this.checkApprovedSubmission();
      if (hasApprovedSubmission) {
        // Show confirmation dialog
        this.$confirm(
          'You already have an approved registration. Re-submitting will cause your registration to return to pending review status. Are you sure you want to continue?',
          'Re-submission Confirmation',
          {
            confirmButtonText: 'Confirm Continue',
            cancelButtonText: 'Cancel Submission',
            type: 'warning',
            closeOnClickModal: false,
            closeOnPressEscape: false
          }
        ).then(() => {
          // User clicked confirm, perform submission
          this.performSubmission();
        }).catch(() => {
          // User clicked cancel, return to dashboard
          this.$message.info('Submission cancelled');
          this.$router.push('/dashboard');
        });
        return;
      }

      // No approved submission, submit directly
      this.performSubmission();
    },

    async checkApprovedSubmission() {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/submissions/check-registration', {
          withCredentials: true
        });

        console.log('Check approved submission response:', response.data);
        
        if (response.data.success && response.data.has_submission && response.data.approved) {
          return true;
        }
        return false;
      } catch (error) {
        console.warn('Failed to check approved submission:', error);
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
        formData.append('paper_id', this.userInfo.paperTitle || '');
        
        // 添加产品信息
        formData.append('productCode', this.selectedProduct.code || '');
        formData.append('productPrice', this.selectedProduct.price || '');
        
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
          this.$router.push('/conference/step5');
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

    goBack() {
      this.$router.push('/conference/step3');
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

.info-row .price {
  color: #f56c6c;
  font-size: 16px;
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
</style>
