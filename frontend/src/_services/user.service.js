import config from 'config';
import { authHeader } from '../_helpers';
import { clearAllUserData } from '../_helpers/router';
import axios from 'axios'
import { join } from 'path';
export const userService = {
    login,
    logout,
    register,
    // testLogin,
    transferRegistration,
    getTransferHistory,
    getUserProfile,
    updateProfile, // Add new method
    changePassword, // Add new method
    checkRegistrationStatus,
    checkTransferStatus, // Add new method
    // Refund related methods
    getApprovedRegistrations,
    checkRefundEligibility,
    submitRefundRequest,
    getRefundHistory,
    // Backup email management methods
    getEmailInfo,
    addBackupEmail,
    verifyBackupEmail,
    setBackupAsPrimary,
    deleteBackupEmail,
    resendBackupVerification,
    // Username update methods
    getUsernameUpdateStatus,
    sendUsernameVerification,
    updateUsername,
    checkUsernameAvailability,
    getUsernameSuggestions
};

function login(username, password, captcha) {
    // 构建请求数据，只有在提供captcha时才包含它
    const requestData = {
        username: username,
        password: password
    };
    
    if (captcha) {
        requestData.captcha = captcha;
    }
    
    // 使用完整路径
    return axios.post('/api/auth/login', requestData, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
    })
    .then(handleResponse)
    .then(user => {
        // login successful if there's a user in the response
        console.log('Login response:', user);
        if (user) {
            // store user details in local storage to keep user logged in between page refreshes
            localStorage.setItem('user', JSON.stringify(user));
        }
        return user;
    })
    .catch(error => {
        console.log('Login error caught:', error);
        // 检查是否是axios错误
        if (error.response) {
            // 服务器返回了错误状态码
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Login failed';
            console.log('Server error:', errorMessage);
            // 抛出完整的error对象，包含response信息
            const enhancedError = new Error(errorMessage);
            enhancedError.response = error.response;
            throw enhancedError;
        } else if (error.request) {
            // 请求发送失败
            console.log('Network error:', error.request);
            throw new Error('Network error: Unable to connect to server');
        } else {
            // 其他错误
            console.log('Other error:', error.message);
            throw new Error(error.message || 'Login failed');
        }
    });        
}

function logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('user');
    // 使用完整路径
    return axios.post('/api/auth/logout', {}, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    }).then(handleResponse);
}

function register(user) {
    // 构造后端期待的JSON数据
    const requestData = {
        username: user.username,
        password: user.password,
        email: user.email,
        fullname: user.fullname || '',  // 使用fullname
        emailVerificationCode: user.emailVerificationCode, // 邮箱验证码
        captcha: user.captcha // 图形验证码
    };
    
    // 使用完整路径
    return axios.post('/api/auth/register', requestData, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(handleResponse2)
    .catch(error => {
        // Enhanced error handling for better user experience
        console.error('Registration error:', error);
        
        if (error.response) {
            // Server responded with error status
            const errorResponse = error.response;
            const errorData = errorResponse.data;
            
            // Create enhanced error object with response data
            const enhancedError = new Error(errorData.message || 'Registration failed');
            enhancedError.response = errorResponse;
            enhancedError.field = errorData.field;
            
            throw enhancedError;
        } else if (error.request) {
            // Network error
            throw new Error('Network error: Unable to connect to server');
        } else {
            // Other error
            throw new Error(error.message || 'Registration failed');
        }
    });
}

// Transfer registration to another person
function transferRegistration(transferData) {
    // 使用完整路径
    return axios.post('/api/users/transfer-registration', transferData, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Attendee change failed';
        }
    })
    .catch(error => {
        console.error('Transfer registration error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Attendee change failed';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Attendee change failed';
        }
    });
}

// Get transfer history
function getTransferHistory() {
    // 使用完整路径
    return axios.get('/api/users/transfer-history', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to get transfer history';
        }
    })
    .catch(error => {
        console.error('Get transfer history error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to get transfer history';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to get transfer history';
        }
    });
}

// Get user profile
function getUserProfile() {
    // 使用完整路径
    return axios.get('/api/users/profile', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to get user profile';
        }
    })
    .catch(error => {
        console.error('Get user profile error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to get user profile';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to get user profile';
        }
    });
}

// Update user profile
function updateProfile(userInfo) {
    // 构建请求数据，包含所有字段
    const requestData = {
        fullname: userInfo.name,
        affiliation: userInfo.affiliation,
        phone: userInfo.phone
        // 注意：不包含email，因为email是登录凭证，不允许随意修改
    };
    
    // 如果提供了firstName和lastName，添加到请求中
    if (userInfo.firstName !== undefined) {
        requestData.firstName = userInfo.firstName;
    }
    if (userInfo.lastName !== undefined) {
        requestData.lastName = userInfo.lastName;
    }
    
    // 使用完整路径
    return axios.put('/api/users/profile', requestData, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to update user profile';
        }
    })
    .catch(error => {
        console.error('Update user profile error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to update user profile';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to update user profile';
        }
    });
}

// Change password
function changePassword(passwordData) {
    // 使用完整路径
    return axios.put('/api/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
    }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to change password';
        }
    })
    .catch(error => {
        console.error('Change password error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to change password';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to change password';
        }
    });
}

// Check registration status
function checkRegistrationStatus() {
    console.log('=== userService.checkRegistrationStatus 开始调用 ===');
    // 使用完整路径
    return axios.get('/api/submissions/check-registration', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        console.log('=== userService.checkRegistrationStatus 收到响应 ===');
        console.log('response.data:', response.data);
        console.log('response.data.images:', response.data.images);
        console.log('typeof response.data.images:', typeof response.data.images);
        
        if (response.data.success === true) {
            console.log('=== 返回成功响应数据 ===');
            return response.data;
        } else {
            throw response.data.message || 'Failed to check registration status';
        }
    })
    .catch(error => {
        console.error('Check registration status error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to check registration status';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to check registration status';
        }
    });
}

// Check transfer status
function checkTransferStatus() {
    // 使用完整路径
    return axios.get('/api/users/transfer-status', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to check transfer status';
        }
    })
    .catch(error => {
        console.error('Check transfer status error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to check transfer status';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to check transfer status';
        }
    });
}

// Get user's approved registrations (使用users/approved-registrations端点)
function getApprovedRegistrations() {
    return axios.get('/api/users/approved-registrations', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to get approved registrations';
        }
    })
    .catch(error => {
        console.error('Get approved registrations error:', error);
        if (error.response) {
            throw error.response.data.message || error.response.statusText;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to get approved registrations';
        }
    });
}

// Check refund eligibility for a specific registration
function checkRefundEligibility(registrationId) {
    return axios.get(`/api/submissions/refund-eligibility/${registrationId}`, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to check refund eligibility';
        }
    })
    .catch(error => {
        console.error('Check refund eligibility error:', error);
        if (error.response) {
            throw error.response.data.message || error.response.statusText;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to check refund eligibility';
        }
    });
}

// Submit refund request
function submitRefundRequest(refundData) {
    return axios.post('/api/submissions/refund-request', refundData, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to submit refund request';
        }
    })
    .catch(error => {
        console.error('Submit refund request error:', error);
        if (error.response) {
            // 抛出完整的错误对象而不是只抛出消息
            throw error;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to submit refund request';
        }
    });
}

// Get refund history
function getRefundHistory() {
    return axios.get('/api/submissions/refund-history', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to get refund history';
        }
    })
    .catch(error => {
        console.error('Get refund history error:', error);
        if (error.response) {
            throw error.response.data.message || error.response.statusText;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to get refund history';
        }
    });
}

function handleResponse(response) {
    console.log('Response:', response);
    console.log('Response data:', response.data);
    
    if (response.status !== 200) {
        console.log('Non-200 status:', response.status);
        if (response.status === 401) {
            console.log('401 detected, clearing user data and redirecting to login');
            clearAllUserData();
            // 确保页面重定向到登录页面
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        const error = (response.data && response.data.message) || response.statusText;
        return Promise.reject(error);
    }
    
    // Handle new backend response format
    if (response.data.success === true) {
        return Promise.resolve(response.data.user);
    } else if (response.data.success === false) {
        return Promise.reject(response.data.message);
    }
    
    // Fallback for old format
    if (response.data.status === 0) {
        return Promise.resolve(response.data.username);
    } else {
        return Promise.reject(response.data.message);
    }
}

function handleResponse2(response) {
    console.log('Register response:', response);
    console.log('Register response body:', response.body);
    console.log('Register response data:', response.data);
    
    // Check for successful status codes (200 or 201)
    if (response.status !== 200 && response.status !== 201) {
        console.log('Non-success status:', response.status, response.statusText);
        if (response.status === 401) {
            console.log('401 detected in handleResponse2, clearing user data and redirecting to login');
            clearAllUserData();
            // 确保页面重定向到登录页面
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        const error = (response.data && response.data.message) || response.statusText;
        return Promise.reject(error);
    }
    
    // Handle new backend response format for registration
    if (response.data.success === true) {
        console.log('Registration successful with new format');
        return Promise.resolve(response.data.user);
    } else if (response.data.success === false) {
        console.log('Registration failed with new format:', response.data.message);
        return Promise.reject(response.data.message);
    }
    
    // Fallback for old format
    console.log('Checking old format, status:', response.data.status);
    if (response.data.status == 0) {
        return Promise.resolve(response.data.username);
    } else {
        console.log('Registration failed with old format');
        return Promise.reject(response.data.message);
    }
}

// Backup email management functions
function getEmailInfo() {
    return axios.get('/api/backup-email/email-info', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to get email info';
        }
    })
    .catch(error => {
        console.error('Get email info error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to get email info';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to get email info';
        }
    });
}

function addBackupEmail(backupEmail) {
    return axios.post('/api/backup-email/add-backup-email', {
        backupEmail: backupEmail
    }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to add backup email';
        }
    })
    .catch(error => {
        console.error('Add backup email error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to add backup email';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to add backup email';
        }
    });
}

function verifyBackupEmail(verificationCode) {
    return axios.post('/api/backup-email/verify-backup-email', {
        verificationCode: verificationCode
    }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to verify backup email';
        }
    })
    .catch(error => {
        console.error('Verify backup email error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to verify backup email';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to verify backup email';
        }
    });
}

function setBackupAsPrimary() {
    return axios.post('/api/backup-email/set-backup-as-primary', {}, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to set backup email as primary';
        }
    })
    .catch(error => {
        console.error('Set backup as primary error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to set backup email as primary';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to set backup email as primary';
        }
    });
}

function deleteBackupEmail() {
    return axios.delete('/api/backup-email/backup-email', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to delete backup email';
        }
    })
    .catch(error => {
        console.error('Delete backup email error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to delete backup email';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to delete backup email';
        }
    });
}

function resendBackupVerification() {
    return axios.post('/api/backup-email/resend-backup-verification', {}, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to resend verification email';
        }
    })
    .catch(error => {
        console.error('Resend backup verification error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to resend verification email';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to resend verification email';
        }
    });
}

// Username update functions
function getUsernameUpdateStatus() {
    return axios.get('/api/users/username-update-status', {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to check username update status';
        }
    })
    .catch(error => {
        console.error('Get username update status error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to check username update status';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to check username update status';
        }
    });
}

function sendUsernameVerification() {
    return axios.post('/api/users/send-username-verification', {}, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to send verification code';
        }
    })
    .catch(error => {
        console.error('Send username verification error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to send verification code';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to send verification code';
        }
    });
}

function updateUsername(newUsername, verificationCode) {
    return axios.put('/api/users/update-username', {
        newUsername: newUsername,
        verificationCode: verificationCode
    }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to update username';
        }
    })
    .catch(error => {
        console.error('Update username error:', error);
        if (error.response && error.response.data) {
            const responseData = error.response.data;
            
            // 如果有具体的验证错误，返回详细信息
            if (responseData.errors && responseData.errors.length > 0) {
                const errorMessages = responseData.errors.map(err => err.msg || err.message || err).join('; ');
                const errorWithSuggestions = {
                    message: errorMessages,
                    suggestions: responseData.suggestions || null
                };
                throw errorWithSuggestions;
            }
            
            // 如果有建议，包含建议信息
            if (responseData.suggestions) {
                const errorWithSuggestions = {
                    message: responseData.message || 'Username validation failed',
                    suggestions: responseData.suggestions
                };
                throw errorWithSuggestions;
            }
            
            throw responseData.message || 'Failed to update username';
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to update username';
        }
    });
}

function checkUsernameAvailability(username) {
    return axios.post('/api/users/check-username', {
        username: username
    }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to check username availability';
        }
    })
    .catch(error => {
        console.error('Check username availability error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to check username availability';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to check username availability';
        }
    });
}

function getUsernameSuggestions(username) {
    return axios.post('/api/users/username-suggestions', {
        username: username
    }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.data.success === true) {
            return response.data;
        } else {
            throw response.data.message || 'Failed to get username suggestions';
        }
    })
    .catch(error => {
        console.error('Get username suggestions error:', error);
        if (error.response) {
            const errorMessage = (error.response.data && error.response.data.message) || error.response.statusText || 'Failed to get username suggestions';
            throw errorMessage;
        } else if (error.request) {
            throw 'Network error: Unable to connect to server';
        } else {
            throw error.message || 'Failed to get username suggestions';
        }
    });
}