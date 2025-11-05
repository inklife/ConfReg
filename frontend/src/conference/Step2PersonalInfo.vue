<template>
  <div class="step-container">
    <div class="header">
      <h1>Step 2: Personal Information</h1>
      <div class="progress-container">
        <button 
          class="progress-nav-btn progress-nav-left"
          @click="goBack"
          title="Previous step"
        >
          <i class="el-icon-arrow-left"></i>
        </button>
        <div class="progress-bar">
          <div class="progress" :style="{ width: '40%' }"></div>
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
      <div class="form-container">
        <el-form 
          :model="userInfo" 
          :rules="rules"
          ref="userForm"
          :label-width="labelWidth"
          class="user-form"
        >
          <el-form-item label="Full Name" prop="name" required>
            <el-input 
              v-model="userInfo.name" 
              placeholder="Enter your full name"
              size="large"
            ></el-input>
          </el-form-item>

          <el-form-item label="Email" prop="email" required>
            <el-input 
              v-model="userInfo.email" 
              placeholder="Email loaded from your account"
              size="large"
              type="email"
              :disabled="true"
            >
              <template slot="prefix">
                <i class="el-icon-lock"></i>
              </template>
            </el-input>
            <div class="field-hint">
              <i class="el-icon-info"></i>
              Email is loaded from your account. <router-link to="/dashboard?tab=profile&subtab=email" class="modify-link">Click here to modify your primary email</router-link>
            </div>
          </el-form-item>

          <el-form-item label="Phone" prop="phone" required>
            <el-input 
              v-model="userInfo.phone" 
              placeholder="Enter your phone number"
              size="large"
            ></el-input>
          </el-form-item>

          <el-form-item label="Affiliation" prop="affiliation">
            <el-input 
              v-model="userInfo.affiliation" 
              placeholder="Enter your organization/university"
              size="large"
            ></el-input>
          </el-form-item>

          <el-form-item label="Paper Type" prop="paperType" required class="paper-type-item">
            <el-radio-group 
              v-model="userInfo.paperType" 
              size="large"
              :disabled="!isFullRegistration"
            >
              <el-radio label="research">Research Paper</el-radio>
              <el-radio label="poster">Poster</el-radio>
              <el-radio label="none">None</el-radio>
            </el-radio-group>
            <div class="field-hint" v-if="!isFullRegistration">
              <i class="el-icon-info"></i>
              Paper publication is only available for Full Registration.
            </div>
          </el-form-item>

          <el-form-item label="Paper ID" prop="paperId" v-if="userInfo.paperType !== 'none'" required>
            <el-input 
              v-model="userInfo.paperId" 
              placeholder="Enter paper ID (numbers only)"
              size="large"
            ></el-input>
          </el-form-item>

          <el-form-item label="Paper Pages" prop="paperPages" v-if="userInfo.paperType !== 'none'" required>
            <el-input 
              v-model="userInfo.paperPages" 
              placeholder="Enter number of pages"
              size="large"
              type="number"
              min="1"
            ></el-input>
            <div class="field-hint">
              <i class="el-icon-info"></i>
              <template v-if="userInfo.paperType === 'research'">
                Papers are limited to 8 pages, including figures and references. Authors may include additional pages subject to an overlength page charge. <strong style="color: #f56c6c;">Extra page fee: ${{ extraPageFeeConfig.usd }} (RMB {{ extraPageFeeConfig.rmb }}) per page beyond 8 pages</strong>
              </template>
              <template v-else-if="userInfo.paperType === 'poster'">
                Posters are limited to 2 pages. Authors may include additional pages subject to an overlength page charge. <strong style="color: #f56c6c;">Extra page fee: ${{ extraPageFeeConfig.usd }} (RMB {{ extraPageFeeConfig.rmb }}) per page beyond 2 pages</strong>
              </template>
            </div>
          </el-form-item>
        </el-form>
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
  name: 'Step2PersonalInfo',
  props: {
    id: {
      type: String,
      default: 'auto'
    }
  },
  data() {
    return {
      userInfo: {
        name: '',
        email: '',
        phone: '',
        affiliation: '',
        paperType: 'research', // 默认为 research paper
        paperId: '',
        paperPages: ''
      },
      currentUserId: null,
      editMode: false,
      labelWidth: '120px',
      registrationCategory: null, // 保存注册类型
      rules: {
        name: [
          { required: true, message: 'Please enter your full name', trigger: 'blur' }
        ],
        phone: [
          { required: true, message: 'Please enter your phone number', trigger: 'blur' }
        ],
        paperType: [
          { required: true, message: 'Please select paper type', trigger: 'change' }
        ],
        paperId: [
          { 
            required: true, 
            message: 'Please enter paper ID', 
            trigger: 'blur' 
          },
          { 
            pattern: /^[1-9]\d*$/, 
            message: 'Paper ID must be a number without leading zeros', 
            trigger: 'blur' 
          }
        ],
        paperPages: [
          { 
            required: true, 
            message: 'Please enter number of pages', 
            trigger: 'blur' 
          },
          { 
            pattern: /^([1-9]|1[0-6])$/, 
            message: 'Paper pages must be a valid number', 
            trigger: 'blur' 
          }
        ]
        // 移除email验证规则，因为email现在是只读的，从用户账户信息中获取
      }
    }
  },
  computed: {
    canProceed() {
      // 检查必填字段：name, email, phone, paperType
      return this.userInfo.name.trim() && 
             this.userInfo.email.trim() && 
             this.userInfo.phone.trim() &&
             this.userInfo.paperType;
    },
    // 避免与ElementUI Form组件的内部fields属性冲突
    formFields() {
      return this.userInfo;
    },
    // 判断是否为 Full Registration
    isFullRegistration() {
      return this.registrationCategory === 'full';
    },
    // 获取超页费配置
    extraPageFeeConfig() {
      try {
        const config = localStorage.getItem('conferenceExtraPageFee');
        return config ? JSON.parse(config) : { usd: 80, rmb: 600 };
      } catch (error) {
        return { usd: 80, rmb: 600 };
      }
    }
  },
  mounted() {
    // 检测编辑模式
    if (this.id && this.id !== 'new') {
      this.editMode = true;
      console.log('Step2 - Edit mode detected, registration ID:', this.id);
    }
    
    this.loadRegistrationCategory();
    this.initializeUserData();
    this.updateLabelWidth();
    window.addEventListener('resize', this.updateLabelWidth);
  },
  methods: {
    loadRegistrationCategory() {
      // 从 localStorage 中加载注册类型
      if (!this.currentUserId) {
        const currentUser = this.$store.state.account.user;
        if (currentUser && currentUser.id) {
          this.currentUserId = currentUser.id;
        }
      }

      const storageKey = this.id && this.id !== 'new' 
        ? `conferenceProductSelection_${this.currentUserId}_${this.id}`
        : `conferenceProductSelection_${this.currentUserId}`;
      
      const savedProduct = localStorage.getItem(storageKey);
      if (savedProduct) {
        try {
          const productData = JSON.parse(savedProduct);
          this.registrationCategory = productData.registration_category || null;
          console.log('Loaded registration category:', this.registrationCategory);
          
          // 不在这里应用规则，等数据加载完成后再应用
        } catch (error) {
          console.warn('Failed to parse saved product data:', error);
        }
      }
    },

    applyPaperTypeRules() {
      // 根据注册类型应用 Paper Type 规则
      if (!this.isFullRegistration) {
        // 如果不是 Full Registration，强制设置为 none
        this.userInfo.paperType = 'none';
        console.log('Paper Type set to none (not Full Registration)');
      } else {
        // 如果是 Full Registration，只在 paperType 为 none 时才设置默认值
        // 不要覆盖用户已选择的 poster 或 research
        if (this.userInfo.paperType === 'none' || !this.userInfo.paperType) {
          this.userInfo.paperType = 'research';
          console.log('Paper Type set to research (Full Registration, was none or empty)');
        } else {
          console.log('Paper Type kept as:', this.userInfo.paperType, '(user selection preserved)');
        }
      }
    },

    updateLabelWidth() {
      if (window.innerWidth <= 480) {
        this.labelWidth = '80px';
      } else if (window.innerWidth <= 768) {
        this.labelWidth = '90px';
      } else {
        this.labelWidth = '120px';
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
      
      // 检查用户是否切换
      const lastUserId = localStorage.getItem('lastConferenceUserId');
      if (lastUserId && lastUserId !== this.currentUserId.toString()) {
        console.log('User changed detected in Step2');
        // 用户已切换，数据应该已经在Step1中清理了
        this.clearUserInfo();
      }

      // 如果是编辑模式，先尝试从后端加载特定注册记录的数据
      if (this.editMode && this.id && this.id !== 'new') {
        await this.loadBackendRegistrationData();
      }

      this.loadUserInfo();
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
        console.log('Step2 - Loading backend registration data for ID:', this.id);
        
        // 验证ID格式
        if (!/^\d+$/.test(this.id)) {
          console.warn('Step2 - Invalid registration ID format:', this.id);
          this.$message.warning('Invalid registration ID');
          this.$router.push('/dashboard?tab=registrations');
          return;
        }
        
        const axios = (await import('axios')).default;
        
        const response = await axios.get(`/api/submissions/registration/${this.id}`, {
          withCredentials: true
        });
        
        console.log('Step2 - Backend registration response:', response.data);
        
        if (response.data.success && response.data.registration_data) {
          const regData = response.data.registration_data;
          
          // 保存用户信息到 localStorage
          const userInfo = {
            name: regData.name,
            email: regData.email,
            phone: regData.phone,
            affiliation: regData.affiliation,
            paperType: regData.paper_type || 'research',
            paperId: regData.paper_id,
            paperPages: regData.paper_pages
          };
          localStorage.setItem(
            this.getStorageKey('conferenceUserInfo'), 
            JSON.stringify(userInfo)
          );
          
          console.log('Step2 - Backend data saved to localStorage');
        } else {
          // 注册记录不存在
          console.warn('Step2 - Registration not found for ID:', this.id);
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
      } catch (error) {
        console.error('Step2 - Failed to load backend registration data:', error);
        
        // 如果是404错误，说明ID不存在
        if (error.response && error.response.status === 404) {
          this.$message.warning('Registration not found');
          this.$router.push('/dashboard?tab=registrations');
        }
        // 其他错误不阻塞流程
      }
    },

    async loadUserInfo() {
      if (!this.currentUserId) return;

      try {
        // 1. 首先从store中获取基础用户信息进行预填充
        this.prefillFromStore();

        // 2. 尝试从localStorage加载已保存的表单数据（会覆盖相同字段）
        const savedInfo = localStorage.getItem(this.getStorageKey('conferenceUserInfo'));
        if (savedInfo) {
          const parsedInfo = JSON.parse(savedInfo);
          // 只覆盖非空的字段，保留store中的预填充数据作为fallback
          Object.keys(parsedInfo).forEach(key => {
            if (parsedInfo[key] && parsedInfo[key].trim() !== '') {
              this.userInfo[key] = parsedInfo[key];
            }
          });
          console.log('Loaded and merged saved form data for user:', this.currentUserId);
        }

        // 3. 最后尝试从服务器获取更完整的用户信息
        await this.loadUserInfoFromServer();
        
        // 4. 加载完成后，应用 Paper Type 规则
        this.applyPaperTypeRules();
        
      } catch (error) {
        console.warn('Failed to load user info:', error);
        // 如果出错，至少确保有基础的预填充数据
        if (!this.userInfo.name && !this.userInfo.email) {
          this.prefillFromStore();
        }
        // 即使出错也应用 Paper Type 规则
        this.applyPaperTypeRules();
      }
    },

    prefillFromStore() {
      // 从store中获取当前登录用户的基本信息进行预填充
      const currentUser = this.$store.state.account.user;
      if (currentUser) {
        // 只在字段为空时进行预填充，避免覆盖用户已输入的数据
        if (!this.userInfo.name) {
          this.userInfo.name = currentUser.fullname || currentUser.name || currentUser.username || '';
        }
        // Email总是从用户账户信息中获取，确保数据一致性
        this.userInfo.email = currentUser.email || '';
        
        console.log('Pre-filled form with store user data:', {
          name: this.userInfo.name,
          email: this.userInfo.email
        });
      }
    },

    async loadUserInfoFromServer() {
      try {
        // 从服务器获取用户完整信息，可能包含更多字段
        const axios = (await import('axios')).default;
        
        // 使用完整路径
        const response = await axios.get('/api/auth/me', {
          withCredentials: true
        });

        if (response.data.success && response.data.user) {
          const serverUser = response.data.user;
          
          // 使用服务器数据补充或更新表单信息
          // 优先保留已有数据，只填充空字段
          if (!this.userInfo.name && (serverUser.fullname || serverUser.name)) {
            this.userInfo.name = serverUser.fullname || serverUser.name || '';
          }
          // Email总是从服务器用户数据中获取，确保数据一致性
          if (serverUser.email) {
            this.userInfo.email = serverUser.email || '';
          }
          // 如果服务器有其他字段信息也可以填充
          if (!this.userInfo.phone && serverUser.phone) {
            this.userInfo.phone = serverUser.phone || '';
          }
          if (!this.userInfo.affiliation && serverUser.affiliation) {
            this.userInfo.affiliation = serverUser.affiliation || '';
          }
          
          console.log('Enhanced form with server user data:', {
            name: this.userInfo.name,
            email: this.userInfo.email,
            phone: this.userInfo.phone,
            affiliation: this.userInfo.affiliation
          });
        }
      } catch (error) {
        console.warn('Failed to load user info from server:', error);
        // 服务器请求失败不影响已有的预填充数据
      }
    },

    clearUserInfo() {
      this.userInfo = {
        name: '',
        email: '',
        phone: '',
        affiliation: '',
        paperType: 'research',
        paperId: '',
        paperPages: ''
      };
    },

    saveUserInfo() {
      if (!this.currentUserId) return;
      
      try {
        localStorage.setItem(
          this.getStorageKey('conferenceUserInfo'), 
          JSON.stringify(this.userInfo)
        );
        console.log('User info saved for user:', this.currentUserId);
      } catch (error) {
        console.warn('Failed to save user info:', error);
      }
    },

    nextStep() {
      this.$refs.userForm.validate((valid) => {
        if (valid) {
          this.saveUserInfo();
          this.$emit('step-complete', { userInfo: this.userInfo });
          
          if (this.id === 'new') {
            this.$router.push('/conference/new/step3');
          } else if (this.editMode && this.id) {
            this.$router.push(`/conference/${this.id}/step3`);
          } else {
            this.$router.push('/conference/new/step3');
          }
        } else {
          this.$message.error('Please fill in all required fields correctly');
        }
      });
    },

    goBack() {
      this.saveUserInfo(); // 保存当前输入
      
      // Show warning toast
      this.$message({
        message: 'Only go back if you need to modify the registration type or re-upload your PDF. If you just moved forward to Step 3 instead of going back, your uploaded PDF will not be lost.',
        type: 'warning',
        duration: 11000,
        showClose: true
      });
      
      if (this.id === 'new') {
        this.$router.push('/conference/new/step1');
      } else if (this.editMode && this.id) {
        this.$router.push(`/conference/${this.id}/step1`);
      } else {
        this.$router.push('/conference/new/step1');
      }
    }
  },

  // 监听用户信息变化，自动保存
  watch: {
    userInfo: {
      handler() {
        // 防抖保存
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
          this.saveUserInfo();
        }, 1000);
      },
      deep: true
    },
    // 监听注册类型变化
    isFullRegistration(newVal, oldVal) {
      // 只在注册类型真正改变时处理，避免初始化时覆盖已加载的数据
      if (oldVal === undefined) {
        // 初始化阶段，不做任何修改
        return;
      }
      
      if (!newVal) {
        // 如果不是 Full Registration，强制设置为 none
        this.userInfo.paperType = 'none';
        console.log('Paper Type changed to none (registration type changed to non-full)');
      } else if (this.userInfo.paperType === 'none') {
        // 如果是 Full Registration 且当前是 none，设置为默认的 research
        // 但不要覆盖用户已选择的 poster
        this.userInfo.paperType = 'research';
        console.log('Paper Type changed to research (registration type changed to full)');
      }
    },
    // 监听 paperType 变化，清空相关字段
    'userInfo.paperType'(newVal) {
      if (newVal === 'none') {
        this.userInfo.paperId = '';
        this.userInfo.paperPages = '';
      }
    }
  },

  beforeDestroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    window.removeEventListener('resize', this.updateLabelWidth);
  }
}
</script>

<style scoped>
.step-container {
  max-width: 1000px;
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
  margin-bottom: 40px;
}

.form-container {
  background: white;
  padding: 50px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.user-form >>> .el-form-item__label {
  font-weight: 500;
  color: #333;
}

.user-form >>> .el-input__inner {
  border-radius: 8px;
}

.user-form >>> .el-textarea__inner {
  border-radius: 8px;
}

.actions {
  display: flex;
  justify-content: space-between;
  padding: 20px 0;
}

.el-button {
  padding: 12px 30px;
  border-radius: 8px;
}

.field-hint {
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  line-height: 1.4;
  max-width: 100%;
}

.field-hint i {
  font-size: 10px;
  margin-top: 1px;
  flex-shrink: 0;
}

.modify-link {
  color: #409EFF;
  text-decoration: none;
  transition: color 0.3s ease;
  white-space: nowrap;
}

.modify-link:hover {
  color: #66b3ff;
  text-decoration: underline;
}

/* Paper Type Radio 样式 */
.user-form >>> .paper-type-item .el-form-item__content {
  line-height: 40px;
  display: flex;
  align-items: center;
}

.user-form >>> .el-radio-group {
  display: flex;
  gap: 20px;
  align-items: center;
}

.user-form >>> .el-radio {
  margin-right: 0;
  display: inline-flex;
  align-items: center;
  height: 40px;
}

.user-form >>> .el-radio__input {
  line-height: 1;
}

.user-form >>> .el-radio__label {
  padding-left: 8px;
  font-size: 14px;
  line-height: 1;
}

.user-form >>> .el-radio__input.is-checked .el-radio__inner {
  border-color: #409EFF;
  background: #409EFF;
}

.user-form >>> .el-radio__inner {
  width: 16px;
  height: 16px;
}

.user-form >>> .el-radio__inner::after {
  width: 6px;
  height: 6px;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .step-container {
    padding: 12px;
  }

  .header {
    margin-bottom: 24px;
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
    margin-bottom: 24px;
  }

  .form-container {
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
  }

  .user-form >>> .el-form-item {
    margin-bottom: 18px;
  }

  .user-form >>> .el-form-item__label {
    margin-bottom: 4px;
    font-size: 13px;
    line-height: 1.3;
    width: 90px !important;
  }

  .user-form >>> .el-input--large .el-input__inner {
    height: 42px;
    line-height: 42px;
    padding: 0 12px;
    font-size: 15px;
  }

  .user-form >>> .el-textarea__inner {
    padding: 8px 12px;
    font-size: 16px;
    line-height: 1.4;
  }

  .user-form >>> .el-radio-group {
    flex-direction: column;
    gap: 12px;
  }

  .user-form >>> .el-radio__label {
    font-size: 13px;
  }

  .actions {
    padding: 16px 0 0 0;
    gap: 12px;
  }

  .actions .el-button {
    flex: 1;
    padding: 12px 20px;
    margin: 0;
  }

  .field-hint {
    font-size: 10px;
    line-height: 1.3;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 3px;
    margin-top: 3px;
  }

  .modify-link {
    margin-left: 0;
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .step-container {
    padding: 8px;
  }

  .header h1 {
    font-size: 18px;
  }

  .form-container {
    padding: 16px;
  }

  .user-form >>> .el-form-item {
    margin-bottom: 16px;
  }

  .user-form >>> .el-form-item__label {
    font-size: 12px;
    margin-bottom: 3px;
    width: 80px !important;
  }

  .user-form >>> .el-input--large .el-input__inner {
    height: 40px;
    line-height: 40px;
    font-size: 14px;
  }

  .user-form >>> .el-textarea__inner {
    font-size: 15px;
  }

  /* 移动端隐藏邮箱输入框的锁定图标 */
  .user-form >>> .el-input__prefix {
    display: none;
  }

  .field-hint {
    font-size: 9px;
    line-height: 1.2;
    margin-top: 2px;
  }

  .field-hint i {
    font-size: 8px;
  }

  .modify-link {
    font-size: 9px;
  }

  .actions {
    padding: 12px 0 0 0;
  }

  .actions .el-button {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
