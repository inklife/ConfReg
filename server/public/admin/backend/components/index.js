/**
 * Web Components 模块入口
 * 统一导出所有管理员组件
 */

// 基础组件
export { default as BaseComponent } from './core/base-component.js';

// 布局组件
export { default as AdminHeader } from './layout/admin-header.js';
export { default as AdminNavigation } from './layout/admin-navigation.js';
export { default as ContentManager } from './core/content-manager.js';

// 功能组件
export { default as AdminDashboard } from './pages/admin-dashboard.js';
export { default as SubmissionManager } from './pages/submission-manager.js';
export { default as TransferManager } from './pages/transfer-manager.js';
export { default as RefundManager } from './pages/refund-manager.js';
export { default as InvoiceManager } from './pages/invoice-manager.js';
export { default as UserManager } from './pages/user-manager.js';
export { default as StatisticsManager } from './pages/statistics-manager.js';
export { default as SystemManager } from './pages/system-manager.js';
export { default as MessageNotification } from './core/message-notification.js';

// 主应用
export { default as AdminApp } from './core/admin-app.js';

/**
 * 初始化所有组件
 * 确保所有自定义元素都已注册
 */
export function initializeComponents() {
    // 组件会在各自的模块中自动注册
    // 这个函数可以用于执行额外的初始化逻辑
    
    console.log('Admin Web Components initialized');
    
    // 返回可用的组件列表
    return {
        'admin-app': 'AdminApp',
        'admin-header': 'AdminHeader', 
        'admin-navigation': 'AdminNavigation',
        'content-manager': 'ContentManager',
        'admin-dashboard': 'AdminDashboard',
        'submission-manager': 'SubmissionManager',
        'transfer-manager': 'TransferManager',
        'refund-manager': 'RefundManager',
        'invoice-manager': 'InvoiceManager',
        'user-manager': 'UserManager',
        'statistics-manager': 'StatisticsManager',
        'system-manager': 'SystemManager',
        'message-notification': 'MessageNotification'
    };
}

/**
 * 检查浏览器是否支持 Web Components
 */
export function checkWebComponentsSupport() {
    const isSupported = (
        'customElements' in window &&
        'attachShadow' in Element.prototype &&
        'getRootNode' in Element.prototype &&
        'adoptedStyleSheets' in Document.prototype &&
        'replaceSync' in CSSStyleSheet.prototype
    );
    
    if (!isSupported) {
        console.warn('Web Components not fully supported in this browser');
        
        // 可以在这里加载 polyfill
        // import('@webcomponents/webcomponentsjs');
    }
    
    return isSupported;
}
