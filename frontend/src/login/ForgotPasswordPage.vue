<template>
    <main class="flex-grow-1 d-flex align-items-center bg-light">
      <div class="container-fluid px-4">
        <div class="row justify-content-center">
          <!-- 扩大卡片尺寸 -->
          <div class="col-xl-4 col-lg-6 col-md-8">
            <div class="card shadow-lg border-0 rounded-3">
              <div class="card-body p-5">
                <!-- 页面标题 -->
                <h2 class="text-center mb-4 display-6">
                  <i class="fas fa-key me-2"></i>Reset Password
                </h2>
                
                <!-- 错误提示 -->
                <div v-if="alert.message" :class="`alert ${alert.type}`" role="alert">
                  <i class="fas fa-exclamation-circle me-2"></i>{{ alert.message }}
                </div>
                
                <!-- 说明文字 -->
                <div class="alert alert-info mb-4">
                  <i class="fas fa-info-circle me-2"></i>
                  Enter your email address and we'll send you a reset email with both a security code and a reset link.
                </div>
                
                <!-- 表单区域 -->
                <form class="auth-form" @submit.prevent="handleSubmit">
                  <div class="mb-4">
                    <label class="form-label fs-5">Email Address</label>
                    <input 
                      type="email" 
                      v-model="email" 
                      name="email" 
                      class="form-control form-control-lg py-3"
                      placeholder="Enter your email address"
                      required>
                    <div v-show="submitted && !email" class="invalid-feedback">Email address is required</div>
                  </div>

                  <!-- 验证码输入区域 -->
                  <div class="mb-4">
                    <label class="form-label fs-5">Captcha Verification</label>
                    <div class="row g-2 align-items-stretch">
                      <div class="col-8">
                        <input 
                          type="text" 
                          v-model="captcha" 
                          name="captcha"
                          class="form-control form-control-lg py-3"
                          placeholder="Enter security code"
                          maxlength="4"
                          autocomplete="off"
                          style="height: 58px;"
                          required>
                        <div v-show="submitted && !captcha" class="invalid-feedback">Security code is required</div>
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

                  <div class="d-grid gap-2 mb-4">
                    <button class="btn btn-primary btn-lg py-3" type="submit" :disabled="loading">
                      <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                      Send Reset Email
                    </button>
                  </div>
                </form>

                <!-- 返回登录链接 -->
                <div class="text-center">
                  <router-link 
                    to="/login" 
                    class="text-secondary">
                    <i class="fas fa-arrow-left me-2"></i>
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
import { mapState } from 'vuex'
import axios from 'axios'

export default {
    name: 'ForgotPasswordPage',
    data () {
        return {
            email: '',
            captcha: '',
            captchaSvg: '',
            captchaLoading: false,
            loading: false,
            submitted: false
        }
    },
    computed: {
        ...mapState('alert', {
            alert: state => ({ type: state.type, message: state.message })
        })
    },
    created () {
        // 清除之前的提示信息
        this.$store.dispatch('alert/clear');
        
        // 从查询参数中获取邮箱（如果有的话）
        if (this.$route.query.email) {
            this.email = this.$route.query.email;
        }
        
        // 加载验证码
        this.loadCaptcha();
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
    destroyed() {
        // 清理窗口事件监听器
        window.removeEventListener('resize', this.handleResize);
    },
    methods: {
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
        
        refreshCaptcha() {
            this.captcha = '';
            this.loadCaptcha().then(() => {
                // 确保在验证码加载完成后重新应用缩放
                this.$nextTick(() => {
                    this.scaleCaptchaSvg();
                });
            });
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
            
            console.log(`ForgotPassword Captcha scaling: container(${containerWidth}x${containerHeight}), svg(${svgWidth}x${svgHeight}), scale(${scale})`);
        },

        handleResize() {
            // 窗口大小改变时重新计算验证码缩放
            if (this.captchaSvg) {
                this.$nextTick(() => {
                    this.scaleCaptchaSvg();
                });
            }
        },
        
        async handleSubmit() {
            this.submitted = true;
            
            // 清除之前的错误信息
            this.$store.dispatch('alert/clear');
            
            if (!this.email) {
                this.$store.dispatch('alert/error', 'Please enter your email address');
                return;
            }
            
            if (!this.captcha) {
                this.$store.dispatch('alert/error', 'Please enter the security code');
                return;
            }
            
            this.loading = true;
            try {
                const response = await axios.post('/api/auth/forgot-password', {
                    email: this.email,
                    captcha: this.captcha
                }, {
                    withCredentials: true
                });
                
                this.$store.dispatch('alert/success', response.data.message);
                
                // 成功后延迟跳转到重置密码页面
                setTimeout(() => {
                    this.$router.push({
                        path: '/reset-password',
                        query: { email: this.email }
                    });
                }, 2000);
                
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'Failed to send reset email';
                this.$store.dispatch('alert/error', errorMessage);
                
                // 验证码错误时刷新验证码
                if (errorMessage.toLowerCase().includes('captcha')) {
                    this.refreshCaptcha();
                }
            } finally {
                this.loading = false;
            }
        }
    }
};
</script>

<style scoped>
/* 扩展页面高度 */
.auth-app {
  background-color: #f8f9fa;
}

/* 卡片尺寸放大 */
.card {
  min-width: 400px;
  border-radius: 12px !important;
}

/* 表单元素放大 */
.auth-form {
  font-size: 1.1rem;
}

/* Alert 样式 */
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

.alert-info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
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

/* 按钮禁用状态 */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 返回链接样式 */
.text-secondary {
  color: #6c757d !important;
  text-decoration: none;
  transition: color 0.3s ease;
}

.text-secondary:hover {
  color: #495057 !important;
  text-decoration: underline;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .card {
    min-width: auto;
  }
  
  .btn-lg {
    padding: 0.5rem 1rem;
  }
}

/* 动画效果 */
.captcha-container {
  transition: transform 0.2s ease;
}

.captcha-container:active {
  transform: scale(0.98);
}

/* 验证码区域淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mb-4 {
  animation: fadeIn 0.3s ease-out;
}
</style>
