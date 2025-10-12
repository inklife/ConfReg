import { userService } from '../_services';
import router from '../_helpers/router';
import axios from 'axios';

const user = JSON.parse(localStorage.getItem('user'));
const state = user
    ? { status: { loggedIn: true }, user }
    : { status: {}, user: null };

const actions = {
    login({ dispatch, commit }, { username, password, captcha }) {
        console.log("log in");
        commit('loginRequest', { username });
        
        return userService.login(username, password, captcha)
            .then(
                user => {
                    console.log('Login successful, user:', user)
                    console.log('User is_superuser:', user.is_superuser)
                    console.log('User role:', user.role)
                    console.log('Admin check result:', user.is_superuser || user.role === 'admin')
                    commit('loginSuccess', user);
                    
                    // 立即检查用户身份，不等待
                    if (user.is_superuser || user.role === 'admin') {
                        console.log('管理员用户登录，立即设置跳转标志并显示跳转提示');
                        // 立即设置管理员跳转标志，避免路由守卫干预
                        sessionStorage.setItem('adminRedirect', 'true');
                        // 稍微延迟显示提示，确保session建立
                        setTimeout(() => {
                            dispatch('showAdminRedirectPrompt', user);
                        }, 500);
                    } else {
                        console.log('普通用户登录，跳转到 dashboard');
                        // 跳转到用户面板（dashboard）
                        router.push('/dashboard');
                    }
                    
                    return user; // 返回用户数据
                },
                error => {
                    console.log('Login failed:', error)
                    commit('loginFailure', error);
                    
                    // Parse error for field-specific handling
                    let fieldError = null;
                    let errorMessage = error;
                    
                    if (error && error.response && error.response.data) {
                        const responseData = error.response.data;
                        errorMessage = responseData.message || error;
                        
                        // Check for captcha-related errors
                        if (responseData.field === 'captcha' || 
                            errorMessage.includes('Invalid security code') || 
                            errorMessage.includes('Invalid captcha') ||
                            errorMessage.includes('captcha session')) {
                            fieldError = { field: 'captcha', message: errorMessage };
                        }
                    }
                    
                    dispatch('alert/error', errorMessage, { root: true });
                    if (fieldError) {
                        dispatch('alert/fieldError', fieldError, { root: true });
                    }
                    
                    // 重新抛出错误，让调用者可以捕获（包含字段错误信息）
                    throw fieldError || error;
                }
            );
    },
    
    // 新增：转换为管理员session
    async upgradeToAdminSession({ commit }, user) {
        try {
            console.log('Upgrading to admin session for user:', user.username);
            
            // 调用upgrade接口验证权限并设置跨路径session
            const upgradeResponse = await axios.get('/api/auth/upgrade', {
                withCredentials: true
            });
            
            if (!upgradeResponse.data.success) {
                throw new Error('管理员权限升级失败: ' + upgradeResponse.data.message);
            }
            
            console.log('Successfully upgraded to admin session');
            return upgradeResponse.data;
            
        } catch (error) {
            console.error('Failed to upgrade to admin session:', error);
            return Promise.reject(error);
        }
    },
    

    // 新增：显示管理员跳转提示
    showAdminRedirectPrompt({ dispatch }, user) {
        // 动态创建跳转提示组件
        const promptHtml = `
            <div id="admin-redirect-prompt" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    max-width: 500px;
                    width: 90%;
                    text-align: center;
                    position: relative;
                ">
                    <div style="
                        color: #007bff;
                        font-size: 48px;
                        margin-bottom: 20px;
                    ">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <h2 style="
                        color: #333;
                        margin-bottom: 15px;
                        font-size: 24px;
                        font-weight: 600;
                    ">Administrator Access Detected</h2>
                    <p style="
                        color: #666;
                        margin-bottom: 30px;
                        font-size: 16px;
                        line-height: 1.5;
                    ">
                        Administrator privileges detected.<br>
                        Redirecting to admin panel in <span id="countdown" style="color: #007bff; font-weight: bold;">3</span> seconds.
                    </p>
                    <div style="
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                        align-items: center;
                    ">
                        <button id="goto-admin" style="
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: background 0.3s;
                        " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                            Go to Admin
                        </button>
                        <button id="stay-user" style="
                            background: transparent;
                            color: #666;
                            border: 2px solid #ddd;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.3s;
                        " onmouseover="this.style.borderColor='#007bff'; this.style.color='#007bff'" onmouseout="this.style.borderColor='#ddd'; this.style.color='#666'">
                            Continue as User
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 插入HTML到页面
        const promptElement = document.createElement('div');
        promptElement.innerHTML = promptHtml;
        document.body.appendChild(promptElement);
        
        // 倒计时逻辑
        let countdown = 3;
        const countdownElement = document.getElementById('countdown');
        const timer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            if (countdown <= 0) {
                clearInterval(timer);
                // 执行管理员权限升级
                dispatch('upgradeToAdminSession', user).then((upgradeData) => {
                    // 清理跳转标志
                    sessionStorage.removeItem('adminRedirect');
                    // 移除提示框
                    const prompt = document.getElementById('admin-redirect-prompt');
                    if (prompt) {
                        prompt.remove();
                    }
                    // 跳转到管理后台
                    if (upgradeData.redirectUrl) {
                        window.location.replace(upgradeData.redirectUrl);
                    } else {
                        window.location.replace('/admin/backend/');
                    }
                }).catch((error) => {
                    console.error('权限升级失败:', error);
                    // 权限验证失败，跳转到用户面板
                    sessionStorage.removeItem('adminRedirect');
                    const prompt = document.getElementById('admin-redirect-prompt');
                    if (prompt) {
                        prompt.remove();
                    }
                    router.push('/dashboard');
                });
            }
        }, 1000);
        
        // 按钮事件处理
        const gotoAdminBtn = document.getElementById('goto-admin');
        const stayUserBtn = document.getElementById('stay-user');
        
        if (gotoAdminBtn) {
            gotoAdminBtn.onclick = () => {
                clearInterval(timer);
                // 执行管理员权限升级
                dispatch('upgradeToAdminSession', user).then((upgradeData) => {
                    // 清理跳转标志
                    sessionStorage.removeItem('adminRedirect');
                    // 移除提示框
                    const prompt = document.getElementById('admin-redirect-prompt');
                    if (prompt) {
                        prompt.remove();
                    }
                    // 跳转到管理后台
                    if (upgradeData.redirectUrl) {
                        window.location.replace(upgradeData.redirectUrl);
                    } else {
                        window.location.replace('/admin/backend/');
                    }
                }).catch((error) => {
                    console.error('权限升级失败:', error);
                    // 权限验证失败，跳转到用户面板
                    sessionStorage.removeItem('adminRedirect');
                    const prompt = document.getElementById('admin-redirect-prompt');
                    if (prompt) {
                        prompt.remove();
                    }
                    router.push('/dashboard');
                });
            };
        }
        
        if (stayUserBtn) {
            stayUserBtn.onclick = () => {
                clearInterval(timer);
                // 清理跳转标志
                sessionStorage.removeItem('adminRedirect');
                // 移除提示框
                const prompt = document.getElementById('admin-redirect-prompt');
                if (prompt) {
                    prompt.remove();
                }
                // 跳转到用户面板
                router.push('/dashboard');
            };
        }
    },
    
    logout({ commit }) {
        // 在登出前清理所有会议注册相关的localStorage数据
        const keysToRemove = [
            'conferenceProductSelection',
            'conferenceProofFile', 
            'conferenceUserInfo',
            'conferencePaymentInfo',
            'conferencePaymentMethod',
            'conferencePaymentProof',
            'conferenceSubmissionData',
            'conferenceRegistrationData',
            'conferenceRegistrationComplete',
            'conferenceRegistrationId',
            'lastConferenceUserId'
        ];
        
        // 清理所有可能带用户ID后缀的数据
        const allKeys = Object.keys(localStorage);
        let cleanedCount = 0;
        
        allKeys.forEach(key => {
            // 清理所有会议相关的键（包括带用户ID和注册记录ID的）
            if (keysToRemove.some(baseKey => key.startsWith(baseKey))) {
                localStorage.removeItem(key);
                cleanedCount++;
                console.log('Cleared:', key);
            }
            // 清理所有DocumentManagement相关的键
            if (key.startsWith('documentTasks_') || key === 'documentTasks' || key === 'documentPendingTasks') {
                localStorage.removeItem(key);
                cleanedCount++;
                console.log('Cleared:', key);
            }
        });
        
        console.log(`Conference and Document data cleared on logout (${cleanedCount} items removed)`);
        
        userService.logout();
        commit('logout');
    },
    register({ dispatch, commit }, user) {
        commit('registerRequest', user);
        
        userService.register(user)
            .then(
                user => {
                    console.log('Registration successful for user:', user);
                    commit('registerSuccess', user);
                    
                    // Show success message first
                    dispatch('alert/success', 'Registration successful! Please login with your credentials.', { root: true });
                    
                    // Navigate to login page after a short delay
                    setTimeout(() => {
                        router.push('/login');
                    }, 1000);
                },
                error => {
                    console.error('Registration failed:', error);
                    commit('registerFailure', error);
                    
                    // Parse and display user-friendly error message
                    let errorMessage = 'Registration failed. Please try again.';
                    let fieldError = null;
                    let responseData = null;
                    
                    if (error && error.response) {
                        responseData = error.response.data;
                        
                        // Handle errors array from backend validation
                        if (responseData && responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
                            // If there are multiple errors, show them all
                            if (responseData.errors.length > 1) {
                                const formattedErrors = responseData.errors.map(err => ({
                                    field: err.path || err.field,
                                    message: err.msg || err.message
                                }));
                                
                                // Set validation errors for detailed display
                                dispatch('alert/validationErrors', formattedErrors, { root: true });
                                
                                // Also set a general error message
                                errorMessage = 'Please correct the following validation errors:';
                                dispatch('alert/error', errorMessage, { root: true });
                                
                                // Set field error for the first error to trigger focus
                                const firstError = formattedErrors[0];
                                fieldError = { field: firstError.field, message: firstError.message };
                                dispatch('alert/fieldError', fieldError, { root: true });
                            } else {
                                // Single error - handle as before
                                const firstError = responseData.errors[0];
                                const fieldName = firstError.path || firstError.field;
                                const errorMsg = firstError.msg || firstError.message;
                                
                                // Set specific error message and field
                                errorMessage = errorMsg;
                                fieldError = { field: fieldName, message: errorMsg };
                                
                                // Override with more user-friendly messages for specific fields
                                if (fieldName === 'username') {
                                    if (errorMsg.includes('spaces') || errorMsg.includes('contain')) {
                                        errorMessage = 'Username cannot contain spaces. Please use letters, numbers, hyphens, or underscores only.';
                                        fieldError.message = errorMessage;
                                    } else if (errorMsg.includes('already taken') || errorMsg.includes('exists')) {
                                        errorMessage = 'This username is already taken, please choose another one';
                                        fieldError.message = errorMessage;
                                    }
                                } else if (fieldName === 'email') {
                                    if (errorMsg.includes('already exists') || errorMsg.includes('registered')) {
                                        errorMessage = 'This email is already registered, please use another email or try to login';
                                        fieldError.message = errorMessage;
                                    }
                                } else if (fieldName === 'captcha') {
                                    errorMessage = 'Invalid security code, please refresh and try again';
                                    fieldError.message = errorMessage;
                                } else if (fieldName === 'emailVerificationCode') {
                                    errorMessage = 'Invalid or expired email verification code, please request a new code';
                                    fieldError.message = errorMessage;
                                }
                                
                                // Dispatch both general error and field-specific error
                                dispatch('alert/error', errorMessage, { root: true });
                                dispatch('alert/fieldError', fieldError, { root: true });
                            }
                        } else if (responseData && responseData.message) {
                            // Handle single message format
                            errorMessage = responseData.message;
                            
                            // Convert specific error messages to more user-friendly format and set field error
                            if (responseData.field === 'username' && responseData.message.includes('already taken')) {
                                errorMessage = 'This username is already taken, please choose another one';
                                fieldError = { field: 'username', message: errorMessage };
                            } else if (responseData.field === 'email' && responseData.message.includes('already exists')) {
                                errorMessage = 'This email is already registered, please use another email or try to login';
                                fieldError = { field: 'email', message: errorMessage };
                            } else if (responseData.field === 'captcha' || responseData.message.includes('Invalid security code') || responseData.message.includes('Invalid captcha')) {
                                errorMessage = 'Invalid security code, please refresh and try again';
                                fieldError = { field: 'captcha', message: errorMessage };
                            } else if (responseData.message.includes('Invalid email verification code')) {
                                errorMessage = 'Invalid or expired email verification code, please request a new code';
                                fieldError = { field: 'emailVerificationCode', message: errorMessage };
                            }
                        }
                    } else if (typeof error === 'string') {
                        errorMessage = error;
                    }
                    
                    // Only dispatch single error if not already handled as validation errors
                    if (!responseData || !responseData.errors || responseData.errors.length <= 1) {
                        if (!fieldError) {
                            dispatch('alert/error', errorMessage, { root: true });
                        }
                        if (fieldError) {
                            dispatch('alert/fieldError', fieldError, { root: true });
                        }
                    }
                    
                    // Return field error info for component to handle focus
                    return Promise.reject(fieldError || { message: errorMessage });
                }
            );
    }
};

const mutations = {
    loginRequest(state, user) {
        state.status = { loggingIn: true };
        state.user = user;
    },
    loginSuccess(state, user) {
        console.log('2');
        state.status = { loggedIn: true };
        state.user = user;
        console.log(user)
    },
    loginFailure(state) {
        state.status = {};
        state.user = null;
    },
    logout(state) {
        state.status = {};
        state.user = null;
    },
    registerRequest(state, user) {
        state.status = { registering: true };
    },
    registerSuccess(state, user) {
        state.status = {};
    },
    registerFailure(state, error) {
        state.status = {};
    }
};

export const account = {
    namespaced: true,
    state,
    actions,
    mutations
};