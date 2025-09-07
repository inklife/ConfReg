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
          label-width="120px"
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
              Email is loaded from your account. 
              <router-link to="/dashboard?tab=profile&subtab=email" class="modify-link">
                Click here to modify your primary email
              </router-link>
            </div>
          </el-form-item>

          <el-form-item label="Phone" prop="phone">
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

          <el-form-item label="Paper Title" prop="paperTitle">
            <el-input 
              v-model="userInfo.paperTitle" 
              placeholder="Enter paper title (if applicable)"
              size="large"
              type="textarea"
              :rows="3"
            ></el-input>
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
  data() {
    return {
      userInfo: {
        name: '',
        email: '',
        phone: '',
        affiliation: '',
        paperTitle: ''
      },
      currentUserId: null,
      rules: {
        name: [
          { required: true, message: 'Please enter your full name', trigger: 'blur' }
        ]
        // 移除email验证规则，因为email现在是只读的，从用户账户信息中获取
      }
    }
  },
  computed: {
    canProceed() {
      // 只需要检查name字段，email会自动从用户账户加载
      return this.userInfo.name.trim() && this.userInfo.email.trim();
    },
    // 避免与ElementUI Form组件的内部fields属性冲突
    formFields() {
      return this.userInfo;
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

      this.currentUserId = currentUser.id;
      
      // 检查用户是否切换
      const lastUserId = localStorage.getItem('lastConferenceUserId');
      if (lastUserId && lastUserId !== this.currentUserId.toString()) {
        console.log('User changed detected in Step2');
        // 用户已切换，数据应该已经在Step1中清理了
        this.clearUserInfo();
      }

      this.loadUserInfo();
    },

    getStorageKey(baseName) {
      return `${baseName}_${this.currentUserId}`;
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
        
      } catch (error) {
        console.warn('Failed to load user info:', error);
        // 如果出错，至少确保有基础的预填充数据
        if (!this.userInfo.name && !this.userInfo.email) {
          this.prefillFromStore();
        }
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
        paperTitle: ''
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
          this.$router.push('/conference/step3');
        } else {
          this.$message.error('Please fill in all required fields correctly');
        }
      });
    },

    goBack() {
      this.saveUserInfo(); // 保存当前输入
      this.$router.push('/conference/step1');
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
    }
  },

  beforeDestroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
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
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-hint i {
  font-size: 12px;
}

.modify-link {
  color: #409EFF;
  text-decoration: none;
  margin-left: 8px;
  transition: color 0.3s ease;
}

.modify-link:hover {
  color: #66b3ff;
  text-decoration: underline;
}
</style>
