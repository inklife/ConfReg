import BaseComponent from './base-component.js';
import AdminHeader from '../layout/admin-header.js';
import AdminNavigation from '../layout/admin-navigation.js';
import ContentManager from './content-manager.js';
import AdminDashboard from '../pages/admin-dashboard.js';
import MessageNotification from './message-notification.js';

/**
 * 主应用管理器
 * 协调所有组件的工作，处理全局状态和事件
 */
class AdminApp extends BaseComponent {
    constructor() {
        super();
        this.isAuthenticated = false;
        this.currentUser = null;
        this.currentState = 'initializing'; // 'initializing', 'admin', 'error'
        this.components = {};
        this.currentPage = '';
        this.isNavigating = false; // 防止重复导航
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: flex;
                flex-direction: column;
                height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: #f8f9fa;
                overflow: hidden;
            }

            .admin-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow: hidden;
            }

            .admin-header {
                flex-shrink: 0;
            }

            .admin-navigation {
                flex-shrink: 0;
            }

            .admin-main {
                flex: 1;
                overflow: hidden;
                position: relative;
            }

            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(5px);
            }

            .loading-content {
                text-align: center;
                color: #495057;
            }

            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid #e9ecef;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        this.shadowRoot.appendChild(style);
        
        // 检查认证状态
        this.checkAuthentication();
    }

    async checkAuthentication() {
        try {
            this.showLoading('检查登录状态...');
            console.log('Checking authentication...');
            
            const response = await this.request('/admin/auth/me');
            console.log('Auth check response:', response);
            
            if (response.success === true && response.user) {
                this.isAuthenticated = true;
                this.currentUser = response.user;
                console.log('Authentication successful, user:', this.currentUser);
                this.renderAdminInterface();
            } else {
                console.log('Authentication failed, redirecting to admin index page');
                window.location.href = '/admin/index.html';
                return;
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            
            console.log('Redirecting to admin login page due to authentication error');
            window.location.href = '/admin/login.html';
            return;
        } finally {
            this.hideLoading();
        }
    }

    renderAdminInterface() {
        // 防止重复渲染管理员界面
        if (this.currentState === 'admin') {
            console.log('Admin interface already rendered, skipping');
            return;
        }

        this.currentState = 'admin';
        console.log('Rendering admin interface for user:', this.currentUser);

        const container = document.createElement('div');
        container.className = 'admin-container';

        // 创建各个组件
        this.components.header = document.createElement('admin-header');
        this.components.navigation = document.createElement('admin-navigation');
        this.components.contentManager = document.createElement('content-manager');
        this.components.messageNotification = document.createElement('message-notification');

        // 设置组件属性
        if (this.currentUser) {
            setTimeout(() => {
                this.components.header.setCurrentUser(this.currentUser.username || this.currentUser.name || '管理员');
            }, 100);
        }

        // 构建界面
        container.appendChild(this.components.header);
        container.appendChild(this.components.navigation);
        container.appendChild(this.components.contentManager);

        // 清空并重新渲染
        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(this.createMainStyle());
        this.shadowRoot.appendChild(container);
        this.shadowRoot.appendChild(this.components.messageNotification);

        // 设置组件事件监听
        this.setupComponentEvents();

        // 初始化时根据hash显示对应页面
        this.initializeWithHash();
        
        console.log('Admin interface rendered successfully');
    }

    createDefaultStyle() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: flex;
                flex-direction: column;
                height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
        `;
        return style;
    }

    createMainStyle() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: flex;
                flex-direction: column;
                height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: #f8f9fa;
                overflow: hidden;
            }

            .admin-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow: hidden;
            }

            .admin-header {
                flex-shrink: 0;
            }

            .admin-navigation {
                flex-shrink: 0;
            }

            content-manager {
                flex: 1;
                overflow: hidden;
            }

            message-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }
        `;
        return style;
    }

    setupComponentEvents() {
        // 头部组件事件
        this.components.header.addEventListener('logout', () => {
            this.handleLogout();
        });

        this.components.header.addEventListener('settings', () => {
            this.handleSettings();
        });

        // 导航组件事件
        this.components.navigation.addEventListener('tab-change', (e) => {
            this.handleTabChange(e.detail.tab);
        });

        // 内容管理器事件
        this.components.contentManager.addEventListener('load-tab', (e) => {
            this.handleLoadTab(e.detail);
        });

        // 全局消息事件监听
        this.addEventListener('show-message', (e) => {
            const { message, type } = e.detail;
            this.components.messageNotification.showMessage(message, type);
        });

        // 导航事件监听 - 处理来自仪表盘和其他组件的导航请求
        this.addEventListener('navigate', (e) => {
            const { page, params } = e.detail;
            this.handleNavigation(page, params);
        });

        // 监听document上的导航事件（主要用于处理来自shadow DOM的事件）
        document.addEventListener('admin-navigate', (e) => {
            const { page, params } = e.detail;
            this.handleNavigation(page, params);
        });
    }

    initializeDashboard() {
        // 简化初始化逻辑，让内容管理器和仪表盘组件自己处理
        console.log('Dashboard initialization completed');
    }

    handleTabChange(tabName) {
        console.log('HandleTabChange called:', tabName, 'currentPage before:', this.currentPage);
        
        // 更新当前页面状态 - 需要反向映射从tab名称到页面名称
        const reverseRouteMapping = {
            'dashboard': 'dashboard',
            'users': 'user-manager',
            'submissions': 'submission-manager',
            'transfers': 'transfer-manager',
            'refunds': 'refund-manager',
            'invoices': 'invoice-manager',
            'statistics': 'statistics-manager',
            'settings': 'settings-manager'
        };
        
        const pageName = reverseRouteMapping[tabName] || tabName;
        this.currentPage = pageName;
        
        console.log('CurrentPage updated to:', this.currentPage);
        
        this.components.contentManager.showTab(tabName);
    }

    handleSettings() {
        // 直接跳转到设置标签页
        this.components.navigation.setTab('settings');
        this.components.contentManager.showTab('settings');
        // 更新URL hash
        window.location.hash = '#settings';
    }

    // 处理导航
    handleNavigation(page, params = {}) {
        console.log('HandleNavigation called:', page, params, 'currentPage:', this.currentPage, 'isNavigating:', this.isNavigating);
        
        // 防止重复导航到同一页面（但允许参数不同的情况）
        if (this.isNavigating) {
            console.log('Navigation blocked: already navigating');
            return;
        }
        
        // 只有在页面相同且参数也相同时才阻止导航
        if (this.currentPage === page && Object.keys(params).length === 0) {
            console.log('Navigation blocked: same page, no params');
            return;
        }
        
        this.isNavigating = true;
        this.currentPage = page;
        
        // 路由映射 - 将仪表盘的页面名称映射到导航组件的标签名称
        const routeMapping = {
            'user-manager': 'users',
            'submission-manager': 'submissions',
            'transfer-manager': 'transfers',
            'refund-manager': 'refunds',
            'invoice-manager': 'invoices',
            'statistics-manager': 'statistics',
            'settings-manager': 'settings'
        };
        
        // 获取对应的导航标签名称
        const tabName = routeMapping[page] || page;
        
        console.log('Navigation:', page, '→', tabName);
        
        // 更新URL hash - 使用标签名称
        window.location.hash = tabName;
        
        // 通知导航组件更新选中状态
        const navigation = this.shadowRoot.querySelector('admin-navigation');
        if (navigation && typeof navigation.setActiveTab === 'function') {
            navigation.setActiveTab(tabName);
        }
        
        // 通知内容管理器切换内容
        const contentManager = this.shadowRoot.querySelector('content-manager');
        
        if (contentManager && typeof contentManager.showTab === 'function') {
            contentManager.showTab(tabName);
            
            // 如果有参数，需要传递给具体的组件
            if (Object.keys(params).length > 0) {
                // 等待组件加载完成后再传递参数，使用更长的延迟并添加重试机制
                this.passParametersToComponent(tabName, page, params);
            }
        }
        
        // 重置导航状态，添加适当延迟
        setTimeout(() => {
            this.isNavigating = false;
        }, 200);
    }

    // 传递参数到组件的方法，带重试机制
    passParametersToComponent(tabName, originalPage, params, retryCount = 0) {
        const maxRetries = 3;
        const delay = 100;
        
        setTimeout(() => {
            // 如果是submissions页面，优先尝试直接调用组件方法
            if (tabName === 'submissions' && params.filter) {
                const component = document.querySelector('submission-manager');
                
                if (component && typeof component.setFilter === 'function') {
                    try {
                        component.setFilter(params.filter);
                        return; // 成功调用，停止重试
                    } catch (error) {
                        console.error('Error calling setFilter:', error);
                    }
                } else if (retryCount < maxRetries) {
                    // 组件还没准备好，重试
                    this.passParametersToComponent(tabName, originalPage, params, retryCount + 1);
                    return;
                }
            }
            
            // 如果直接调用失败或不是submissions页面，使用document事件作为备选方案
            const event = new CustomEvent('page-params', {
                detail: { 
                    page: tabName, 
                    params, 
                    originalPage,
                    isNewNavigation: true // 标记为新的导航
                },
                bubbles: true
            });
            document.dispatchEvent(event);
        }, delay);
    }

    async handleLoadTab({ tabName, container, onSuccess, onError }) {
        try {
            let content;

            switch (tabName) {
                case 'dashboard':
                    // 只有在实际需要时才创建仪表盘组件
                    if (!this.components.dashboard) {
                        console.log('Creating dashboard component...');
                        this.components.dashboard = document.createElement('admin-dashboard');
                    }
                    onSuccess(this.components.dashboard);
                    
                    // 加载仪表盘数据
                    setTimeout(() => {
                        if (this.components.dashboard && this.components.dashboard.refresh) {
                            this.components.dashboard.refresh();
                        }
                    }, 100);
                    return;

                case 'submissions':
                    content = await this.loadSubmissionsContent();
                    break;

                case 'transfers':
                    content = await this.loadTransfersContent();
                    break;

                case 'refunds':
                    content = await this.loadRefundsContent();
                    break;

                case 'invoices':
                    content = await this.loadInvoicesContent();
                    break;

                case 'users':
                    content = await this.loadUsersContent();
                    break;

                case 'statistics':
                    content = await this.loadStatisticsContent();
                    break;

                case 'settings':
                    content = await this.loadManagementContent();
                    break;

                default:
                    throw new Error(`Unknown tab: ${tabName}`);
            }

            onSuccess(content);

        } catch (error) {
            console.error(`Failed to load ${tabName}:`, error);
            onError(error.message);
        }
    }

    // 各个标签页的内容加载方法（这些可以根据实际需要实现）
    async loadSubmissionsContent() {
        // 动态导入注册管理组件
        try {
            const { default: SubmissionManager } = await import('../pages/submission-manager.js');
            
            // 注册组件（如果尚未注册）
            if (!customElements.get('submission-manager')) {
                customElements.define('submission-manager', SubmissionManager);
            }
            
            // 创建组件实例
            const submissionManager = document.createElement('submission-manager');
            return submissionManager;
        } catch (error) {
            console.error('Failed to load submission manager:', error);
            return this.createPlaceholderContent('注册管理', 'fas fa-file-alt');
        }
    }

    async loadTransfersContent() {
        // 动态导入签转请求组件
        try {
            const { default: TransferManager } = await import('../pages/transfer-manager.js');
            
            // 注册组件（如果尚未注册）
            if (!customElements.get('transfer-manager')) {
                customElements.define('transfer-manager', TransferManager);
            }
            
            // 创建组件实例
            const transferManager = document.createElement('transfer-manager');
            return transferManager;
        } catch (error) {
            console.error('Failed to load transfer manager:', error);
            return this.createPlaceholderContent('签转请求', 'fas fa-exchange-alt');
        }
    }

    async loadRefundsContent() {
        // 动态导入退款管理组件
        try {
            const { default: RefundManager } = await import('../pages/refund-manager.js');
            
            // 注册组件（如果尚未注册）
            if (!customElements.get('refund-manager')) {
                customElements.define('refund-manager', RefundManager);
            }
            
            // 创建组件实例
            const refundManager = document.createElement('refund-manager');
            return refundManager;
        } catch (error) {
            console.error('Failed to load refund manager:', error);
            return this.createPlaceholderContent('退款管理', 'fas fa-money-bill-wave');
        }
    }

    async loadInvoicesContent() {
        // 动态导入发票管理组件
        try {
            const { default: InvoiceManager } = await import('../pages/invoice-manager.js');
            
            // 注册组件（如果尚未注册）
            if (!customElements.get('invoice-manager')) {
                customElements.define('invoice-manager', InvoiceManager);
            }
            
            // 创建组件实例
            const invoiceManager = document.createElement('invoice-manager');
            return invoiceManager;
        } catch (error) {
            console.error('Failed to load invoice manager:', error);
            return this.createPlaceholderContent('发票管理', 'fas fa-file-invoice');
        }
    }

    async loadUsersContent() {
        // 动态导入用户管理组件
        try {
            const { default: UserManager } = await import('../pages/user-manager.js');
            
            // 注册组件（如果尚未注册）
            if (!customElements.get('user-manager')) {
                customElements.define('user-manager', UserManager);
            }
            
            // 创建组件实例
            const userManager = document.createElement('user-manager');
            return userManager;
        } catch (error) {
            console.error('Failed to load user manager:', error);
            return this.createPlaceholderContent('用户管理', 'fas fa-users');
        }
    }

    async loadStatisticsContent() {
        // 动态导入统计报告组件
        try {
            const { default: StatisticsManager } = await import('../pages/statistics-manager.js');
            
            // 注册组件（如果尚未注册）
            if (!customElements.get('statistics-manager')) {
                customElements.define('statistics-manager', StatisticsManager);
            }
            
            // 创建组件实例
            const statisticsManager = document.createElement('statistics-manager');
            return statisticsManager;
        } catch (error) {
            console.error('Failed to load statistics manager:', error);
            return this.createPlaceholderContent('统计报告', 'fas fa-chart-bar');
        }
    }

    async loadManagementContent() {
        // 动态导入管理组件
        try {
            const { default: SystemManager } = await import('../pages/system-manager.js');
            
            // 注册组件（如果尚未注册）
            if (!customElements.get('system-manager')) {
                customElements.define('system-manager', SystemManager);
            }
            
            // 创建组件实例
            const systemManager = document.createElement('system-manager');
            return systemManager;
        } catch (error) {
            console.error('Failed to load system manager:', error);
            return this.createPlaceholderContent('系统管理', 'fas fa-cog');
        }
    }

    createPlaceholderContent(title, icon) {
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 40px;
            text-align: center;
            color: #6c757d;
            background: white;
            margin: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        content.innerHTML = `
            <i class="${icon}" style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;"></i>
            <h3>${title}</h3>
            <p>此模块正在开发中...</p>
        `;
        return content;
    }

    async handleLogout() {
        try {
            this.showLoading('正在退出...');
            
            await this.request('/admin/auth/logout', {
                method: 'POST'
            });

            this.isAuthenticated = false;
            this.currentUser = null;
            // 退出后重定向到前端登录页面
            window.location.href = '/admin/login.html';

        } catch (error) {
            console.error('Logout failed:', error);
            this.components.messageNotification.error('退出失败');
        } finally {
            this.hideLoading();
        }
    }

    showLoading(message = '加载中...') {
        const existingOverlay = this.shadowRoot.querySelector('.loading-overlay');
        if (existingOverlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>${message}</h3>
            </div>
        `;

        this.shadowRoot.appendChild(overlay);
    }

    hideLoading() {
        const overlay = this.shadowRoot.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // 公共API方法
    showMessage(message, type = 'info') {
        if (this.components.messageNotification) {
            this.components.messageNotification.showMessage(message, type);
        }
    }

    getCurrentTab() {
        return this.components.navigation?.getCurrentTab() || null;
    }

    refreshCurrentTab() {
        if (this.components.contentManager) {
            this.components.contentManager.refresh();
        }
    }

    showNetworkError(error) {
        const container = document.createElement('div');
        container.className = 'app-error';
        container.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h2>网络连接错误</h2>
            <p>无法连接到服务器，请检查网络连接</p>
            <p style="font-size: 12px; color: #6c757d;">${error.message}</p>
            <button class="retry-btn" onclick="this.getRootNode().host.checkAuthentication()">
                <i class="fas fa-redo"></i> 重试
            </button>
        `;

        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(this.shadowRoot.querySelector('style') || this.createDefaultStyle());
        this.shadowRoot.appendChild(container);
    }

    initializeWithHash() {
        // 延迟执行，确保所有组件都已初始化完成
        setTimeout(() => {
            const hash = window.location.hash.slice(1);
            const validTabs = ['dashboard', 'submissions', 'transfers', 'refunds', 'invoices', 'users', 'statistics', 'settings'];
            
            if (hash && validTabs.includes(hash)) {
                // 如果有有效的hash，设置对应的标签页
                this.components.navigation.setTab(hash);
                this.components.contentManager.showTab(hash);
                console.log(`Initialized with hash: ${hash}`);
            } else {
                // 如果没有hash或hash无效，显示默认的仪表盘，但不预先初始化
                this.components.navigation.setTab('dashboard');
                this.components.contentManager.showTab('dashboard');
                console.log('Initialized with default dashboard');
            }
        }, 100);
    }
}

// 注册组件 - 使用安全注册方法
if (typeof safeDefineCustomElement === 'function') {
    safeDefineCustomElement('admin-app', AdminApp);
} else {
    // 降级处理
    if (!customElements.get('admin-app')) {
        customElements.define('admin-app', AdminApp);
    }
}

export default AdminApp;
