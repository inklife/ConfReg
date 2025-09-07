<template>
    <main class="flex-grow-1 d-flex align-items-center bg-light">
      <div class="container-fluid px-4">
        <div class="row justify-content-center">
          <!-- 优化移动端卡片尺寸 -->
          <div class="col-xxl-4 col-xl-7 col-lg-8 col-md-9 col-sm-10 col-11">
            <div class="card shadow-lg border-0 rounded-3">
              <div class="card-body p-5">
                <!-- 注册标题 (与登录页相同样式) -->
                <h2 class="text-center mb-4 display-6">
                  <i class="fas fa-user-plus me-2"></i>Register
                </h2>
                
                <!-- 错误提示 -->
                <div v-if="alert.message" :class="`alert ${alert.type}`" role="alert">
                  <i class="fas fa-exclamation-circle me-2"></i>{{ alert.message }}
                </div>
                
                <!-- 显示所有验证错误（如果有多个） -->
                <div v-if="validationErrors && validationErrors.length > 0" class="alert alert-danger" role="alert">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  <div class="mb-2"><strong>Please fix the following issues:</strong></div>
                  <ul class="mb-0 ps-3">
                    <li v-for="error in validationErrors" :key="error.field || 'general'">
                      <strong>{{ getFieldDisplayName(error.field) }}:</strong> {{ error.message }}
                    </li>
                  </ul>
                </div>
                
                <!-- 表单区域 (扩大间距) -->
                <form class="auth-form" @submit.prevent="handleSubmit">
                  <!-- 全名 -->
                  <div class="mb-4">
                    <label class="form-label fs-5">Full Name</label>
                    <input 
                      type="text" 
                      v-model="user.fullname" 
                      v-validate="'required'"
                      name="fullname"
                      class="form-control form-control-lg py-3"
                      placeholder="Enter your full name"
                      :class="{ 'is-invalid': submitted && errors.has('fullname') }">
                    <div v-if="submitted && errors.has('fullname')" class="invalid-feedback fs-6">
                      {{ errors.first('fullname') }}
                    </div>
                  </div>

                  <!-- 用户名 -->
                  <div class="mb-4">
                    <label class="form-label fs-5">Username</label>
                    <input 
                      ref="usernameInput"
                      type="text" 
                      v-model="user.username" 
                      v-validate="'required|not_email'"
                      name="username"
                      class="form-control form-control-lg py-3"
                      placeholder="Create a unique username (not email format)"
                      :class="{ 
                        'is-invalid': submitted && errors.has('username'),
                        'border-danger': fieldError && fieldError.field === 'username'
                      }">
                    <small class="form-text text-muted">Not in email format. Used for login along with your email.</small>
                    <div v-if="submitted && errors.has('username')" class="invalid-feedback fs-6">
                      {{ errors.first('username') }}
                    </div>
                    <div v-if="fieldError && fieldError.field === 'username'" class="invalid-feedback fs-6 d-block">
                      {{ fieldError.message }}
                    </div>
                  </div>

                  <!-- 邮箱 -->
                  <div class="mb-4">
                    <label class="form-label fs-5">Email <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <input 
                        ref="emailInput"
                        type="email" 
                        v-model="user.email" 
                        v-validate="'required|email'"
                        name="email"
                        class="form-control form-control-lg py-3"
                        placeholder="Enter your email address"
                        :class="{ 
                          'is-invalid': submitted && errors.has('email'),
                          'border-danger': fieldError && fieldError.field === 'email'
                        }"
                        :disabled="emailVerified">
                      <button 
                        type="button" 
                        class="btn btn-primary send-code-btn"
                        @click="sendEmailVerification"
                        :disabled="!user.email || emailSending || emailVerified"
                        style="white-space: nowrap;">
                        <span v-if="emailSending">
                          <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                          <span class="d-none d-lg-inline">Sending...</span>
                          <span class="d-lg-none">...</span>
                        </span>
                        <span v-else-if="emailVerified">
                          <i class="fas fa-check-circle me-1"></i>
                          <span class="d-none d-lg-inline">Verified</span>
                          <span class="d-lg-none">✓</span>
                        </span>
                        <span v-else>
                          <i class="fas fa-paper-plane me-1 d-none d-lg-inline"></i>
                          <span class="d-none d-lg-inline">Send Code</span>
                          <span class="d-lg-none">Send</span>
                        </span>
                      </button>
                    </div>
                    <small class="form-text text-muted">Primary email for login and notifications (verification required)</small>
                    <div v-if="submitted && errors.has('email')" class="invalid-feedback fs-6">
                      {{ errors.first('email') }}
                    </div>
                    <div v-if="fieldError && fieldError.field === 'email'" class="invalid-feedback fs-6 d-block">
                      {{ fieldError.message }}
                    </div>
                  </div>

                  <!-- 邮箱验证码 -->
                  <div v-if="emailCodeSent && !emailVerified" class="mb-4">
                    <label class="form-label fs-5">Email Verification Code <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <input 
                        ref="emailVerificationCodeInput"
                        type="text" 
                        v-model="emailVerificationCode" 
                        v-validate="'required|numeric|length:6'"
                        name="emailVerificationCode"
                        class="form-control form-control-lg py-3"
                        placeholder="Enter 6-digit verification code"
                        maxlength="6"
                        :class="{ 
                          'is-invalid': submitted && errors.has('emailVerificationCode'),
                          'border-danger': fieldError && fieldError.field === 'emailVerificationCode'
                        }">
                      <button 
                        type="button" 
                        class="btn btn-success verify-email-btn"
                        @click="verifyEmailCode"
                        :disabled="!emailVerificationCode || emailVerificationCode.length !== 6 || emailVerifying"
                        style="white-space: nowrap;">
                        <span v-if="emailVerifying">
                          <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                          <span class="d-none d-lg-inline">Verifying...</span>
                          <span class="d-lg-none">...</span>
                        </span>
                        <span v-else>
                          <i class="fas fa-check-circle me-1 d-none d-lg-inline"></i>
                          <span class="d-none d-lg-inline">Verify Email</span>
                          <span class="d-lg-none">Verify</span>
                        </span>
                      </button>
                    </div>
                    <small class="form-text text-muted">
                      Code sent to {{ user.email }}. Check your inbox and spam folder.
                      <button 
                        type="button" 
                        class="btn btn-link btn-sm p-0 ms-2"
                        @click="resendEmailVerification"
                        :disabled="emailSending || resendCooldown > 0">
                        <span v-if="resendCooldown > 0">Resend in {{ resendCooldown }}s</span>
                        <span v-else>Resend Code</span>
                      </button>
                    </small>
                    <div v-if="submitted && errors.has('emailVerificationCode')" class="invalid-feedback fs-6">
                      {{ errors.first('emailVerificationCode') }}
                    </div>
                    <div v-if="fieldError && fieldError.field === 'emailVerificationCode'" class="invalid-feedback fs-6 d-block">
                      {{ fieldError.message }}
                    </div>
                  </div>

                  <!-- 密码 -->
                  <div class="mb-4">
                    <label class="form-label fs-5">Password</label>
                    <input 
                      type="password" 
                      v-model="user.password" 
                      v-validate="{ required: true, min: 6 }"
                      name="password"
                      class="form-control form-control-lg py-3"
                      placeholder="At least 6 characters"
                      :class="{ 'is-invalid': submitted && errors.has('password') }">
                    <div v-if="submitted && errors.has('password')" class="invalid-feedback fs-6">
                      {{ errors.first('password') }}
                    </div>
                  </div>

                  <!-- 图形验证码 -->
                  <div class="mb-4">
                    <label class="form-label fs-5">Security Code <span class="text-danger">*</span></label>
                    <div class="row g-2">
                      <div class="col-7">
                        <input 
                          ref="captchaInput"
                          type="text" 
                          v-model="captchaInput" 
                          v-validate="'required'"
                          name="captcha"
                          class="form-control form-control-lg py-3"
                          placeholder="Enter security code"
                          maxlength="4"
                          :class="{ 
                            'is-invalid': submitted && errors.has('captcha'),
                            'border-danger': fieldError && fieldError.field === 'captcha'
                          }">
                        <div v-if="submitted && errors.has('captcha')" class="invalid-feedback fs-6">
                          {{ errors.first('captcha') }}
                        </div>
                        <div v-if="fieldError && fieldError.field === 'captcha'" class="invalid-feedback fs-6 d-block">
                          {{ fieldError.message }}
                        </div>
                      </div>
                      <div class="col-5">
                        <div class="captcha-container" @click="refreshCaptcha" style="cursor: pointer;">
                          <div v-if="captchaLoading" class="captcha-loading">
                            <span class="spinner-border spinner-border-sm"></span>
                            Loading...
                          </div>
                          <div v-else-if="captchaSvg" v-html="captchaSvg" class="captcha-svg"></div>
                          <div v-else class="captcha-placeholder">
                            <i class="fas fa-sync-alt"></i> Click to load
                          </div>
                        </div>
                        <small class="form-text text-muted">Click to refresh</small>
                      </div>
                    </div>
                  </div>

                  <!-- 注册按钮 -->
                  <div class="d-grid gap-2">
                    <button 
                      class="btn btn-primary btn-lg py-3" 
                      type="submit" 
                      :disabled="status.registering || !emailVerified">
                      <span v-if="!status.registering">Create Account</span>
                      <span v-else>
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Registering...
                      </span>
                    </button>
                  </div>
                  
                  <!-- 验证状态提示 -->
                  <div v-if="!emailVerified" class="alert alert-warning mt-3" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Please verify your email address to enable account creation.
                  </div>
                </form>

                <!-- 登录链接 (与登录页对称) -->
                <div class="text-center mt-4">
                  <span class="text-muted fs-5 me-2">Already have an account?</span>
                  <router-link 
                    to="/login" 
                    class="text-primary fw-bold fs-5">
                    Sign In
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
            user: {
                fullname: '',
                username: '',
                email: '',
                password: '',
                identity: 'student' // 默认选择学生
            },
            submitted: false,
            // 邮箱验证相关
            emailCodeSent: false,
            emailVerificationCode: '',
            emailVerified: false,
            emailSending: false,
            emailVerifying: false,
            resendCooldown: 0,
            resendTimer: null,
            // 图形验证码相关
            captchaSvg: '',
            captchaInput: '',
            captchaLoading: false
        }
    },
    computed: {
        ...mapState('account', ['status']),
        ...mapState('alert', {
            alert: state => ({ type: state.type, message: state.message }),
            fieldError: state => state.fieldError
        }),
        // 计算所有验证错误
        validationErrors() {
            const errors = [];
            
            // 从alert store获取多个错误（如果后端返回errors数组）
            if (this.$store.state.alert.validationErrors && Array.isArray(this.$store.state.alert.validationErrors)) {
                errors.push(...this.$store.state.alert.validationErrors);
            }
            
            return errors.length > 0 ? errors : null;
        }
    },
    created() {
        // 注册自定义验证器：确保username不是邮箱格式
        this.$validator.extend('not_email', {
            validate: (value) => {
                // 邮箱格式的正则表达式
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !emailRegex.test(value);
            },
            message: 'Username cannot be in email format. Please use a different format.'
        });

        // 加载图形验证码
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
        }
    },
    beforeDestroy() {
        // 清理倒计时器
        if (this.resendTimer) {
            clearInterval(this.resendTimer);
        }
        // 清理窗口事件监听器
        window.removeEventListener('resize', this.handleResize);
    },
    methods: {
        ...mapActions('account', ['register']),
        
        // 加载图形验证码
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
                this.captchaSvg = '<div style="padding: 20px; background: #f0f0f0; text-align: center;">Failed to load</div>';
            } finally {
                this.captchaLoading = false;
            }
        },

        // 刷新图形验证码
        refreshCaptcha() {
            this.captchaInput = '';
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
            
            console.log(`Register Captcha scaling: container(${containerWidth}x${containerHeight}), svg(${svgWidth}x${svgHeight}), scale(${scale})`);
        },

        handleResize() {
            // 窗口大小改变时重新计算验证码缩放
            if (this.captchaSvg) {
                this.$nextTick(() => {
                    this.scaleCaptchaSvg();
                });
            }
        },

        // 发送邮箱验证码
        async sendEmailVerification() {
            if (!this.user.email) {
                this.$store.dispatch('alert/error', 'Please enter your email address first');
                return;
            }

            // 简单的邮箱格式验证
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.user.email)) {
                this.$store.dispatch('alert/error', 'Please enter a valid email address');
                return;
            }

            this.emailSending = true;
            try {
                const response = await axios.post('/api/email/send-verification', {
                    email: this.user.email,
                    userName: this.user.fullname || this.user.username,
                    type: 'registration' // 指定为注册类型
                }, {
                    withCredentials: true
                });

                if (response.data.success) {
                    this.emailCodeSent = true;
                    this.$store.dispatch('alert/success', 'Verification code sent to your email!');
                    this.startResendCooldown();
                } else {
                    throw new Error(response.data.message || 'Failed to send verification code');
                }
            } catch (error) {
                console.error('Failed to send email verification:', error);
                
                // 检查是否是"已验证"错误
                if (error.response?.data?.errors?.code === 'ALREADY_VERIFIED') {
                    // 如果验证码输入框还没显示，则显示它
                    if (!this.emailCodeSent) {
                        this.emailCodeSent = true;
                        this.$store.dispatch('alert/success', 'Email already verified. Please enter your verification code to proceed.');
                    } else {
                        // 如果验证码输入框已经显示，说明用户点击了"Resend Code"
                        this.$store.dispatch('alert/info', 'Email is already verified. Please use your existing verification code or try verifying with the code you received earlier.');
                    }
                } else {
                    const message = error.response?.data?.message || error.message || 'Failed to send verification code';
                    this.$store.dispatch('alert/error', message);
                }
            } finally {
                this.emailSending = false;
            }
        },

        // 重新发送邮箱验证码
        async resendEmailVerification() {
            if (!this.user.email) {
                this.$store.dispatch('alert/error', 'Please enter your email address first');
                return;
            }

            this.emailSending = true;
            try {
                const response = await axios.post('/api/email/send-verification', {
                    email: this.user.email,
                    userName: this.user.fullname || this.user.username,
                    type: 'registration',
                    isResend: true // 标记为重新发送
                }, {
                    withCredentials: true
                });

                if (response.data.success) {
                    // 重新发送成功，更新验证码
                    this.emailVerificationCode = '';
                    this.$store.dispatch('alert/success', 'New verification code sent to your email!');
                    this.startResendCooldown();
                } else {
                    throw new Error(response.data.message || 'Failed to resend verification code');
                }
            } catch (error) {
                console.error('Failed to resend email verification:', error);
                
                // 处理特定的错误情况
                if (error.response?.data?.errors?.code === 'ALREADY_VERIFIED_RECENT') {
                    const remainingMinutes = error.response.data.errors.remainingMinutes || 5;
                    this.$store.dispatch('alert/info', 
                        `Please use your existing verification code or wait ${remainingMinutes} more minutes to resend.`);
                } else {
                    const message = error.response?.data?.message || error.message || 'Failed to resend verification code';
                    this.$store.dispatch('alert/error', message);
                }
            } finally {
                this.emailSending = false;
            }
        },

        // 验证邮箱验证码
        async verifyEmailCode() {
            if (!this.emailVerificationCode || this.emailVerificationCode.length !== 6) {
                this.$store.dispatch('alert/error', 'Please enter the 6-digit verification code');
                return;
            }

            this.emailVerifying = true;
            try {
                const response = await axios.post('/api/email/verify-code', {
                    email: this.user.email,
                    code: this.emailVerificationCode,
                    type: 'registration' // 指定为注册类型
                }, {
                    withCredentials: true
                });

                if (response.data.success) {
                    this.emailVerified = true;
                    this.$store.dispatch('alert/success', 'Email verified successfully!');
                } else {
                    throw new Error(response.data.message || 'Email verification failed');
                }
            } catch (error) {
                console.error('Failed to verify email:', error);
                const message = error.response?.data?.message || error.message || 'Email verification failed';
                this.$store.dispatch('alert/error', message);
            } finally {
                this.emailVerifying = false;
            }
        },

        // 开始重发冷却倒计时
        startResendCooldown() {
            this.resendCooldown = 60; // 60秒冷却时间
            this.resendTimer = setInterval(() => {
                this.resendCooldown--;
                if (this.resendCooldown <= 0) {
                    clearInterval(this.resendTimer);
                    this.resendTimer = null;
                }
            }, 1000);
        },

        handleSubmit(e) {
            // clear any previous alerts
            this.$store.dispatch('alert/clear');
            this.submitted = true;

            // 检查邮箱是否已验证
            if (!this.emailVerified) {
                this.$store.dispatch('alert/error', 'Please verify your email address first');
                return;
            }

            // 检查图形验证码
            if (!this.captchaInput) {
                this.$store.dispatch('alert/error', 'Please enter the security code');
                return;
            }

            this.$validator.validate().then(valid => {
                if (valid) {
                    // 包含验证码信息的用户数据
                    const userData = {
                        ...this.user,
                        emailVerificationCode: this.emailVerificationCode,
                        captcha: this.captchaInput
                    };
                    
                    this.register(userData).catch((fieldError) => {
                        // Registration failed, refresh captcha for security
                        this.refreshCaptcha();
                        
                        // Focus on the error field if specified
                        if (fieldError && fieldError.field) {
                            this.$nextTick(() => {
                                this.focusErrorField(fieldError.field);
                            });
                        }
                    });
                }
            });
        },

        // 聚焦到错误字段
        focusErrorField(fieldName) {
            const fieldRefMap = {
                'username': 'usernameInput',
                'email': 'emailInput',
                'emailVerificationCode': 'emailVerificationCodeInput',
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
        },

        // 获取字段的显示名称
        getFieldDisplayName(fieldName) {
            const fieldDisplayNames = {
                'username': 'Username',
                'email': 'Email',
                'password': 'Password',
                'fullname': 'Full Name',
                'captcha': 'Security Code',
                'emailVerificationCode': 'Email Verification Code'
            };
            return fieldDisplayNames[fieldName] || fieldName;
        }
    }
};
</script>

<style scoped>
/* 继承登录页的所有样式 */
.card {
  min-width: 400px;
  border-radius: 12px !important;
}

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

/* 新增注册页特定样式 */
.btn-group .btn {
  transition: all 0.3s ease;
}

.btn-group .btn.active {
  background-color: #0d6efd;
  color: white;
  border-color: #0d6efd;
}

/* 图形验证码样式 */
.captcha-container {
  border: none;
  border-radius: 8px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  transition: all 0.3s ease;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
}

.captcha-svg {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-svg svg {
  border: none;
  background: transparent;
  border-radius: 8px;
  transform-origin: center center;
}

.captcha-loading,
.captcha-placeholder {
  color: #6c757d;
  font-size: 14px;
  text-align: center;
  background-color: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.captcha-placeholder i {
  margin-bottom: 5px;
  font-size: 16px;
}

/* 发送验证码按钮特殊样式 */
.send-code-btn {
  font-weight: 600 !important;
  padding: 12px 16px !important;
  transition: all 0.2s ease !important;
  min-width: fit-content !important;
}

.send-code-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 3px 8px rgba(13, 110, 253, 0.3) !important;
}

/* 验证邮箱按钮特殊样式 */
.verify-email-btn {
  font-weight: 600 !important;
  padding: 12px 16px !important;
  transition: all 0.2s ease !important;
  min-width: fit-content !important;
}

.verify-email-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 3px 8px rgba(25, 135, 84, 0.3) !important;
}

/* 输入组样式优化 */
.input-group .send-code-btn {
  border-left: 1px solid #0d6efd !important;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.input-group .verify-email-btn {
  border-left: 1px solid #198754 !important;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.input-group .form-control {
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.input-group .form-control:focus {
  border-right: none;
  box-shadow: none;
}

.input-group .form-control:focus + .btn-outline-primary,
.input-group .form-control:focus + .btn-outline-success {
  border-color: #86b7fe;
}

/* 验证按钮特殊样式 */
.btn-outline-success {
  color: #198754;
  border-color: #198754;
}

.btn-outline-success:hover {
  color: #fff;
  background-color: #198754;
  border-color: #198754;
}

.btn-outline-success:disabled {
  color: #198754;
  background-color: transparent;
  border-color: #198754;
  opacity: 0.65;
}

/* 验证状态样式 */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 自定义断点 - 1750px以下使用更宽布局 */
@media (max-width: 1750px) and (min-width: 1200px) {
  .col-xxl-4 {
    flex: 0 0 auto;
    width: 58.33333333%; /* 约7/12 */
  }
}

/* 响应式调整 */
@media (max-width: 992px) {
  /* 在lg断点以下显示简化按钮文字 */
  .send-code-btn,
  .verify-email-btn {
    padding: 10px 14px !important;
  }
}

@media (max-width: 768px) {
  .btn-group .btn {
    padding: 0.5rem;
    font-size: 1rem;
  }
  
  .captcha-container {
    height: 50px;
  }
  
  .card {
    min-width: auto;
  }
  
  /* 移动端按钮样式优化 */
  .send-code-btn,
  .verify-email-btn {
    padding: 10px 12px !important;
    font-size: 14px !important;
  }
  
  /* 输入组在移动端的样式 */
  .input-group .form-control {
    font-size: 16px; /* 防止iOS缩放 */
  }
}

@media (max-width: 576px) {
  .card-body {
    padding: 2rem !important;
  }
  
  .send-code-btn,
  .verify-email-btn {
    padding: 8px 10px !important;
    font-size: 13px !important;
  }
}

/* 验证成功状态 */
.text-success {
  color: #198754 !important;
}

/* 链接按钮样式 */
.btn-link {
  text-decoration: none !important;
  color: #0d6efd !important;
}

.btn-link:hover {
  color: #0a58ca !important;
  text-decoration: underline !important;
}
</style>