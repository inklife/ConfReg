import BaseComponent from '../core/base-component.js';

/**
 * 管理员导航栏组件
 * 负责显示主导航菜单和标签页切换
 */
class AdminNavigation extends BaseComponent {
    constructor() {
        super();
        this.currentTab = null; // 不设置默认值，等待从hash或外部设置
        this.navigationItems = [
            { id: 'dashboard', icon: 'dashboard', label: '仪表盘' },
            { id: 'submissions', icon: 'description', label: '注册管理' },
            { id: 'transfers', icon: 'swap_horiz', label: '签转请求' },
            { id: 'refunds', icon: 'payment', label: '退款管理' },
            { id: 'invoices', icon: 'receipt', label: '发票管理' },
            { id: 'vouchers', icon: 'restaurant', label: '餐券管理' },
            { id: 'email-notify', icon: 'email', label: '邮件通知' },
            { id: 'users', icon: 'people', label: '用户管理' },
            { id: 'statistics', icon: 'analytics', label: '统计报告' },
            { id: 'settings', icon: 'settings', label: '系统管理' }
        ];
        
        // 先从hash获取当前标签，但不更新DOM（因为还没渲染）
        this.initializeTabFromHash();
        this.setupHashListener();
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                background: #ffffff;
                border-bottom: 1px solid #e5e7eb;
                position: sticky;
                top: 0;
                z-index: 50;
            }

            .nav-content {
                display: flex;
                justify-content: flex-start;
                align-items: center;
                padding: 0 24px;
                max-width: 1400px;
                margin: 0 auto;
                gap: 0;
                overflow-x: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }

            .nav-content::-webkit-scrollbar {
                display: none;
            }

            .nav-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 16px 20px;
                background: transparent;
                border: none;
                color: #6b7280;
                font-size: 15px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border-bottom: 2px solid transparent;
                white-space: nowrap;
                min-width: max-content;
                position: relative;
            }

            .nav-btn:hover {
                color: #3b82f6;
                background: #f8fafc;
            }

            .nav-btn.active {
                color: #3b82f6;
                background: #eff6ff;
                border-bottom-color: #3b82f6;
                font-weight: 600;
            }

            .nav-btn .icon {
                font-family: 'Material Icons';
                font-size: 20px;
                font-weight: normal;
                font-style: normal;
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                display: inline-block;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                -webkit-font-feature-settings: 'liga';
                -webkit-font-smoothing: antialiased;
                transition: all 0.2s ease;
            }

            .nav-btn:hover .icon {
                transform: scale(1.05);
            }

            .nav-btn.active .icon {
                transform: scale(1.1);
            }

            .nav-btn span:last-child {
                font-size: 15px;
                font-weight: inherit;
                letter-spacing: 0.025em;
            }

            @media (max-width: 918px) {
                .nav-content {
                    justify-content: flex-start;
                    padding: 0 16px;
                    gap: 0;
                }

                .nav-btn {
                    padding: 14px 16px;
                    font-size: 14px;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .nav-btn .icon {
                    font-size: 18px;
                }

                .nav-btn span:last-child {
                    font-size: 14px;
                }
            }

            @media (max-width: 768px) {
                .nav-content {
                    padding: 0 12px;
                }

                .nav-btn {
                    padding: 12px 12px;
                    font-size: 13px;
                    gap: 5px;
                }

                .nav-btn .icon {
                    font-size: 17px;
                }

                .nav-btn span:last-child {
                    font-size: 13px;
                }
            }

            @media (max-width: 640px) {
                .nav-content {
                    padding: 0 8px;
                }

                .nav-btn {
                    padding: 10px 8px;
                    font-size: 12px;
                    gap: 4px;
                }

                .nav-btn .icon {
                    font-size: 16px;
                }

                .nav-btn span:last-child {
                    font-size: 12px;
                }
            }

            @media (max-width: 520px) {
                .nav-content {
                    padding: 0 4px;
                }

                .nav-btn {
                    padding: 10px 6px;
                    min-width: auto;
                    flex-direction: column;
                    gap: 2px;
                }

                .nav-btn .icon {
                    font-size: 18px;
                }

                .nav-btn span:last-child {
                    font-size: 10px;
                    line-height: 1.2;
                    text-align: center;
                }
            }

            @media (max-width: 420px) {
                .nav-btn span:last-child {
                    display: none;
                }

                .nav-btn {
                    padding: 12px 8px;
                    flex-direction: row;
                    gap: 0;
                }

                .nav-btn .icon {
                    font-size: 20px;
                }
            }
        `;

        const nav = document.createElement('nav');
        nav.className = 'nav-content';

        this.navigationItems.forEach(item => {
            const button = document.createElement('button');
            button.className = `nav-btn ${item.id === this.currentTab ? 'active' : ''}`;
            button.setAttribute('data-tab', item.id);
            
            const icon = document.createElement('span');
            icon.className = 'icon';
            icon.textContent = item.icon;
            
            const span = document.createElement('span');
            span.textContent = item.label;
            
            button.appendChild(icon);
            button.appendChild(span);
            nav.appendChild(button);
        });

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(nav);
        
        // DOM渲染完成后，再次检查hash并更新UI状态
        setTimeout(() => {
            this.syncUIWithCurrentTab();
        }, 0);
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const button = e.target.closest('.nav-btn');
            if (button) {
                const tabName = button.getAttribute('data-tab');
                this.setActiveTab(tabName);
                // 更新hash路由
                this.updateHash(tabName);
                this.emit('tab-change', { tab: tabName });
            }
        });
    }

    /**
     * 初始化hash路由监听
     */
    setupHashListener() {
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    /**
     * 仅从hash初始化当前标签（不更新DOM）
     */
    initializeTabFromHash() {
        const hash = window.location.hash.slice(1); // 移除#号
        if (hash && this.navigationItems.some(item => item.id === hash)) {
            this.currentTab = hash;
        } else if (!hash) {
            // 如果没有hash，设置为dashboard但不立即更新hash
            this.currentTab = 'dashboard';
        }
    }

    /**
     * 处理hash变化事件
     */
    handleHashChange() {
        const hash = window.location.hash.slice(1);
        if (hash && this.navigationItems.some(item => item.id === hash)) {
            this.currentTab = hash;
            this.syncUIWithCurrentTab();
            this.emit('tab-change', { tab: hash });
        }
    }

    /**
     * 同步UI状态与当前标签
     */
    syncUIWithCurrentTab() {
        const buttons = this.shadowRoot.querySelectorAll('.nav-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === this.currentTab);
        });
    }

    /**
     * 从hash初始化当前标签（废弃，保留向后兼容）
     * @deprecated 使用 initializeTabFromHash 和 syncUIWithCurrentTab
     */
    initializeFromHash() {
        this.initializeTabFromHash();
        this.syncUIWithCurrentTab();
    }

    /**
     * 更新URL hash
     */
    updateHash(tabName) {
        if (window.location.hash.slice(1) !== tabName) {
            window.history.replaceState(null, '', `#${tabName}`);
        }
    }

    setActiveTab(tabName) {
        if (tabName === this.currentTab) return;

        // 更新当前标签
        this.currentTab = tabName;

        // 更新视觉状态
        this.syncUIWithCurrentTab();

        // 同步更新hash（如果不是通过hash变化触发的）
        if (window.location.hash.slice(1) !== tabName) {
            this.updateHash(tabName);
        }
    }

    // 公共API方法
    getCurrentTab() {
        return this.currentTab;
    }

    // 从外部设置活跃标签（用于初始化）
    setTab(tabName) {
        this.setActiveTab(tabName);
        // 发出事件通知其他组件
        this.emit('tab-change', { tab: tabName });
    }

    /**
     * 获取当前hash对应的标签
     */
    getTabFromHash() {
        const hash = window.location.hash.slice(1);
        return this.navigationItems.find(item => item.id === hash)?.id || 'dashboard';
    }

    /**
     * 检查指定标签是否有效
     */
    isValidTab(tabName) {
        return this.navigationItems.some(item => item.id === tabName);
    }
}

// 注册组件
customElements.define('admin-navigation', AdminNavigation);

export default AdminNavigation;
