<template>
    <main class="flex-grow-1 d-flex align-items-center bg-light">
      <div class="container-fluid px-4">
        <div class="row justify-content-center">
          <!-- 扩大卡片尺寸，小屏幕时给更多宽度 -->
          <div class="col-xl-4 col-lg-6 col-md-8 col-sm-10 col-11">
            <div class="card shadow-lg border-0 rounded-3">
              <div class="card-body p-5">
                <!-- 登录标题 (放大) -->
                <h2 class="text-center mb-4 display-6">
                  <i class="fas fa-sign-in-alt me-2"></i>Login
                </h2>
                
                <!-- 错误提示 -->
                <div v-if="alert.message" :class="`alert ${alert.type}`" role="alert">
                  <i class="fas fa-exclamation-circle me-2"></i>{{ alert.message }}
                </div>
                
                <!-- 表单区域 (扩大间距) -->
                <form class="auth-form" @submit.prevent="handleSubmit">
                  <div class="mb-4">
                    <label class="form-label fs-5">Username or Email</label>
                    <input 
                    type="text" v-model="username" name="username" 
                      class="form-control form-control-lg py-3"
                      placeholder="Enter your username or email">
                    <small class="form-text text-muted">You can login with either your unique username or email address</small>
                <div v-show="submitted && !username" class="invalid-feedback">Username or email is required</div>                      
                  </div>

                  <div class="mb-4">
                    <label class="form-label fs-5">Password</label>
                    <input 
                      type="password" v-model="password" name="password"
                      class="form-control form-control-lg py-3"
                      placeholder="Enter your password">
                <div v-show="submitted && !password" class="invalid-feedback">Password is required</div>

                  </div>

                  <!-- 验证码输入区域 - 只在多次登录失败后显示 -->
                  <div v-if="showCaptcha" class="mb-4">
                    <label class="form-label fs-5">Captcha Verification</label>
                    <div class="alert alert-warning mb-3">
                      <i class="fas fa-shield-alt me-2"></i>
                      Multiple login attempts detected. Please complete the captcha verification.
                    </div>
                    <div class="row g-2 align-items-stretch">
                      <div class="col-8">
                        <input 
                          ref="captchaInput"
                          type="text" 
                          v-model="captcha" 
                          name="captcha"
                          class="form-control form-control-lg py-3"
                          placeholder="Enter security code"
                          maxlength="4"
                          autocomplete="off"
                          style="height: 58px;"
                          :class="{ 
                            'border-danger': fieldError && fieldError.field === 'captcha'
                          }">
                        <div v-show="submitted && showCaptcha && !captcha" class="invalid-feedback">Security code is required</div>
                        <div v-if="fieldError && fieldError.field === 'captcha'" class="invalid-feedback d-block">
                          {{ fieldError.message }}
                        </div>
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

                  <!-- 账户锁定提示 -->
                  <div v-if="accountLocked" class="mb-4">
                    <div class="alert alert-danger">
                      <i class="fas fa-lock me-2"></i>
                      <strong>Account Temporarily Locked</strong><br>
                      Your account has been temporarily locked due to multiple failed login attempts.<br>
                      <span v-if="lockRemainingTime > 0">
                        Please try again in <strong>{{ lockRemainingTime }}</strong> minutes.
                      </span>
                    </div>
                  </div>
                  <div class="d-grid gap-2">
                    <button class="btn btn-primary btn-lg py-3" type="submit" :disabled="status.loggingIn || accountLocked">
                      <span v-if="status.loggingIn" class="spinner-border spinner-border-sm me-2"></span>
                      <span v-if="accountLocked">Account Locked</span>
                      <span v-else>Login</span>
                    </button>
                  </div>
                </form>

                <!-- 忘记密码和注册链接 -->
                <div class="text-center mt-4">
                  <div class="mb-3">
                    <router-link to="/forgot-password" class="forgot-password-btn">
                      <i class="fas fa-key me-2"></i>
                      Forgot Password?
                    </router-link>
                  </div>
                  <router-link 
                    to="/register" 
                    class="text-primary fw-bold fs-5">
                    Register
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
    data () {
        return {
            username: '',
            password: '',
            captcha: '',
            captchaSvg: '',
            captchaLoading: false,
            showCaptcha: false, // 控制验证码显示
            accountLocked: false, // 账户锁定状态
            lockRemainingTime: 0, // 剩余锁定时间（分钟）
            lockTimer: null, // 锁定计时器
            loginAttempts: 0, // 登录尝试次数
            submitted: false
        }
    },
    computed: {
        ...mapState('account', ['status']),
        ...mapState('alert', {
            alert: state => ({ type: state.type, message: state.message }),
            fieldError: state => state.fieldError
        })
    },
    watch: {
        // 监听字段错误变化，自动聚焦到错误字段
        fieldError: {
            handler(newFieldError) {
                if (newFieldError && newFieldError.field) {
                    this.$nextTick(() => {
                        this.focusErrorField(newFieldError.field);
                    });
                }
            },
            immediate: true
        },
        // 监听alert消息变化，自动显示验证码
        alert: {
            handler(newAlert) {
                console.log('=== Alert watcher triggered ===');
                console.log('New alert:', newAlert);
                if (newAlert && newAlert.message) {
                    const message = newAlert.message.toLowerCase();
                    console.log('Alert message (lowercase):', message);
                    // 检查是否包含验证码相关的错误信息
                    if (message.includes('please complete the captcha') ||
                        message.includes('captcha')) {
                        console.log('Alert contains captcha requirement, showing captcha');
                        this.showCaptcha = true;
                        this.loadCaptcha();
                        localStorage.setItem('showCaptcha', 'true');
                        localStorage.setItem('showCaptchaTimestamp', Date.now().toString());
                    }
                }
            },
            immediate: true
        }
    },
    created () {
        // reset login status locally only - don't call backend logout
        this.$store.commit('account/logout');
        localStorage.removeItem('user');
        // clear any previous alerts
        this.$store.dispatch('alert/clear');
        
        // 检查服务器状态并清理过期的验证码状态
        this.checkServerStatusAndCleanup();
        
        // 检查是否有保存的登录失败状态
        this.checkSavedFailureState();
        
        // 如果需要显示验证码，加载验证码
        if (this.showCaptcha) {
            this.loadCaptcha();
        }
    },
    mounted() {
        // 添加窗口大小改变监听器
        window.addEventListener('resize', this.handleResize);
        
        // 页面加载完成后额外触发一次缩放，确保验证码正确显示
        setTimeout(() => {
            if (this.showCaptcha && this.captchaSvg) {
                this.scaleCaptchaSvg();
            }
        }, 200);
    },
    destroyed() {
        // 清理计时器
        if (this.lockTimer) {
            clearInterval(this.lockTimer);
        }
        // 清理窗口事件监听器
        window.removeEventListener('resize', this.handleResize);
    },
    methods: {
        ...mapActions('account', ['login', 'logout']),
        
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
            
            console.log(`Captcha scaling: container(${containerWidth}x${containerHeight}), svg(${svgWidth}x${svgHeight}), scale(${scale})`);
        },

        handleResize() {
            // 窗口大小改变时重新计算验证码缩放
            if (this.showCaptcha && this.captchaSvg) {
                this.$nextTick(() => {
                    this.scaleCaptchaSvg();
                });
            }
        },
        
        handleSubmit (e) {
            this.submitted = true;
            const { username, password } = this;
            
            // 检查基本字段
            if (!username || !password) {
                this.$store.dispatch('alert/error', 'Please fill in all required fields');
                return;
            }
            
            // 如果显示验证码，检查验证码
            if (this.showCaptcha && !this.captcha) {
                this.$store.dispatch('alert/error', 'Please complete the captcha verification');
                return;
            }
            
            // 如果账户被锁定，不允许提交
            if (this.accountLocked) {
                return;
            }
            
            const loginData = { username, password };
            if (this.showCaptcha) {
                loginData.captcha = this.captcha;
            }
            
            this.login(loginData)
                .catch((fieldError) => {
                    console.log('LoginPage catch block - Login error:', fieldError);
                    this.handleLoginError(fieldError);
                    
                    // Focus on the error field if specified
                    if (fieldError && fieldError.field) {
                        this.$nextTick(() => {
                            this.focusErrorField(fieldError.field);
                        });
                    }
                });
        },
        
        handleLoginError(error) {
            console.log('=== handleLoginError called ===');
            console.log('Error object:', error);
            console.log('Error response:', error.response);
            console.log('Error response data:', error.response?.data);
            console.log('Error message:', error.message);
            
            // 检查是否是账户锁定错误
            if (error.response?.status === 429 && error.response?.data?.locked) {
                console.log('Account locked detected');
                this.setAccountLocked(error.response.data.remainingTime);
                return;
            }
            
            // 检查后端是否明确要求验证码
            const errorMessage = error.response?.data?.message || error.message || '';
            const needsCaptcha = error.response?.data?.needsCaptcha || 
                               errorMessage.includes('Captcha verification required') ||
                               errorMessage.includes('Please complete the captcha') ||
                               errorMessage.includes('captcha');
            
            // 检查是否是第二次失败（需要在下次登录时显示验证码）
            const isSecondFailure = errorMessage.includes('1 attempts remaining') || 
                                  errorMessage.includes('1 attempt remaining');
            
            console.log('Error message for captcha check:', errorMessage);
            console.log('needsCaptcha result:', needsCaptcha);
            console.log('isSecondFailure result:', isSecondFailure);
            
            // 如果后端明确要求验证码，立即显示验证码
            if (needsCaptcha) {
                console.log('Backend requires captcha, showing captcha input');
                this.showCaptcha = true;
                this.loadCaptcha();
                // 保存状态
                localStorage.setItem('showCaptcha', 'true');
                localStorage.setItem('showCaptchaTimestamp', Date.now().toString());
                return;
            }
            
            // 如果是第二次失败，预先显示验证码（改善用户体验）
            if (isSecondFailure) {
                console.log('Second failure detected, pre-showing captcha for better UX');
                this.showCaptcha = true;
                this.loadCaptcha();
                // 保存状态
                localStorage.setItem('showCaptcha', 'true');
                localStorage.setItem('showCaptchaTimestamp', Date.now().toString());
            }
            
            // 增加登录尝试次数（仅用于本地记录，不用于决定是否显示验证码）
            this.loginAttempts++;
            console.log('Login attempts:', this.loginAttempts);
            
            // 保存失败状态到localStorage
            this.saveFailureState();
            
            // 刷新验证码（如果已经在显示）
            if (this.showCaptcha) {
                this.refreshCaptcha();
            }
        },
        
        setAccountLocked(remainingMinutes) {
            this.accountLocked = true;
            this.lockRemainingTime = remainingMinutes;
            
            // 保存锁定状态到localStorage
            const lockUntil = Date.now() + (remainingMinutes * 60 * 1000);
            localStorage.setItem('accountLockUntil', lockUntil.toString());
            localStorage.setItem('loginAttempts', this.loginAttempts.toString());
            localStorage.setItem('showCaptcha', 'true');
            localStorage.setItem('showCaptchaTimestamp', Date.now().toString());
            
            // 启动倒计时
            this.startLockCountdown();
        },
        
        startLockCountdown() {
            if (this.lockTimer) {
                clearInterval(this.lockTimer);
            }
            
            this.lockTimer = setInterval(() => {
                this.lockRemainingTime--;
                if (this.lockRemainingTime <= 0) {
                    this.clearLockState();
                }
            }, 60000); // 每分钟更新一次
        },
        
        clearLockState() {
            this.accountLocked = false;
            this.lockRemainingTime = 0;
            if (this.lockTimer) {
                clearInterval(this.lockTimer);
                this.lockTimer = null;
            }
            
            // 清除localStorage中的锁定状态
            localStorage.removeItem('accountLockUntil');
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('showCaptcha');
            localStorage.removeItem('showCaptchaTimestamp');
            
            // 重置状态
            this.loginAttempts = 0;
            this.showCaptcha = false;
            this.captcha = '';
        },
        
        checkSavedFailureState() {
            // 首先检查验证码状态的时间戳，如果太旧则清除
            const captchaTimestamp = localStorage.getItem('showCaptchaTimestamp');
            const currentTime = Date.now();
            const maxAge = 30 * 60 * 1000; // 30分钟过期时间
            
            if (captchaTimestamp) {
                const timestamp = parseInt(captchaTimestamp);
                if (currentTime - timestamp > maxAge) {
                    console.log('Captcha state expired, clearing local storage');
                    this.clearAllFailureState();
                    return;
                }
            }
            
            const lockUntil = localStorage.getItem('accountLockUntil');
            const savedAttempts = localStorage.getItem('loginAttempts');
            const savedShowCaptcha = localStorage.getItem('showCaptcha');
            
            if (lockUntil) {
                const now = Date.now();
                const lockTime = parseInt(lockUntil);
                
                if (now < lockTime) {
                    // 仍在锁定期内
                    const remainingMs = lockTime - now;
                    this.lockRemainingTime = Math.ceil(remainingMs / 60000); // 转换为分钟
                    this.accountLocked = true;
                    this.startLockCountdown();
                } else {
                    // 锁定期已过，清除状态
                    this.clearLockState();
                }
            }
            
            if (savedAttempts) {
                this.loginAttempts = parseInt(savedAttempts) || 0;
            }
            
            if (savedShowCaptcha === 'true') {
                this.showCaptcha = true;
            }
        },
        
        clearAllFailureState() {
            localStorage.removeItem('showCaptcha');
            localStorage.removeItem('showCaptchaTimestamp');
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('accountLockUntil');
            this.showCaptcha = false;
            this.loginAttempts = 0;
            this.accountLocked = false;
            this.lockRemainingTime = 0;
            if (this.lockTimer) {
                clearInterval(this.lockTimer);
                this.lockTimer = null;
            }
        },
        
        saveFailureState() {
            localStorage.setItem('loginAttempts', this.loginAttempts.toString());
            if (this.showCaptcha) {
                localStorage.setItem('showCaptcha', 'true');
                localStorage.setItem('showCaptchaTimestamp', Date.now().toString());
            }
        },
        
        async checkServerStatusAndCleanup() {
            try {
                // 先检查是否需要验证码的状态还有效
                const savedShowCaptcha = localStorage.getItem('showCaptcha');
                if (!savedShowCaptcha) {
                    return; // 没有保存的验证码状态，无需检查
                }
                
                // 向服务器发送一个轻量级请求检查状态
                // 尝试用一个不存在的用户名进行登录测试，观察服务器响应
                const testResponse = await axios.post('/api/auth/login', {
                    username: 'test_status_check_' + Date.now(),
                    password: 'test'
                }, {
                    withCredentials: true
                });
            } catch (error) {
                // 期望这里会失败，关键是检查响应中是否要求验证码
                const needsCaptcha = error.response?.data?.needsCaptcha || false;
                
                console.log('Server captcha requirement check:', needsCaptcha);
                
                // 如果服务器不再要求验证码，清除本地状态
                if (!needsCaptcha) {
                    console.log('Server no longer requires captcha, clearing local state');
                    localStorage.removeItem('showCaptcha');
                    localStorage.removeItem('loginAttempts');
                    localStorage.removeItem('accountLockUntil');
                    this.showCaptcha = false;
                    this.loginAttempts = 0;
                    this.accountLocked = false;
                    this.lockRemainingTime = 0;
                }
            }
        },

        // 聚焦到错误字段
        focusErrorField(fieldName) {
            const fieldRefMap = {
                'captcha': 'captchaInput'
            };

            const refName = fieldRefMap[fieldName];
            if (refName && this.$refs[refName]) {
                this.$refs[refName].focus();
                // 滚动到错误字段
                this.$refs[refName].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
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

/* 导航栏优化 */
.navbar {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

/* 忘记密码按钮样式 */
.forgot-password-btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(0, 123, 255, 0.1);
  color: #007bff !important;
  text-decoration: none;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 123, 255, 0.2);
}

.forgot-password-btn:hover {
  color: #0056b3 !important;
  background: rgba(0, 123, 255, 0.15);
  border-color: rgba(0, 123, 255, 0.3);
  transform: translateY(-1px);
}

.forgot-password-btn:active {
  transform: translateY(0);
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

/* 响应式调整 */
@media (max-width: 768px) {
  .navbar-brand {
    font-size: 1.5rem !important;
  }
  .btn-lg {
    padding: 0.5rem 1rem;
  }
  .card {
    min-width: auto;
    margin: 0 0.5rem; /* 添加左右边距，确保在小屏幕上有适当的间距 */
  }
  
  .forgot-password-btn {
    padding: 0.6rem 1.2rem;
    font-size: 0.95rem;
  }
}

/* 账户锁定相关样式 */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 安全验证提示样式 */
.alert-warning {
  background-color: #fff3cd;
  border-color: #ffeaa7;
  color: #856404;
}

/* 字段错误样式 */
.border-danger {
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
  animation: shake 0.5s ease-in-out;
}

/* 抖动动画 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

/* 动画效果 */
.captcha-container {
  transition: transform 0.2s ease;
}

.captcha-container:active {
  transform: scale(0.98);
}

/* 锁定状态的特殊样式 */
.btn:disabled.btn-primary {
  background-color: #6c757d;
  border-color: #6c757d;
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

.mb-4:has(.alert-warning) {
  animation: fadeIn 0.3s ease-out;
}
</style>