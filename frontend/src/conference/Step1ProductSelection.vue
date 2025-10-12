<template>
  <div class="step-container">
    <div class="header">
      <h1>Step 1: Choose Registration Item</h1>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress" :style="{ width: '20%' }"></div>
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
      <div class="product-list">
        <!-- Full Registration Section -->
        <div class="product-group">
          <h3 class="group-title">Full Registration</h3>
          <p class="group-note">At least one author of an accepted paper is required to register at full rate</p>
          <div class="product-grid full-registration-grid">
            <div 
              v-for="(product, index) in fullRegistrationProducts" 
              :key="index"
              class="product-item grid-item"
              :class="{ 'selected': selectedProduct === index }"
              @click="selectProduct(index)"
            >
              <div class="radio-icon" v-if="selectedProduct === index">
                <i class="el-icon-success"></i>
              </div>
              <div class="product-info">
                <h4>{{ product.code }}</h4>
                <p class="description">{{ product.description }}</p>
              </div>
              <div class="price">
                <div class="price-usd">${{ product.price }}</div>
                <div class="price-rmb">¥{{ product.priceRMB }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Registration Section -->
        <div class="product-group">
          <h3 class="group-title">Students</h3>
          <div class="product-grid student-registration-grid">
            <div 
              v-for="(product, index) in studentRegistrationProducts" 
              :key="index + 3"
              class="product-item grid-item"
              :class="{ 'selected': selectedProduct === index + 3 }"
              @click="selectProduct(index + 3)"
            >
              <div class="radio-icon" v-if="selectedProduct === index + 3">
                <i class="el-icon-success"></i>
              </div>
              <div class="product-info">
                <h4>{{ product.code }}</h4>
                <p class="description">{{ product.description }}</p>
              </div>
              <div class="price">
                <div class="price-usd">${{ product.price }}</div>
                <div class="price-rmb">¥{{ product.priceRMB }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图片验证文档上传 -->
      <div v-if="selectedProductRequiresProof" class="proof-section">
        <div class="proof-header">
          <h4>Upload Verification Document</h4>
          <p>Please upload verification for {{ proofTypes[products[selectedProduct].code] }}</p>
        </div>
        
        <div class="proof-upload-area">
          <el-upload
            class="proof-upload"
            action=""
            :auto-upload="false"
            :on-change="handleProofUpload"
            :show-file-list="false"
            accept="image/*"
          >
            <el-button size="small" type="primary">
              <i class="el-icon-upload"></i> Upload Document
            </el-button>
            <div slot="tip" class="upload-tip">
              less than 2MB
            </div>
          </el-upload>

          <div v-if="proofPreview" class="preview-area">
            <img :src="proofPreview" class="preview-image">
            <el-button size="mini" @click="removeProof" class="remove-btn">
              Remove
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Important Notes Section -->
    <div class="important-notes">
      <h4>Important Notes</h4>
      <ul>
        <li>To be published in the IEEE ICPADS 2025 Proceedings and to be eligible for publication in IEEE Xplore, at least one author of an accepted paper is required to register for the conference at the <strong>FULL (member or non-member) rate</strong>.</li>
        <li>Please note that <strong>ONE Regular registration must be paid for EACH paper</strong> to be published in the proceedings.</li>
      </ul>
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
  </div>
</template>

<script>
export default {
  name: 'Step1ProductSelection',
  props: {
    id: {
      type: String,
      default: null
    },
    newMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedProduct: null,
      proofFile: null,
      proofPreview: null,
      currentUserId: null, // 添加当前用户ID跟踪
      editMode: false,
      products: [
        // Full Registration (3 types)
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
        // Student Registration (2 types)
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
      ],
      proofTypes: {
        'IEEE Member': 'IEEE membership verification',
        'Life Member': 'IEEE life membership verification',
        'Student - IEEE Member': 'Student IEEE membership verification'
      }
    }
  },
  computed: {
    fullRegistrationProducts() {
      return this.products.slice(0, 3); // First 3 products are Full Registration
    },
    studentRegistrationProducts() {
      return this.products.slice(3, 5); // Last 2 products are Student Registration
    },
    selectedProductRequiresProof() {
      if (this.selectedProduct === null) return false;
      const productCode = this.products[this.selectedProduct].code;
      return Object.keys(this.proofTypes).includes(productCode);
    },
    canProceed() {
      if (this.selectedProduct === null) return false;
      if (this.selectedProductRequiresProof && !this.proofPreview) return false;
      return true;
    }
  },
  mounted() {
    // 检测编辑模式
    if (this.id && this.id !== 'new') {
      this.editMode = true;
      console.log('Step1 - Edit mode detected, registration ID:', this.id);
    }
    
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

      const newUserId = currentUser.id;
      const lastUserId = localStorage.getItem('lastConferenceUserId');

      // 如果用户切换了，清理所有会议注册相关的localStorage数据
      if (lastUserId && lastUserId !== newUserId.toString()) {
        console.log('User changed, clearing conference data');
        this.clearAllConferenceData();
      }

      // 更新当前用户ID
      this.currentUserId = newUserId;
      localStorage.setItem('lastConferenceUserId', newUserId.toString());

      // 处理newMode - 检查是否有未完成的注册
      if (this.newMode) {
        await this.handleNewMode();
        return;
      }

      // 如果是编辑模式，先尝试从后端加载特定注册记录的数据
      if (this.editMode && this.id && this.id !== 'new') {
        await this.loadBackendRegistrationData();
      }

      // 加载当前用户的数据（优先使用localStorage，没有再使用后端数据）
      this.loadSavedData();
    },

    clearAllConferenceData() {
      // 清理所有会议注册相关的localStorage数据
      const keysToRemove = [
        'conferenceProductSelection',
        'conferenceProofFile',
        'conferenceUserInfo',
        'conferencePaymentInfo',
        'conferenceSubmissionData'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('Conference data cleared for user switch');
    },

    clearCurrentUserConferenceData() {
      // 清理当前用户的会议注册相关的localStorage数据
      if (!this.currentUserId) return;
      
      const keysToRemove = [
        'conferenceProductSelection',
        'conferenceProofFile',
        'conferenceUserInfo',
        'conferencePaymentInfo',
        'conferenceSubmissionData',
        'conferenceRegistrationData',
        'conferenceRegistrationComplete',
        'conferenceRegistrationId',
        'conferencePaymentMethod',
        'conferencePaymentProof'
      ];
      
      // 清理当前注册记录的数据
      keysToRemove.forEach(baseName => {
        const keyWithUserId = this.getStorageKey(baseName);
        localStorage.removeItem(keyWithUserId);
      });
      
      // 额外清理：删除所有该用户相关的旧注册记录数据
      const allKeys = Object.keys(localStorage);
      const userPrefix = `_${this.currentUserId}_`;
      allKeys.forEach(key => {
        keysToRemove.forEach(baseName => {
          // 匹配格式：baseName_userId_registrationId
          if (key.startsWith(baseName + '_' + this.currentUserId)) {
            localStorage.removeItem(key);
            console.log('Cleaned old registration data:', key);
          }
        });
      });
      
      // 重置组件状态
      this.selectedProduct = null;
      this.proofFile = null;
      this.proofPreview = null;
      
      console.log('Current user conference data cleared');
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

    async handleNewMode() {
      try {
        // 检查用户的注册状态
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/submissions/check-registration', {
          withCredentials: true
        });
        
        console.log('Step1 - handleNewMode: Check registration response:', response.data);
        
        if (response.data.success && response.data.has_submission) {
          // 用户已经有注册记录，引导到注册列表
          const registrationId = response.data.registration_id || response.data.submission_id;
          
          this.$confirm(
            'You already have existing registration(s). Do you need to register for multiple items (e.g., multiple papers)? \n\nNote: Creating a new registration will not affect your previous registrations. You can manage all your registrations in the registration list.',
            'Multiple Registrations',
            {
              confirmButtonText: 'View Registration List',
              cancelButtonText: 'Create New Registration',
              type: 'info',
              center: true,
              distinguishCancelAndClose: true
            }
          ).then(() => {
            // 跳转到注册列表
            this.$router.push('/dashboard?tab=registrations');
          }).catch((action) => {
            // 如果是点击取消按钮，则留在当前页面
            if (action === 'cancel') {
              console.log('Step1 - User chose to create new registration');
              this.clearCurrentUserConferenceData();
              this.loadSavedData();
            } else {
              // 如果是点击关闭按钮或按 ESC，默认返回注册列表
              console.log('Step1 - Dialog closed, redirecting to registration list');
              this.$router.push('/dashboard?tab=registrations');
            }
          });
        } else {
          // 没有注册记录，继续当前的step1流程
          console.log('Step1 - No existing registration, continue new registration');
          this.loadSavedData();
        }
      } catch (error) {
        console.error('Step1 - handleNewMode check failed:', error);
        // 检查失败，继续正常的step1流程
        this.loadSavedData();
      }
    },

    async loadBackendRegistrationData() {
      try {
        console.log('Step1 - Loading backend registration data for ID:', this.id);
        
        // 验证ID格式
        if (!/^\d+$/.test(this.id)) {
          console.warn('Step1 - Invalid registration ID format:', this.id);
          this.$message.warning('Invalid registration ID');
          this.$router.push('/dashboard?tab=registrations');
          return;
        }
        
        const axios = (await import('axios')).default;
        
        const response = await axios.get(`/api/submissions/registration/${this.id}`, {
          withCredentials: true
        });
        
        console.log('Step1 - Backend registration response:', response.data);
        
        if (response.data.success && response.data.registration_data) {
          const regData = response.data.registration_data;
          const images = response.data.images || {};
          
          // 保存产品选择数据到 localStorage
          const productData = {
            code: regData.product_code,
            price: regData.product_price,
            description: this.products.find(p => p.code === regData.product_code)?.description || ''
          };
          localStorage.setItem(
            this.getStorageKey('conferenceProductSelection'), 
            JSON.stringify(productData)
          );
          
          // 如果有证明文件，加载并保存
          if (images.proof) {
            await this.loadAndSaveBackendImage(images.proof, 'conferenceProofFile');
          }
          
          console.log('Step1 - Backend data saved to localStorage');
        } else {
          // 注册记录不存在
          console.warn('Step1 - Registration not found for ID:', this.id);
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
      } catch (error) {
        console.error('Step1 - Failed to load backend registration data:', error);
        
        // 如果是404错误，说明ID不存在
        if (error.response && error.response.status === 404) {
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
        // 其他错误不阻塞流程
      }
    },

    async loadAndSaveBackendImage(imageUrl, storageKey) {
      try {
        const axios = (await import('axios')).default;
        
        // 构建完整URL
        let fullUrl = imageUrl;
        if (!imageUrl.startsWith('http')) {
          const baseUrl = window.location.origin;
          fullUrl = `${baseUrl}${imageUrl}`;
        }
        
        console.log(`Step1 - Loading image from: ${fullUrl}`);
        
        const response = await axios.get(fullUrl, {
          responseType: 'blob',
          withCredentials: true
        });
        
        const blob = response.data;
        
        // 转换为 base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result;
          localStorage.setItem(this.getStorageKey(storageKey), base64Data);
          console.log(`Step1 - Image saved to localStorage: ${storageKey}`);
        };
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.warn(`Step1 - Failed to load image ${imageUrl}:`, error);
        // 不阻塞流程
      }
    },

    loadSavedData() {
      if (!this.currentUserId) return;

      try {
        console.log('=== Step1 - Loading saved data ===');
        console.log('currentUserId:', this.currentUserId);
        
        // 使用带用户ID的键名加载数据
        const savedProduct = localStorage.getItem(this.getStorageKey('conferenceProductSelection'));
        console.log('savedProduct:', savedProduct);
        if (savedProduct) {
          const productData = JSON.parse(savedProduct);
          const productIndex = this.products.findIndex(p => p.code === productData.code);
          if (productIndex !== -1) {
            this.selectedProduct = productIndex;
            console.log('Restored product selection:', productIndex, productData.code);
          }
        }

        // 加载证明文件
        const savedProof = localStorage.getItem(this.getStorageKey('conferenceProofFile'));
        console.log('savedProof exists:', !!savedProof);
        if (savedProof) {
          console.log('Loading proof image from localStorage...');
          this.proofPreview = savedProof;
          // 从base64创建一个虚拟的File对象（用于验证）
          this.createFileFromBase64(savedProof);
          console.log('Proof image loaded and file object created');
        } else {
          console.log('No proof image found in localStorage');
        }
        
        console.log('=== Step1 - Data loading complete ===');
        console.log('selectedProduct:', this.selectedProduct);
        console.log('proofPreview exists:', !!this.proofPreview);
        console.log('proofFile exists:', !!this.proofFile);
        
      } catch (error) {
        console.warn('Failed to load saved data:', error);
      }
    },

    createFileFromBase64(base64Data) {
      try {
        // 从base64数据创建File对象（用于表单验证）
        const arr = base64Data.split(',');
        if (arr.length !== 2) {
          throw new Error('Invalid base64 format');
        }
        
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) {
          throw new Error('Cannot extract MIME type');
        }
        
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        this.proofFile = new File([u8arr], 'proof.jpg', { type: mime });
        console.log('Step1 - Created file object from base64 data:', {
          fileName: 'proof.jpg',
          fileSize: this.proofFile.size,
          fileType: this.proofFile.type
        });
        
        // 强制Vue更新响应式数据
        this.$nextTick(() => {
          this.$forceUpdate();
        });
        
      } catch (error) {
        console.warn('Step1 - Failed to create file from base64:', error);
        // 即使文件创建失败，图片预览仍应正常显示
      }
    },

    saveData() {
      if (!this.currentUserId) return;

      try {
        // 保存产品选择（使用带用户ID的键名）
        if (this.selectedProduct !== null) {
          const productData = this.products[this.selectedProduct];
          localStorage.setItem(
            this.getStorageKey('conferenceProductSelection'), 
            JSON.stringify(productData)
          );
        }
        
        // 保存证明文件预览
        if (this.proofPreview) {
          localStorage.setItem(
            this.getStorageKey('conferenceProofFile'), 
            this.proofPreview
          );
        }
        
        console.log('Data saved for user:', this.currentUserId);
      } catch (error) {
        console.warn('Failed to save data:', error);
      }
    },

    selectProduct(index) {
      this.selectedProduct = index;
      this.saveData();
    },

    handleProofUpload(file) {
      const isImage = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.raw.type);
      const isLt2M = file.raw.size / 1024 / 1024 < 2;

      if (!isImage) {
        this.$message.error('Only image files (JPG/PNG) are allowed!');
        return;
      }

      if (!isLt2M) {
        this.$message.error('File size must be less than 2MB!');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.proofFile = file.raw;
        this.proofPreview = e.target.result;
        this.saveData(); // 保存数据
      };
      reader.readAsDataURL(file.raw);
    },
    
    removeProof() {
      this.proofFile = null;
      this.proofPreview = null;
      if (this.currentUserId) {
        localStorage.removeItem(this.getStorageKey('conferenceProofFile'));
      }
    },
    
    nextStep() {
      this.saveData();
      
      // 如果有图片预览但没有文件对象，尝试创建文件对象
      if (this.proofPreview && !this.proofFile) {
        console.log('Step1 - Creating file object before proceeding to next step');
        this.createFileFromBase64(this.proofPreview);
      }
      
      this.$emit('step-complete', {
        selectedProduct: this.selectedProduct,
        productData: this.products[this.selectedProduct],
        proofFile: this.proofFile
      });
      
      // 根据不同的模式跳转
      if (this.id === 'new' || this.newMode) {
        // 新建模式
        this.$router.push('/conference/new/step2');
      } else if (this.editMode && this.id) {
        // 编辑模式
        this.$router.push(`/conference/${this.id}/step2`);
      } else {
        // 默认跳转（不应该到达这里）
        this.$router.push('/conference/new/step2');
      }
    },
    goBack() {
      this.$router.push('/conference');
    }
  }
}
</script>

<style scoped>
.step-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  color: #409EFF;
  margin-bottom: 20px;
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
  max-width: 500px;
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
  margin-bottom: 32px;
}

.product-list {
  width: 100%;
  margin: 0 auto;
}

.product-group {
  margin-bottom: 20px;
}

.group-title {
  color: #409EFF;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 6px 0;
  border-bottom: 2px solid #409EFF;
  padding-bottom: 6px;
}

.group-note {
  color: #666;
  font-size: 13px;
  margin: 0 0 12px 0;
  font-style: italic;
}

.product-grid {
  display: grid;
  gap: 12px;
}

.full-registration-grid {
  grid-template-columns: repeat(3, 1fr);
}

.student-registration-grid {
  grid-template-columns: repeat(2, 1fr);
}

.product-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.product-item.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  min-height: 120px;
  position: relative;
}

.product-item:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.product-item.selected {
  border-color: #409EFF;
  background: #f0f7ff;
}

.radio-icon {
  color: #409EFF;
  font-size: 20px;
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.product-info {
  flex: 1;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-info h4 {
  color: #409EFF;
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.grid-item .product-info h4 {
  font-size: 15px;
  text-align: center;
}

.product-info .description {
  color: #666;
  font-size: 13px;
  margin: 0;
  line-height: 1.4;
}

.grid-item .product-info .description {
  font-size: 12px;
  text-align: center;
}

.price {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}

.grid-item .price {
  margin-top: auto;
}

.price-usd {
  font-size: 18px;
  font-weight: bold;
  color: #f56c6c;
}

.price-rmb {
  font-size: 14px;
  font-weight: 500;
  color: #909399;
}

.proof-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  border: 1px solid #e8e8e8;
  width: 100%;
  box-sizing: border-box;
}

.proof-header h4 {
  color: #409EFF;
  margin: 0 0 6px 0;
  font-size: 15px;
}

.proof-header p {
  color: #666;
  margin: 0 0 12px 0;
  font-size: 13px;
}

.proof-upload-area {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.proof-upload {
  flex-shrink: 0;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

.preview-area {
  position: relative;
  flex-shrink: 0;
}

.preview-image {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #e0e0e0;
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
}

.important-notes {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0 20px 0;
  width: 100%;
  box-sizing: border-box;
}

.important-notes h4 {
  color: #d48806;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.important-notes h4:before {
  content: "⚠️";
  margin-right: 8px;
  font-size: 18px;
}

.important-notes ul {
  margin: 0;
  padding: 0 0 0 20px;
  color: #8c4a00;
  line-height: 1.6;
}

.important-notes li {
  margin-bottom: 8px;
  font-size: 14px;
}

.important-notes li:last-child {
  margin-bottom: 0;
}

.important-notes strong {
  color: #d48806;
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: space-between;
  padding: 20px 0;
  border-top: 1px solid #e8e8e8;
  margin-top: 20px;
}

/* 平板端优化 */
@media (max-width: 1024px) and (min-width: 769px) {
  .full-registration-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .student-registration-grid {
    grid-template-columns: repeat(2, 1fr);
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

  .product-list {
    max-width: none;
  }

  .product-group {
    margin-bottom: 20px;
  }

  .group-title {
    font-size: 16px;
    margin-bottom: 6px;
    padding-bottom: 4px;
  }

  .group-note {
    font-size: 12px;
    margin-bottom: 12px;
  }

  .full-registration-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .student-registration-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .product-item {
    padding: 12px;
    border-radius: 8px;
    min-height: auto;
  }

  .product-item.grid-item {
    flex-direction: row;
    align-items: center;
    text-align: left;
    gap: 8px;
  }

  .grid-item .product-info h4 {
    font-size: 14px;
    text-align: left;
  }

  .grid-item .product-info .description {
    font-size: 11px;
    text-align: left;
  }

  .grid-item .price {
    margin-top: 0;
    text-align: right;
  }

  .radio-icon {
    font-size: 16px;
    top: 6px;
    right: 6px;
  }

  .product-info {
    flex: 1;
    min-width: 0;
  }

  .product-info h4 {
    font-size: 14px;
    margin-bottom: 4px;
    line-height: 1.3;
  }

  .product-info .description {
    font-size: 11px;
    margin-bottom: 0;
    line-height: 1.2;
    color: #888;
  }

  .price {
    min-width: auto;
    text-align: right;
    flex-shrink: 0;
    gap: 1px;
  }

  .price-usd {
    font-size: 15px;
  }

  .price-rmb {
    font-size: 12px;
  }

  .proof-section {
    padding: 12px;
    margin-top: 12px;
    border-radius: 8px;
  }

  .proof-header h4 {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .proof-header p {
    font-size: 11px;
    margin-bottom: 10px;
    line-height: 1.3;
  }

  .proof-upload-area {
    flex-direction: row;
    gap: 8px;
    align-items: center;
  }

  .proof-upload {
    flex-shrink: 0;
  }

  .upload-tip {
    font-size: 10px;
    margin-top: 2px;
  }

  .preview-area {
    margin-left: 8px;
  }

  .preview-image {
    width: 60px;
    height: 60px;
  }

  .important-notes {
    margin: 16px 0 12px 0;
    padding: 12px;
  }

  .important-notes h4 {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .important-notes h4:before {
    font-size: 16px;
    margin-right: 6px;
  }

  .important-notes ul {
    padding-left: 16px;
  }

  .important-notes li {
    font-size: 12px;
    margin-bottom: 6px;
    line-height: 1.5;
  }

  .actions {
    padding: 16px 0;
    margin-top: 16px;
    gap: 12px;
  }

  .actions .el-button {
    flex: 1;
    margin: 0;
  }
}

@media (max-width: 480px) {
  .step-container {
    padding: 8px;
  }

  .header h1 {
    font-size: 18px;
  }

  .product-group {
    margin-bottom: 16px;
  }

  .group-title {
    font-size: 15px;
    margin-bottom: 4px;
    padding-bottom: 3px;
  }

  .group-note {
    font-size: 11px;
    margin-bottom: 8px;
  }

  .product-item {
    padding: 10px;
    gap: 6px;
  }

  .product-item.grid-item {
    gap: 6px;
  }

  .radio-icon {
    font-size: 14px;
    top: 5px;
    right: 5px;
  }

  .product-info h4 {
    font-size: 13px;
    margin-bottom: 2px;
  }

  .product-info .description {
    font-size: 10px;
  }

  .price-usd {
    font-size: 14px;
  }

  .price-rmb {
    font-size: 11px;
  }

  .proof-section {
    padding: 10px;
    margin-top: 8px;
  }

  .proof-header h4 {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .proof-header p {
    font-size: 10px;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .proof-upload-area {
    gap: 6px;
  }

  .upload-tip {
    font-size: 9px;
    margin-top: 1px;
  }

  .preview-image {
    width: 50px;
    height: 50px;
  }

  .important-notes {
    margin: 12px 0 8px 0;
    padding: 10px;
  }

  .important-notes h4 {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .important-notes h4:before {
    font-size: 15px;
    margin-right: 5px;
  }

  .important-notes ul {
    padding-left: 14px;
  }

  .important-notes li {
    font-size: 11px;
    margin-bottom: 4px;
    line-height: 1.4;
  }

  .actions {
    padding: 10px 0;
    margin-top: 12px;
  }
}
</style>
