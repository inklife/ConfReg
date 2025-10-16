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
        <!-- Early Bird Price Notice -->
        <div class="early-bird-notice" @click="showPriceComparison">
          <i class="el-icon-warning-outline"></i>
          <span>Current prices are <strong>Early Bird</strong> rates. Register now to save! <span class="click-hint">(Click for details)</span></span>
        </div>

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

        <!-- Attendee Registration Section -->
        <div class="product-group">
          <h3 class="group-title">Attendee Registration</h3>
          <div class="product-grid attendee-registration-grid">
            <div 
              v-for="(product, index) in attendeeRegistrationProducts" 
              :key="index + 2"
              class="product-item grid-item"
              :class="{ 'selected': selectedProduct === index + 2 }"
              @click="selectProduct(index + 2)"
            >
              <div class="radio-icon" v-if="selectedProduct === index + 2">
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
          <p class="proof-requirement">PDF format required (supports multiple pages, max 10MB)</p>
        </div>
        
        <div class="proof-upload-area">
          <el-upload
            class="proof-upload"
            action=""
            :auto-upload="false"
            :on-change="handleProofUpload"
            :show-file-list="false"
            accept="application/pdf"
          >
            <el-button size="small" type="primary">
              <i class="el-icon-upload"></i> Upload Document
            </el-button>
            <div slot="tip" class="upload-tip">
              PDF files only, supports multiple pages, max 10MB
            </div>
          </el-upload>

          <div v-if="proofFile" class="preview-area">
            <div class="file-preview">
              <i class="el-icon-document"></i>
              <span class="file-name">{{ proofFile.name }}</span>
              <span class="file-size">({{ formatFileSize(proofFile.size) }})</span>
            </div>
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
        <li>Please note that <strong>ONE Full Registration must be paid for EACH paper</strong> to be published in the proceedings.</li>
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

    <!-- Price Comparison Dialog -->
    <el-dialog
      title="Registration Fees"
      :visible.sync="priceDialogVisible"
      width="90%"
      custom-class="price-comparison-dialog"
      center
    >
      <div class="price-table-container">
        <table class="price-comparison-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Membership Type / Item</th>
              <th>Early Bird (USD / RMB)</th>
              <th>Late Registration (USD / RMB)</th>
              <th>Benefits</th>
            </tr>
          </thead>
          <tbody>
            <!-- Full Registration -->
            <tr>
              <td rowspan="2" class="category-cell">Full Registration</td>
              <td>IEEE Member</td>
              <td class="price-cell highlight">$700 (RMB 5000)</td>
              <td class="price-cell">$850 (RMB 6100)</td>
              <td rowspan="2" class="benefits-cell">
                <ul>
                  <li>Presentation and Publication of one paper</li>
                  <li>Access to all conference sessions</li>
                  <li>A copy of the proceedings</li>
                  <li>Program brochure and conference goodies (e.g., bags/paper/pens)</li>
                  <li>Lunch, coffee breaks, banquet and reception</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Non-IEEE Member</td>
              <td class="price-cell highlight">$840 (RMB 6000)</td>
              <td class="price-cell">$990 (RMB 7100)</td>
            </tr>
            
            <!-- Attendee Registration -->
            <tr>
              <td rowspan="4" class="category-cell">Attendee Registration</td>
              <td>IEEE Student Member/Life Member</td>
              <td class="price-cell highlight">$500 (RMB 3600)</td>
              <td class="price-cell">$650 (RMB 4700)</td>
              <td rowspan="4" class="benefits-cell">
                <ul>
                  <li>Access to all conference sessions</li>
                  <li>A copy of the proceedings</li>
                  <li>Program brochure and conference goodies (e.g., bags/paper/pens)</li>
                  <li>Lunch, coffee breaks, banquet and reception</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Student-Non-IEEE Member</td>
              <td class="price-cell highlight">$610 (RMB 4400)</td>
              <td class="price-cell">$760 (RMB 5500)</td>
            </tr>
            <tr>
              <td>IEEE-Member</td>
              <td class="price-cell highlight">$610 (RMB 4400)</td>
              <td class="price-cell">$760 (RMB 5500)</td>
            </tr>
            <tr>
              <td>Non-IEEE Member</td>
              <td class="price-cell highlight">$700 (RMB 5000)</td>
              <td class="price-cell">$850 (RMB 6100)</td>
            </tr>

            <!-- Additional Fee -->
            <tr>
              <td rowspan="2" class="category-cell">Additional Fee</td>
              <td>Extra page fee (per page)</td>
              <td class="price-cell">$80 (RMB 600)</td>
              <td class="price-cell">$80 (RMB 600)</td>
              <td>One additional page (no more than 10 pages in total)</td>
            </tr>
            <tr>
              <td>Extra banquet tickets (per ticket)</td>
              <td class="price-cell">$150 (RMB 1100)</td>
              <td class="price-cell">$150 (RMB 1100)</td>
              <td>One additional banquet ticket</td>
            </tr>
          </tbody>
        </table>
        
        <div class="price-note">
          <strong>Note:</strong> Early Bird Registration deadline is October 31, 2025.<br>
          The Early Bird rate eligibility is determined by the <strong>actual payment arrival date</strong>, not the registration submission date. 
          You may complete the payment first and fill in the registration information later. 
          As long as the payment arrives before October 31, 2025 (Beijing Time), the Early Bird rate will apply.
        </div>
      </div>
    </el-dialog>
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
      priceDialogVisible: false, // 价格对比弹窗显示状态
      products: [
        // Full Registration (2 types)
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
        // Attendee Registration (4 types)
        { 
          code: 'Attendee - IEEE Member', 
          price: 610,
          priceRMB: 4400,
          description: 'For attendees with IEEE membership'
        },
        { 
          code: 'Attendee - Non-IEEE Member', 
          price: 700,
          priceRMB: 5000,
          description: 'For attendees without IEEE membership'
        },
        { 
          code: 'IEEE Student Member/Life Member', 
          price: 500,
          priceRMB: 3600,
          description: 'For IEEE student members or life members'
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
        'Attendee - IEEE Member': 'IEEE membership verification',
        'IEEE Student Member/Life Member': 'IEEE membership verification (If IEEE student member, PDF should also include student ID card photo or other proof materials in addition to IEEE membership certificate; Life members only need to provide IEEE life membership proof)'
      }
    }
  },
  computed: {
    fullRegistrationProducts() {
      return this.products.slice(0, 2); // First 2 products are Full Registration
    },
    attendeeRegistrationProducts() {
      return this.products.slice(2, 6); // Products 2-5 are Attendee Registration
    },
    selectedProductRequiresProof() {
      if (this.selectedProduct === null) return false;
      const productCode = this.products[this.selectedProduct].code;
      return Object.keys(this.proofTypes).includes(productCode);
    },
    canProceed() {
      if (this.selectedProduct === null) return false;
      if (this.selectedProductRequiresProof && !this.proofFile) return false;
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
          
          // 保存产品选择数据到 localStorage（包含 registration_category）
          const productData = {
            code: regData.product_code,
            price: regData.product_price,
            priceRMB: regData.product_price_rmb,
            description: this.products.find(p => p.code === regData.product_code)?.description || '',
            registration_category: regData.registration_category || 'full' // 从后端获取，或默认为 full
          };
          localStorage.setItem(
            this.getStorageKey('conferenceProductSelection'), 
            JSON.stringify(productData)
          );
          
          console.log('Step1 - Product data loaded from backend:', productData);
          
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

        // 加载证明文件信息（只加载元数据，不加载文件内容）
        const savedProofInfo = localStorage.getItem(this.getStorageKey('conferenceProofFileInfo'));
        console.log('savedProofInfo exists:', !!savedProofInfo);
        if (savedProofInfo) {
          try {
            const fileInfo = JSON.parse(savedProofInfo);
            this.proofPreview = fileInfo.name;
            console.log('Proof file info restored:', fileInfo);
            // 注意：实际的 proofFile 对象无法从 localStorage 恢复
            // 用户需要重新上传文件（这是编辑模式的限制）
          } catch (error) {
            console.warn('Failed to parse proof file info:', error);
          }
        } else {
          console.log('No proof file info found in localStorage');
        }
        
        console.log('=== Step1 - Data loading complete ===');
        console.log('selectedProduct:', this.selectedProduct);
        console.log('proofPreview exists:', !!this.proofPreview);
        console.log('proofFile exists:', !!this.proofFile);
        
      } catch (error) {
        console.warn('Failed to load saved data:', error);
      }
    },

    // 注意：此方法已废弃，不再从 base64 创建 File 对象
    // PDF 文件应该保持在内存中，不通过 localStorage 传递
    createFileFromBase64(base64Data) {
      console.warn('Step1 - createFileFromBase64 is deprecated. Files should not be stored in localStorage.');
    },

    saveData() {
      if (!this.currentUserId) return;

      try {
        // 保存产品选择（使用带用户ID的键名）
        if (this.selectedProduct !== null) {
          const productData = this.products[this.selectedProduct];
          
          // 确定 registration_category
          // 索引 0-1: Full Registration
          // 索引 2-5: Attendee Registration
          const registrationCategory = this.selectedProduct < 2 ? 'full' : 'attendee';
          
          // 保存产品数据，包含 category
          const dataToSave = {
            ...productData,
            registration_category: registrationCategory
          };
          
          localStorage.setItem(
            this.getStorageKey('conferenceProductSelection'), 
            JSON.stringify(dataToSave)
          );
          
          console.log('Product data saved with category:', {
            productCode: productData.code,
            category: registrationCategory
          });
        }
        
        // 注意：证明文件的 base64 数据已经在 handleProofUpload 中保存了
        // 这里不需要再次保存，因为 proofPreview 只是文件名
        
        console.log('Data saved for user:', this.currentUserId);
      } catch (error) {
        console.warn('Failed to save data:', error);
      }
    },

    selectProduct(index) {
      this.selectedProduct = index;
      this.saveData();
    },

    showPriceComparison() {
      this.priceDialogVisible = true;
    },

    handleProofUpload(file) {
      const isPDF = file.raw.type === 'application/pdf';
      const isLt10M = file.raw.size / 1024 / 1024 < 10;

      if (!isPDF) {
        this.$message.error('Only PDF files are allowed!');
        return;
      }

      if (!isLt10M) {
        this.$message.error('File size must be less than 10MB!');
        return;
      }

      this.proofFile = file.raw;
      this.proofPreview = file.name; // 存储文件名用于显示
      
      // 不再保存 PDF 到 localStorage（文件可能很大）
      // 只保存文件名，实际文件保存在组件内存中
      if (this.currentUserId) {
        const fileInfo = {
          name: file.name,
          size: file.raw.size,
          type: file.raw.type
        };
        localStorage.setItem(
          this.getStorageKey('conferenceProofFileInfo'), 
          JSON.stringify(fileInfo)
        );
        console.log('Step1 - PDF file info saved:', fileInfo);
      }
      
      this.$message.success('PDF file uploaded successfully!');
    },
    
    removeProof() {
      this.proofFile = null;
      this.proofPreview = null;
      if (this.currentUserId) {
        localStorage.removeItem(this.getStorageKey('conferenceProofFileInfo'));
      }
    },
    
    nextStep() {
      this.saveData();
      
      // 将 proofFile 存储到 window 对象（临时内存存储，避免 localStorage 大小限制）
      if (this.proofFile && this.currentUserId) {
        const proofFileKey = `proofFile_${this.currentUserId}`;
        window[proofFileKey] = this.proofFile;
        console.log('Step1 - Proof file stored in memory:', {
          key: proofFileKey,
          fileName: this.proofFile.name,
          fileSize: this.proofFile.size
        });
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
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

.early-bird-notice {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.early-bird-notice:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.early-bird-notice i {
  font-size: 20px;
  flex-shrink: 0;
}

.early-bird-notice strong {
  font-weight: 700;
  text-decoration: underline;
}

.early-bird-notice .click-hint {
  font-size: 13px;
  opacity: 0.9;
  font-style: italic;
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
  grid-template-columns: repeat(2, 1fr);
}

.attendee-registration-grid {
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
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: #f5f7fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.file-preview i {
  font-size: 24px;
  color: #409EFF;
}

.file-name {
  color: #303133;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.preview-image {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #e0e0e0;
}

.remove-btn {
  flex-shrink: 0;
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

/* Price Comparison Dialog Styles */
.price-comparison-dialog {
  max-width: 1200px;
}

.price-table-container {
  overflow-x: auto;
}

.price-comparison-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 14px;
}

.price-comparison-table th,
.price-comparison-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
  vertical-align: middle;
}

.price-comparison-table thead {
  background: #409EFF;
  color: white;
}

.price-comparison-table th {
  font-weight: 600;
  text-align: center;
}

.price-comparison-table tbody tr:nth-child(even) {
  background: #f9f9f9;
}

.price-comparison-table tbody tr:hover {
  background: #f0f7ff;
}

.category-cell {
  font-weight: 600;
  background: #e8f4ff;
  text-align: center;
  vertical-align: middle;
}

.price-cell {
  text-align: center;
  font-weight: 500;
  white-space: nowrap;
}

.price-cell.highlight {
  background: #fff3cd;
  color: #856404;
  font-weight: 600;
}

.benefits-cell ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

.benefits-cell li {
  margin-bottom: 4px;
}

.price-note {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  padding: 12px;
  color: #8c4a00;
  font-size: 14px;
}

.price-note strong {
  color: #d48806;
}

/* 平板端优化 */
@media (max-width: 1024px) and (min-width: 769px) {
  .full-registration-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .attendee-registration-grid {
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

  .early-bird-notice {
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 13px;
    gap: 8px;
  }

  .early-bird-notice i {
    font-size: 18px;
  }

  .early-bird-notice .click-hint {
    font-size: 11px;
  }

  .price-comparison-table {
    font-size: 12px;
  }

  .price-comparison-table th,
  .price-comparison-table td {
    padding: 8px;
  }

  .benefits-cell ul {
    padding-left: 16px;
    font-size: 12px;
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

  .attendee-registration-grid {
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
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .file-preview {
    padding: 8px 12px;
    font-size: 12px;
  }

  .file-preview i {
    font-size: 20px;
  }

  .file-name {
    max-width: 150px;
    font-size: 12px;
  }

  .file-size {
    font-size: 11px;
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

  .early-bird-notice {
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 12px;
    gap: 6px;
    flex-direction: row;
    text-align: left;
  }

  .early-bird-notice i {
    font-size: 16px;
  }

  .early-bird-notice .click-hint {
    font-size: 10px;
    display: block;
    margin-top: 2px;
  }

  .price-comparison-table {
    font-size: 11px;
  }

  .price-comparison-table th,
  .price-comparison-table td {
    padding: 6px 4px;
  }

  .benefits-cell ul {
    padding-left: 12px;
    font-size: 10px;
    line-height: 1.6;
  }

  .benefits-cell li {
    margin-bottom: 2px;
  }

  .price-note {
    font-size: 11px;
    padding: 8px;
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
