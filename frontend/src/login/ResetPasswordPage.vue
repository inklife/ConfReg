<template>
  <main class="flex-grow-1 d-flex align-items-center bg-light">
    <div class="container-fluid px-4">
      <div class="row justify-content-center">
        <div class="col-xl-4 col-lg-6 col-md-8">
          <div class="card shadow-lg border-0 rounded-3">
            <div class="card-body p-5">
              <!-- 重置密码标题 -->
              <h2 class="text-center mb-4 display-6">
                <i class="fas fa-key me-2"></i>Reset Password
              </h2>
              
              <!-- 错误/成功提示 -->
              <div v-if="alert.message" :class="`alert ${alert.type}`" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>{{ alert.message }}
              </div>
              
              <!-- 重置密码表单 -->
              <form v-if="!resetSuccess" class="auth-form" @submit.prevent="handleSubmit">
                <!-- 邮箱地址 - 总是显示，增强安全性 -->
                <div class="mb-4">
                  <label class="form-label fs-5">Email Address</label>
                  <input 
                    type="email" 
                    v-model="email" 
                    name="email" 
                    class="form-control form-control-lg py-3"
                    placeholder="Enter your email address"
                    required>
                  <small class="form-text text-muted">Enter the email address where you received the security code</small>
                  <div v-show="submitted && !email" class="invalid-feedback">Email address is required</div>
                </div>
                
                <!-- 安全码 - 总是显示，增强安全性 -->
                <div class="mb-4">
                  <label class="form-label fs-5">Security Code</label>
                  <input 
                    type="text" 
                    v-model="securityCode" 
                    name="securityCode" 
                    class="form-control form-control-lg py-3"
                    placeholder="Enter the 6-character security code from email"
                    maxlength="6"
                    style="letter-spacing: 0.1em;"
                    required>
                  <small class="form-text text-muted">
                    <span v-if="token">Security code from email link has been pre-filled. Please verify your email address.</span>
                    <span v-else>Enter the 6-character security code (letters and numbers) sent to your email</span>
                  </small>
                  <div v-show="submitted && !securityCode" class="invalid-feedback">Security code is required</div>
                </div>

                <!-- 验证码 -->
                <div class="mb-4">
                  <label class="form-label fs-5">Captcha</label>
                  <div class="row g-2 align-items-stretch">
                    <div class="col-8">
                      <input 
                        type="text" 
                        v-model="captcha" 
                        name="captcha"
                        class="form-control form-control-lg py-3"
                        placeholder="Enter captcha code"
                        maxlength="4"
                        autocomplete="off"
                        required
                        style="height: 58px;">
                      <div v-show="submitted && !captcha" class="invalid-feedback">Captcha is required</div>
                    </div>
                    <div class="col-4 d-flex flex-column align-items-center">
                      <div class="captcha-container w-100" @click="refreshCaptcha">
                        <div 
                          v-if="captchaLoading" 
                          class="captcha-loading">
                          <div class="spinner-border spinner-border-sm text-primary"></div>
                        </div>
                        <div 
                          v-else 
                          class="captcha-image" 
                          v-html="captchaSvg"
                          title="Click to refresh">
                        </div>
                      </div>
                      <small class="text-muted text-center mt-1">Click to refresh</small>
                    </div>
                  </div>
                </div>
                
                <div class="mb-4">
                  <label class="form-label fs-5">New Password</label>
                  <input 
                    type="password" 
                    v-model="password" 
                    name="password" 
                    class="form-control form-control-lg py-3"
                    placeholder="Enter your new password"
                    minlength="6"
                    required>
                  <small class="form-text text-muted">Password must be at least 6 characters long</small>
                  <div v-show="submitted && !password" class="invalid-feedback">New password is required</div>
                </div>

                <div class="mb-4">
                  <label class="form-label fs-5">Confirm Password</label>
                  <input 
                    type="password" 
                    v-model="confirmPassword" 
                    name="confirmPassword"
                    class="form-control form-control-lg py-3"
                    placeholder="Confirm your new password"
                    required>
                  <div v-show="submitted && password !== confirmPassword" class="invalid-feedback">
                    Passwords do not match
                  </div>
                </div>
                
                <div class="d-grid gap-2">
                  <button class="btn btn-primary btn-lg py-3" type="submit" :disabled="resetting">
                    <span v-if="resetting" class="spinner-border spinner-border-sm me-2"></span>
                    Reset Password
                  </button>
                </div>
              </form>

              <!-- 成功消息 -->
              <div v-if="resetSuccess" class="text-center">
                <div class="alert alert-success">
                  <i class="fas fa-check-circle me-2"></i>
                  Password has been reset successfully!
                </div>
                <router-link to="/login" class="btn btn-primary btn-lg">
                  Go to Login
                </router-link>
              </div>
              
              <!-- 返回登录链接 -->
              <div v-if="!resetSuccess" class="text-center mt-4">
                <router-link 
                  to="/login" 
                  class="text-primary fw-bold fs-5">
                  Back to Login
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import axios from 'axios'

export default {
  name: 'ResetPasswordPage',
  data() {
    return {
      password: '',
      confirmPassword: '',
      securityCode: '',
      email: '',
      captcha: '',
      captchaSvg: '',
      captchaLoading: false,
      submitted: false,
      resetting: false,
      resetSuccess: false,
      token: ''
    }
  },
  computed: {
    ...mapState('alert', {
      alert: state => ({ type: state.type, message: state.message })
    })
  },
  created() {
    // 从URL查询参数获取重置token
    this.token = this.$route.query.token;
    
    // 从URL查询参数获取邮箱地址并自动填入
    if (this.$route.query.email) {
      this.email = this.$route.query.email;
      console.log('Email pre-filled from query parameter:', this.email);
    }
    
    if (this.token) {
      // 有token，自动填入安全码字段，但仍要求验证邮箱和验证码
      this.securityCode = this.token;
      console.log('Token provided from email link, pre-filling security code');
      this.$store.dispatch('alert/success', 'Security code from email link has been filled. Please verify your email address and complete the captcha for security.');
    } else {
      // 没有token，用户需要手动输入安全码
      console.log('No token provided, user will need to enter security code manually');
    }
    
    // 加载验证码
    this.loadCaptcha();
    
    // 清除之前的其他警告
    setTimeout(() => {
      if (!this.token) {
        this.$store.dispatch('alert/clear');
      }
    }, 100);
  },
  mounted() {
    // 添加窗口大小改变监听器
    window.addEventListener('resize', this.handleResize);
    
    // 页面加载完成后额外触发一次缩放，确保验证码正确显示
    setTimeout(() => {
      if (this.captchaSvg) {
        this.scaleCaptchaSvg();
      }
    }, 200);
  },
  beforeDestroy() {
    // 清理窗口事件监听器
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    ...mapActions('alert', ['clear']),
    
    async loadCaptcha() {
      this.captchaLoading = true;
      try {
        const response = await axios.get('/api/auth/captcha', {
          withCredentials: true,
          responseType: 'text'
        });
        this.captchaSvg = response.data;
        
        // 等待 DOM 更新后计算缩放比例
        await this.$nextTick();
        this.scaleCaptchaSvg();
        
        // 额外延迟一次缩放，确保容器尺寸已确定
        setTimeout(() => {
          this.scaleCaptchaSvg();
        }, 100);
      } catch (error) {
        console.error('Failed to load captcha:', error);
        this.$store.dispatch('alert/error', 'Failed to load captcha');
      } finally {
        this.captchaLoading = false;
      }
    },
    
    scaleCaptchaSvg() {
      const captchaContainer = document.querySelector('.captcha-container');
      const captchaSvg = captchaContainer?.querySelector('svg');
      
      if (!captchaContainer || !captchaSvg) {
        return;
      }
      
      // 获取容器尺寸
      const containerWidth = captchaContainer.clientWidth;
      const containerHeight = captchaContainer.clientHeight;
      
      // 获取 SVG 原始尺寸（后端设置的 120x40）
      const svgWidth = 120;
      const svgHeight = 40;
      
      // 计算缩放比例，使 SVG 填充满容器
      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      const scale = Math.max(scaleX, scaleY); // 使用较大的缩放比例确保填满
      
      // 应用缩放变换
      captchaSvg.style.transform = `scale(${scale})`;
      
      console.log(`ResetPassword Captcha scaling: container(${containerWidth}x${containerHeight}), svg(${svgWidth}x${svgHeight}), scale(${scale})`);
    },

    handleResize() {
      // 窗口大小改变时重新计算验证码缩放
      if (this.captchaSvg) {
        this.$nextTick(() => {
          this.scaleCaptchaSvg();
        });
      }
    },
    
    refreshCaptcha() {
      this.captcha = '';
      this.loadCaptcha().then(() => {
        // 确保在验证码加载完成后重新应用缩放
        this.$nextTick(() => {
          this.scaleCaptchaSvg();
        });
      });
    },
    
    async handleSubmit() {
      this.submitted = true;
      
      // 验证所有必填字段
      if (!this.email) {
        this.$store.dispatch('alert/error', 'Please enter your email address');
        return;
      }
      
      if (!this.securityCode) {
        this.$store.dispatch('alert/error', 'Please enter the security code');
        return;
      }
      
      if (!this.captcha) {
        this.$store.dispatch('alert/error', 'Please enter the captcha code');
        return;
      }
      
      if (!this.password || !this.confirmPassword) {
        this.$store.dispatch('alert/error', 'Please fill in all password fields');
        return;
      }
      
      if (this.password.length < 6) {
        this.$store.dispatch('alert/error', 'Password must be at least 6 characters');
        return;
      }
      
      if (this.password !== this.confirmPassword) {
        this.$store.dispatch('alert/error', 'Passwords do not match');
        return;
      }
      
      this.resetting = true;
      
      try {
        // 构建请求数据 - 强制要求所有字段
        const requestData = {
          token: this.securityCode,
          email: this.email,
          captcha: this.captcha,
          password: this.password
        };
        
        const response = await axios.post('/api/auth/reset-password', requestData, {
          withCredentials: true
        });
        
        // 设置本地成功状态
        this.resetSuccess = true;
        this.$store.dispatch('alert/clear');
        
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to reset password. Please try again.';
        this.$store.dispatch('alert/error', errorMessage);
        
        // 验证码错误时刷新验证码
        if (errorMessage.toLowerCase().includes('captcha')) {
          this.refreshCaptcha();
        }
      } finally {
        this.resetting = false;
      }
    }
  }
};
</script>

<style scoped>
/* 使用与登录页面相同的样式 */
.auth-app {
  background-color: #f8f9fa;
}

.card {
  min-width: 400px;
  border-radius: 12px !important;
}

.auth-form {
  font-size: 1.1rem;
}

.alert {
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.alert-danger {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.alert-success {
  background-color: #d1eddf;
  border-color: #c3e6cb;
  color: #155724;
}

.invalid-feedback {
  display: block;
  color: #dc3545;
  font-size: 0.875em;
  margin-top: 0.25rem;
}

/* 验证码相关样式 */
.captcha-container {
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  height: 58px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-image svg {
  border: none;
  background: transparent;
  border-radius: 8px;
  transform-origin: center center;
}

.captcha-loading {
  height: 100%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .btn-lg {
    padding: 0.5rem 1rem;
  }
  .card {
    min-width: auto;
  }
}
</style>
