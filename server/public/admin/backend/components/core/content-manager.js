import BaseComponent from './base-component.js';

/**
 * 内容管理器组件
 * 负责管理不同标签页的内容显示和切换
 */
class ContentManager extends BaseComponent {
    constructor() {
        super();
        this.currentTab = null; // 不设置默认标签页，等待外部设置
        this.tabContents = new Map();
        this.loadingStates = new Map();
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                flex: 1;
                background: #f8f9fa;
                overflow: hidden;
                min-height: 400px; /* 确保有最小高度 */
            }

            .content-container {
                height: 100%;
                position: relative;
                overflow: hidden;
                min-height: 400px; /* 确保容器有足够高度 */
            }

            .tab-content {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                opacity: 0;
                visibility: hidden;
                transform: translateX(20px);
                transition: all 0.3s ease;
                overflow-y: auto;
                overflow-x: hidden;
            }

            .tab-content.active {
                opacity: 1;
                visibility: visible;
                transform: translateX(0);
                z-index: 1;
            }

            .content-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #6c757d;
                background: #f8f9fa;
            }

            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #e9ecef;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .content-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #dc3545;
                background: #f8f9fa;
                text-align: center;
                padding: 40px;
            }

            .content-error i {
                font-size: 64px;
                margin-bottom: 20px;
                opacity: 0.5;
            }

            .content-error h3 {
                margin: 0 0 10px 0;
                font-size: 24px;
            }

            .content-error p {
                margin: 0 0 20px 0;
                color: #6c757d;
            }

            .retry-btn {
                padding: 10px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s ease;
            }

            .retry-btn:hover {
                background: #0056b3;
            }

            /* 滚动条样式 */
            .tab-content::-webkit-scrollbar {
                width: 8px;
            }

            .tab-content::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            .tab-content::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }

            .tab-content::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .tab-content {
                    transform: translateY(20px);
                }

                .tab-content.active {
                    transform: translateY(0);
                }
            }
        `;

        const container = document.createElement('div');
        container.className = 'content-container';
        container.id = 'content-container';

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

        // 初始化标签页内容
        this.initializeTabContents();
    }

    initializeTabContents() {
        const tabs = [
            'dashboard',
            'submissions', 
            'transfers',
            'refunds',
            'invoices',
            'vouchers',
            'email-notify',
            'users',
            'statistics',
            'settings'
        ];

        const container = this.shadowRoot.getElementById('content-container');

        tabs.forEach(tab => {
            const tabContent = document.createElement('div');
            tabContent.className = `tab-content`; // 初始化时没有active类
            tabContent.id = `${tab}-content`;
            
            // 不在初始化时显示加载状态，等实际需要时再加载
            
            container.appendChild(tabContent);
            this.tabContents.set(tab, tabContent);
        });

        // 不在初始化时自动加载任何标签页，等实际调用showTab时再加载
    }

    renderLoadingState(container, tabName) {
        const loadingContent = document.createElement('div');
        loadingContent.className = 'content-loading';
        loadingContent.innerHTML = `
            <div class="loading-spinner"></div>
            <h3>加载中...</h3>
            <p>正在加载${this.getTabDisplayName(tabName)}数据</p>
        `;
        
        container.innerHTML = '';
        container.appendChild(loadingContent);
        this.loadingStates.set(tabName, true);
    }

    renderErrorState(container, tabName, error = '') {
        const errorContent = document.createElement('div');
        errorContent.className = 'content-error';
        errorContent.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>加载失败</h3>
            <p>无法加载${this.getTabDisplayName(tabName)}数据</p>
            ${error ? `<p style="font-size: 12px; color: #dc3545;">${error}</p>` : ''}
            <button class="retry-btn" onclick="this.getRootNode().host.retryLoadTab('${tabName}')">
                <i class="fas fa-redo"></i> 重试
            </button>
        `;
        
        container.innerHTML = '';
        container.appendChild(errorContent);
        this.loadingStates.set(tabName, false);
    }

    getTabDisplayName(tabName) {
        const displayNames = {
            'dashboard': '仪表盘',
            'submissions': '注册管理',
            'transfers': '签转请求',
            'refunds': '退款管理',
            'invoices': '发票管理',
            'vouchers': '餐券管理',
            'email-notify': '邮件通知',
            'users': '用户管理',
            'statistics': '统计报告'
        };
        return displayNames[tabName] || tabName;
    }

    showTab(tabName) {
        if (!this.tabContents.has(tabName)) {
            console.warn(`Tab ${tabName} does not exist`);
            return;
        }

        // 隐藏当前标签页
        const currentContent = this.tabContents.get(this.currentTab);
        if (currentContent) {
            currentContent.classList.remove('active');
        }

        // 显示新标签页
        const newContent = this.tabContents.get(tabName);
        if (newContent) {
            newContent.classList.add('active');
            
            // 如果标签页内容为空或处于加载状态，触发加载
            if (!this.isTabLoaded(tabName)) {
                this.loadTab(tabName);
            }
        }

        this.currentTab = tabName;
        
        // 发送标签页切换事件
        this.emit('tab-changed', { 
            from: this.currentTab, 
            to: tabName 
        });
    }

    isTabLoaded(tabName) {
        const content = this.tabContents.get(tabName);
        return content && 
               !content.querySelector('.content-loading') && 
               !content.querySelector('.content-error') &&
               content.children.length > 0;
    }

    async loadTab(tabName) {
        const container = this.tabContents.get(tabName);
        if (!container) {
            console.error(`Container for tab ${tabName} not found`);
            return;
        }

        console.log(`Loading tab: ${tabName}`);

        try {
            // 显示加载状态
            this.renderLoadingState(container, tabName);

            // 发送加载事件，让外部处理具体的加载逻辑
            this.emit('load-tab', { 
                tabName, 
                container,
                onSuccess: (content) => {
                    console.log(`Successfully loaded content for tab: ${tabName}`);
                    this.setTabContent(tabName, content);
                },
                onError: (error) => {
                    console.error(`Failed to load tab ${tabName}:`, error);
                    this.renderErrorState(container, tabName, error);
                }
            });

        } catch (error) {
            console.error(`Failed to load tab ${tabName}:`, error);
            this.renderErrorState(container, tabName, error.message);
        }
    }

    setTabContent(tabName, content) {
        const container = this.tabContents.get(tabName);
        if (!container) return;

        container.innerHTML = '';
        
        if (typeof content === 'string') {
            container.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            container.appendChild(content);
        } else if (content instanceof DocumentFragment) {
            container.appendChild(content);
        }

        this.loadingStates.set(tabName, false);
    }

    retryLoadTab(tabName) {
        this.loadTab(tabName);
    }

    // 公共API方法
    getCurrentTab() {
        return this.currentTab;
    }

    refresh(tabName = null) {
        const targetTab = tabName || this.currentTab;
        this.loadTab(targetTab);
    }

    clearTabContent(tabName) {
        const container = this.tabContents.get(tabName);
        if (container) {
            container.innerHTML = '';
            this.loadingStates.set(tabName, false);
        }
    }

    // 批量设置标签页内容
    setMultipleTabContents(contents) {
        Object.entries(contents).forEach(([tabName, content]) => {
            this.setTabContent(tabName, content);
        });
    }
}

// 注册组件
customElements.define('content-manager', ContentManager);

export default ContentManager;
