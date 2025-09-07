/**
 * Legacy Admin Functions
 * 为保持向后兼容性而提供的传统函数接口
 * 这些函数将调用新的Web Components
 */

// 全局变量，用于兼容原有代码
let adminApp = null;
let currentTab = 'dashboard';

// 页面加载完成后的初始化函数
function initializeAdmin() {
    console.log('Legacy initializeAdmin called - Web Components will handle initialization');
    
    // 等待 AdminApp 实例创建
    setTimeout(() => {
        adminApp = document.querySelector('admin-app');
        if (adminApp) {
            console.log('AdminApp instance found');
        }
    }, 1000);
}

// 显示标签页
function showTab(tabName) {
    if (adminApp && adminApp.components && adminApp.components.navigation) {
        adminApp.components.navigation.setActiveTab(tabName);
        adminApp.components.contentManager.showTab(tabName);
        currentTab = tabName;
    } else {
        console.warn('AdminApp not ready for showTab:', tabName);
    }
}

// 退出登录
function logout() {
    if (adminApp) {
        adminApp.handleLogout();
    } else {
        // Fallback
        window.location.href = '/admin/login.html';
    }
}

// 显示消息
function showMessage(message, type = 'info') {
    if (adminApp) {
        adminApp.showMessage(message, type);
    } else {
        // Fallback
        alert(message);
    }
}

// 加载仪表盘数据
function loadDashboardData() {
    if (adminApp && adminApp.components && adminApp.components.dashboard) {
        adminApp.components.dashboard.refresh();
    }
}

// 刷新当前标签页
function refreshCurrentTab() {
    if (adminApp) {
        adminApp.refreshCurrentTab();
    }
}

// 获取当前标签页
function getCurrentTab() {
    return adminApp ? adminApp.getCurrentTab() : currentTab;
}

// 为了兼容性，保留一些空的事件监听器设置函数
function setupEventListeners() {
    console.log('Legacy setupEventListeners called - Web Components handle events internally');
}

// API请求封装（兼容原有代码）
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// 导出函数供全局使用
window.initializeAdmin = initializeAdmin;
window.showTab = showTab;
window.logout = logout;
window.showMessage = showMessage;
window.loadDashboardData = loadDashboardData;
window.refreshCurrentTab = refreshCurrentTab;
window.getCurrentTab = getCurrentTab;
window.setupEventListeners = setupEventListeners;
window.apiRequest = apiRequest;

console.log('Legacy admin functions loaded');
