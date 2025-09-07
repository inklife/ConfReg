// 登录页面JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 简化页面检查逻辑 - 只在登录页面执行登录相关功能
    if (window.location.pathname === '/admin/login.html') {
        console.log('Admin login page detected, initializing login functionality');
        
        // 在登录页面不自动检查认证状态，让用户主动登录
        // checkAuthStatus();
        
        // 检查记住密码
        checkRememberedCredentials();
        
        // 添加表单提交事件监听器
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // 添加密码显示/隐藏切换事件监听器
        const togglePasswordBtn = document.getElementById('toggle-password-btn');
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', togglePassword);
        }
        
        // 添加忘记密码功能
        // const forgotPasswordLink = document.getElementById('forgot-password-link');
        // if (forgotPasswordLink) {
        //     forgotPasswordLink.addEventListener('click', function(e) {
        //         e.preventDefault();
        //         showForgotPasswordModal();
        //     });
        // }
        
        // 添加模态框关闭功能
        const closeModal = document.getElementById('close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', hideForgotPasswordModal);
        }
        
        // 添加邮件重置表单监听器
        const emailResetForm = document.getElementById('email-reset-form');
        if (emailResetForm) {
            emailResetForm.addEventListener('submit', handleEmailReset);
        }
        
        // 点击模态框外部关闭
        const modal = document.getElementById('forgot-password-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    hideForgotPasswordModal();
                }
            });
        }
    } else {
        // 在其他管理员页面才检查认证状态
        checkAuthStatus();
    }
});

// 检查登录状态
async function checkAuthStatus() {
    try {
        const response = await fetch('/admin/auth/me');
        const data = await response.json();
        
        if (response.ok && data.success) {
            const user = data.user;
            const isAdmin = user.role === 'admin' || 
                           user.is_superuser === true ||
                           user.username === 'admin';
            
            if (isAdmin) {
                // 只有在不是登录页面时才自动跳转
                if (window.location.pathname !== '/admin/login.html') {
                    window.location.href = '/admin/backend/';
                }
            }
        }
    } catch (error) {
        // 未登录，继续显示登录页面
        console.log('未登录，显示登录页面');
    }
}

// 检查记住的凭据
function checkRememberedCredentials() {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    
    if (rememberedUsername) {
        document.getElementById('username').value = rememberedUsername;
        document.getElementById('remember').checked = true;
    }
    
    if (rememberedPassword) {
        document.getElementById('password').value = rememberedPassword;
    }
}

// 处理登录表单提交
async function handleLogin(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Login form submitted, handling with JavaScript');
    
    const form = event.target;
    const formData = new FormData(form);
    const loginBtn = document.getElementById('login-btn');
    
    // 获取表单数据
    const username = formData.get('username').trim();
    const password = formData.get('password');
    const remember = formData.get('remember') === 'on';
    
    // 验证输入
    if (!username) {
        showError('请输入用户名');
        return;
    }
    
    if (!password) {
        showError('请输入密码');
        return;
    }
    
    try {
        // 显示加载状态
        setLoading(true);
        
        // 发送登录请求
        const response = await fetch('/admin/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // 登录成功
            showSuccess('登录成功，正在跳转...');
            
            // 处理记住密码
            if (remember) {
                localStorage.setItem('rememberedUsername', username);
                localStorage.setItem('rememberedPassword', password);
            } else {
                localStorage.removeItem('rememberedUsername');
                localStorage.removeItem('rememberedPassword');
            }
            
            // 检查用户角色 - 增强兼容性检查
            const user = data.user;
            const isAdmin = user.role === 'admin' || 
                           user.is_superuser === true ||
                           user.username === 'admin';
            
            if (isAdmin) {
                // 延迟跳转，让用户看到成功消息
                setTimeout(() => {
                    // 清除URL参数并跳转到管理后台
                    window.location.replace('/admin/backend/');
                }, 1000);
            } else {
                showError('您没有管理员权限');
                setLoading(false);
            }
        } else {
            // 登录失败
            showError(data.message || '登录失败，请检查用户名和密码');
            setLoading(false);
        }
        
    } catch (error) {
        console.error('登录请求失败:', error);
        showError('网络连接失败，请稍后重试');
        setLoading(false);
    }
}

// 设置加载状态
function setLoading(loading) {
    const loginBtn = document.getElementById('login-btn');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    
    if (loading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
        username.disabled = true;
        password.disabled = true;
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
        username.disabled = false;
        password.disabled = false;
    }
}

// 显示错误消息
function showError(message) {
    hideMessages();
    
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

// 显示成功消息
function showSuccess(message) {
    hideMessages();
    
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// 隐藏所有消息
function hideMessages() {
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';
}

// 切换密码显示/隐藏
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggle-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// 键盘事件处理
document.addEventListener('keydown', function(event) {
    // 按 Enter 键提交表单
    if (event.key === 'Enter' && !event.shiftKey) {
        const form = document.querySelector('.login-form');
        const loginBtn = document.getElementById('login-btn');
        
        if (!loginBtn.disabled) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// 输入框焦点处理
document.getElementById('username').addEventListener('focus', hideMessages);
document.getElementById('password').addEventListener('focus', hideMessages);

// 表单验证
document.getElementById('username').addEventListener('input', function(e) {
    const value = e.target.value.trim();
    if (value.length > 0) {
        e.target.setCustomValidity('');
    }
});

document.getElementById('password').addEventListener('input', function(e) {
    const value = e.target.value;
    if (value.length > 0) {
        e.target.setCustomValidity('');
    }
});


function showForgotPasswordModal() {
    document.getElementById('forgot-password-modal').style.display = 'block';
    resetForgotPasswordForm();
}

function hideForgotPasswordModal() {
    document.getElementById('forgot-password-modal').style.display = 'none';
    resetForgotPasswordForm();
}

async function handleEmailReset(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email) {
        showErrorMessage('Please enter your email address');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const response = await fetch('/admin/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessMessage(data.message);
            hideForgotPasswordModal();
        } else {
            showErrorMessage(data.message || 'Failed to send reset email');
        }
    } catch (error) {
        showErrorMessage('Network error, please try again later');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Reset Email';
    }
}

function resetForgotPasswordForm() {
    document.getElementById('reset-email').value = '';
}
