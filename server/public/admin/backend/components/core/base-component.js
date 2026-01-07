/**
 * 基础Web Component类
 * 为所有管理员页面组件提供通用功能
 */
class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._isConnected = false;
        this._externalStylesLoaded = false;
    }

    connectedCallback() {
        if (!this._isConnected) {
            this.loadExternalStyles();
            this.render();
            this.setupEventListeners();
            this._isConnected = true;
        }
    }

    disconnectedCallback() {
        this.cleanup();
        this._isConnected = false;
    }

    /**
     * 加载外部样式表到 Shadow DOM
     * 包括 Font Awesome 和其他必要的外部样式
     */
    loadExternalStyles() {
        if (this._externalStylesLoaded) return;

        // Font Awesome
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        fontAwesomeLink.crossOrigin = 'anonymous';
        this.shadowRoot.appendChild(fontAwesomeLink);

        // Google Fonts (如果需要)
        const googleFontsLink = document.createElement('link');
        googleFontsLink.rel = 'stylesheet';
        googleFontsLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
        this.shadowRoot.appendChild(googleFontsLink);

        this._externalStylesLoaded = true;

        // 检测 Font Awesome 是否加载成功
        this.checkFontAwesome();
    }

    /**
     * 检测 Font Awesome 是否加载成功
     */
    checkFontAwesome() {
        setTimeout(() => {
            const testIcon = this.shadowRoot.querySelector('.fas, .far, .fab');
            if (testIcon) {
                const rect = testIcon.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    console.warn('Font Awesome icons not rendering in', this.constructor.name);
                    this.onFontAwesomeFallback();
                } else {
                    console.log('Font Awesome loaded successfully in', this.constructor.name);
                }
            }
        }, 1500);
    }

    /**
     * Font Awesome 加载失败时的回调
     * 子类可以重写此方法来处理后备方案
     */
    onFontAwesomeFallback() {
        // 通用处理：为根元素添加 use-fallback 类
        this.shadowRoot.host.classList.add('use-fallback');
        
        // 子类可以重写此方法进行特殊处理
        console.warn('Font Awesome fallback activated for', this.constructor.name);
    }

    render() {
        // 子类需要实现此方法
        throw new Error('render() method must be implemented by subclass');
    }

    setupEventListeners() {
        // 子类可以重写此方法
    }

    cleanup() {
        // 子类可以重写此方法进行清理
    }

    // 工具方法：创建元素
    createElement(tag, className = '', textContent = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    }

    // 工具方法：创建图标元素
    createIcon(iconClass, fallbackEmoji = '') {
        const iconContainer = this.createElement('span', 'icon-container');
        const icon = this.createElement('i', iconClass);
        iconContainer.appendChild(icon);
        
        if (fallbackEmoji) {
            const fallback = this.createElement('span', 'icon-fallback hidden', fallbackEmoji);
            iconContainer.appendChild(fallback);
        }
        
        return iconContainer;
    }

    // 工具方法：创建带图标的按钮
    createIconButton(iconClass, text, className = 'btn', fallbackEmoji = '') {
        const button = this.createElement('button', className);
        
        if (iconClass) {
            const iconContainer = this.createIcon(iconClass, fallbackEmoji);
            button.appendChild(iconContainer);
        }
        
        if (text) {
            const span = this.createElement('span', '', text);
            button.appendChild(span);
        }
        return button;
    }

    // 工具方法：创建状态徽章
    createStatusBadge(status, text) {
        const badgeClass = `badge badge-${status}`;
        return this.createElement('span', badgeClass, text);
    }

    /**
     * 创建通用的基础样式
     * 包含现代极简设计的通用样式
     */
    createBaseStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* CSS 变量定义 */
            :host {
                /* 颜色系统 */
                --white: #ffffff;
                --gray-50: #f9fafb;
                --gray-100: #f3f4f6;
                --gray-200: #e5e7eb;
                --gray-300: #d1d5db;
                --gray-400: #9ca3af;
                --gray-500: #6b7280;
                --gray-600: #4b5563;
                --gray-700: #374151;
                --gray-800: #1f2937;
                --gray-900: #111827;
                
                --blue-50: #eff6ff;
                --blue-500: #3b82f6;
                --blue-600: #2563eb;
                --blue-700: #1d4ed8;
                
                --green-500: #10b981;
                --green-600: #059669;
                
                --red-500: #ef4444;
                --red-600: #dc2626;
                
                --yellow-500: #f59e0b;
                --yellow-600: #d97706;
                
                --purple-500: #8b5cf6;
                --purple-600: #7c3aed;
                
                --cyan-500: #06b6d4;
                --cyan-600: #0891b2;
                
                /* 圆角 */
                --radius-sm: 4px;
                --radius: 6px;
                --radius-md: 8px;
                --radius-lg: 12px;
                --radius-xl: 16px;
                
                /* 阴影 */
                --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
                --shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
                --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
                --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
                
                /* 字体 */
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            /* 基础重置 */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            /* 通用按钮样式 */
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border: 1px solid var(--gray-300);
                border-radius: var(--radius);
                background: var(--white);
                color: var(--gray-700);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
            }

            .btn:hover {
                background: var(--gray-50);
                border-color: var(--gray-400);
                transform: translateY(-1px);
            }

            .btn:active {
                transform: translateY(0);
            }

            .btn-primary {
                background: var(--blue-500);
                border-color: var(--blue-500);
                color: var(--white);
            }

            .btn-primary:hover {
                background: var(--blue-600);
                border-color: var(--blue-600);
            }

            .btn-success {
                background: var(--green-500);
                border-color: var(--green-500);
                color: var(--white);
            }

            .btn-success:hover {
                background: var(--green-600);
                border-color: var(--green-600);
            }

            .btn-danger {
                background: var(--red-500);
                border-color: var(--red-500);
                color: var(--white);
            }

            .btn-danger:hover {
                background: var(--red-600);
                border-color: var(--red-600);
            }

            .btn-sm {
                padding: 6px 12px;
                font-size: 12px;
            }

            .btn-lg {
                padding: 12px 24px;
                font-size: 16px;
            }

            /* 通用卡片样式 */
            .card {
                background: var(--white);
                border-radius: var(--radius-lg);
                border: 1px solid var(--gray-200);
                box-shadow: var(--shadow);
                transition: all 0.2s ease;
            }

            .card:hover {
                box-shadow: var(--shadow-md);
                transform: translateY(-1px);
            }

            .card-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--gray-200);
                font-weight: 600;
                color: var(--gray-900);
            }

            .card-body {
                padding: 20px;
            }

            /* 通用表格样式 */
            .table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
            }

            .table th,
            .table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid var(--gray-200);
            }

            .table th {
                background: var(--gray-50);
                font-weight: 600;
                color: var(--gray-700);
            }

            .table tr:hover {
                background: var(--gray-50);
            }

            /* 通用表单样式 */
            .form-group {
                margin-bottom: 16px;
            }

            .form-label {
                display: block;
                margin-bottom: 4px;
                font-weight: 500;
                color: var(--gray-700);
                font-size: 14px;
            }

            .form-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--gray-300);
                border-radius: var(--radius);
                font-size: 14px;
                transition: border-color 0.2s ease;
            }

            .form-input:focus {
                outline: none;
                border-color: var(--blue-500);
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .form-select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--gray-300);
                border-radius: var(--radius);
                font-size: 14px;
                background: var(--white);
                cursor: pointer;
            }

            .form-select:focus {
                outline: none;
                border-color: var(--blue-500);
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            /* 通用加载动画 */
            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid var(--gray-200);
                border-top: 2px solid var(--blue-500);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .spinner-lg {
                width: 32px;
                height: 32px;
                border-width: 3px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* 通用徽章样式 */
            .badge {
                display: inline-flex;
                align-items: center;
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 12px;
                font-weight: 500;
            }

            .badge-primary {
                background: var(--blue-50);
                color: var(--blue-700);
            }

            .badge-success {
                background: #dcfce7;
                color: #166534;
            }

            .badge-danger {
                background: #fecaca;
                color: #991b1b;
            }

            .badge-warning {
                background: #fef3c7;
                color: #92400e;
            }

            .badge-gray {
                background: var(--gray-100);
                color: var(--gray-700);
            }

            /* 图标容器 */
            .icon-container {
                display: inline-flex;
                align-items: center;
                position: relative;
            }

            .icon-fallback {
                font-style: normal;
            }

            .icon-fallback.hidden {
                display: none;
            }

            /* 当Font Awesome未加载时显示fallback */
            .use-fallback .icon-container i {
                display: none;
            }

            .use-fallback .icon-container .icon-fallback {
                display: inline-block !important;
            }

            /* 通用工具类 */
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-sm { font-size: 12px; }
            .text-base { font-size: 14px; }
            .text-lg { font-size: 16px; }
            .text-xl { font-size: 18px; }
            .text-2xl { font-size: 24px; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .text-gray-500 { color: var(--gray-500); }
            .text-gray-600 { color: var(--gray-600); }
            .text-gray-700 { color: var(--gray-700); }
            .text-gray-900 { color: var(--gray-900); }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            .mb-8 { margin-bottom: 32px; }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
            .mt-6 { margin-top: 24px; }
            .mt-8 { margin-top: 32px; }
            .p-2 { padding: 8px; }
            .p-4 { padding: 16px; }
            .p-6 { padding: 24px; }
            .p-8 { padding: 32px; }
            .px-4 { padding-left: 16px; padding-right: 16px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .gap-1 { gap: 4px; }
            .gap-2 { gap: 8px; }
            .gap-3 { gap: 12px; }
            .gap-4 { gap: 16px; }
            .gap-6 { gap: 24px; }
            .w-full { width: 100%; }
            .h-full { height: 100%; }
            .hidden { display: none; }
        `;
        return style;
    }

    // 工具方法：发送HTTP请求
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                credentials: 'include', // 确保包含cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            // 对于401错误，直接抛出包含状态码的错误
            if (response.status === 401) {
                throw new Error(`HTTP 401: Unauthorized`);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 检查响应类型，如果是文件下载，返回Blob
            const contentType = response.headers.get('content-type');
            if (contentType && (
                contentType.includes('application/octet-stream') ||
                contentType.includes('application/x-sqlite3') ||
                contentType.includes('application/sqlite')
            )) {
                return await response.blob();
            }

            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    // 工具方法：显示提示消息
    showMessage(message, type = 'info') {
        const event = new CustomEvent('show-message', {
            detail: { message, type },
            bubbles: true,
            composed: true  // 允许事件穿透 Shadow DOM 边界
        });
        this.dispatchEvent(event);
    }

    // 工具方法：触发自定义事件
    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true  // 允许事件穿透 Shadow DOM 边界
        });
        this.dispatchEvent(event);
    }
}

export default BaseComponent;
