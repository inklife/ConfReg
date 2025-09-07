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
        <div 
          v-for="(product, index) in products" 
          :key="index"
          class="product-item"
          :class="{ 'selected': selectedProduct === index }"
          @click="selectProduct(index)"
        >
          <div class="radio-icon">
            <i :class="selectedProduct === index ? 'el-icon-success' : 'el-icon-circle-plus'"></i>
          </div>
          <div class="product-info">
            <h4>{{ product.code }}</h4>
            <p class="description">{{ product.description }}</p>
          </div>
          <div class="price">${{ product.price }}</div>
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
  data() {
    return {
      selectedProduct: null,
      proofFile: null,
      proofPreview: null,
      currentUserId: null, // 添加当前用户ID跟踪
      products: [
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
      ],
      proofTypes: {
        'IEEE Member Registration': 'IEEE membership verification',
        'IEEE Student/Life Member Registration': 'Student membership verification',
        'Non-IEEE Student Member Registration': 'Student verification'
      }
    }
  },
  computed: {
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
    this.initializeUserData();
  },
  methods: {
    initializeUserData() {
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

      // 加载当前用户的数据
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

    getStorageKey(baseName) {
      // 生成带用户ID的存储键名
      return `${baseName}_${this.currentUserId}`;
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
      this.$router.push('/conference/step2');
    },
    goBack() {
      this.$router.push('/conference');
    }
  }
}
</script>

<style scoped>
.step-container {
  max-width: 1200px;
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
  margin-bottom: 32px;
}

.product-list {
  max-width: 700px;
  margin: 0 auto;
}

.product-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
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
  min-width: 24px;
}

.product-info {
  flex: 1;
}

.product-info h4 {
  color: #409EFF;
  margin: 0 0 6px 0;
  font-size: 17px;
  font-weight: 500;
}

.product-info .description {
  color: #666;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.price {
  font-size: 20px;
  font-weight: bold;
  color: #f56c6c;
  min-width: 90px;
  text-align: right;
}

.proof-section {
  background: #f9f9f9;
  border-radius: 10px;
  padding: 20px;
  margin-top: 24px;
  border: 1px solid #e8e8e8;
}

.proof-header h4 {
  color: #409EFF;
  margin: 0 0 10px 0;
  font-size: 15px;
}

.proof-header p {
  color: #666;
  margin: 0 0 20px 0;
  font-size: 14px;
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

.actions {
  display: flex;
  justify-content: space-between;
  padding: 20px 0;
  border-top: 1px solid #e8e8e8;
  margin-top: 20px;
}
</style>
