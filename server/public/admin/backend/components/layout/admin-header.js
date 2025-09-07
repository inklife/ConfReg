import BaseComponent from '../core/base-component.js';

/**
 * 管理员头部组件
 * 包含标题、用户信息和退出按钮
 */
class AdminHeader extends BaseComponent {
    constructor() {
        super();
        this.currentUser = '管理员';
    }

    render() {
        // 添加FontAwesome样式
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
            }

            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                max-width: 1400px;
                margin: 0 auto;
                height: 64px;
            }

            .header-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .logo-section {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .logo-icon {
                color: white;
                font-size: 24px;
                margin-right: 4px;
            }
            
            .logo-icon i {
                font-size: 20px;
            }

            .header-title {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: -0.025em;
            }

            .header-subtitle {
                display: none;
            }

            .user-section {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .current-user {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: transparent;
                border-radius: 8px;
                font-weight: 500;
                color: #ffffff;
                font-size: 16px;
            }

            .user-avatar {
                display: none;
            }

            .settings-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: #ffffff;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
            }

            .settings-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.3);
                color: #ffffff;
            }

            .settings-btn:active {
                background: rgba(255, 255, 255, 0.15);
                transform: scale(0.98);
            }

            .settings-btn i {
                font-size: 14px;
                width: 14px;
                height: 14px;
                display: inline-block;
                margin-right: 6px;
            }

            .logout-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                color: #ffffff;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .logout-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.4);
                color: #ffffff;
            }

            .logout-btn:active {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(0.98);
            }

            .logout-btn i {
                font-size: 14px;
                width: 14px;
                height: 14px;
                display: inline-block;
                margin-right: 6px;
            }
            
            /* 确保FontAwesome图标正确显示 */
            .fas, .fa-sign-out-alt {
                font-family: "Font Awesome 6 Free";
                font-weight: 900;
                font-style: normal;
                font-variant: normal;
                text-rendering: auto;
                line-height: 1;
            }

            @media (max-width: 768px) {
                .header-content {
                    padding: 12px 16px;
                    height: 56px;
                }

                .header-title {
                    font-size: 18px;
                }

                .logo-icon {
                    width: 32px;
                    height: 32px;
                    font-size: 16px;
                }

                .current-user,
                .logout-btn {
                    padding: 6px 12px;
                    font-size: 13px;
                }

                .user-avatar {
                    width: 24px;
                    height: 24px;
                    font-size: 11px;
                }
            }

            @media (max-width: 480px) {
                .header-content {
                    padding: 8px 12px;
                    gap: 8px;
                }

                .header-title {
                    font-size: 16px;
                }

                .header-subtitle {
                    display: none;
                }

                .user-section {
                    gap: 8px;
                }

                .current-user span:not(.user-avatar) {
                    display: none;
                }

                .logout-btn span {
                    display: none;
                }
            }
        `;

        const header = document.createElement('div');
        header.className = 'header-content';

        // 左侧部分
        const headerLeft = document.createElement('div');
        headerLeft.className = 'header-left';

        const logoSection = document.createElement('div');
        logoSection.className = 'logo-section';

        const logoIcon = document.createElement('div');
        logoIcon.className = 'logo-icon';
        logoIcon.innerHTML = '<i class="fas fa-clipboard-list"></i>';

        const titleSection = document.createElement('div');
        const title = document.createElement('h1');
        title.className = 'header-title';
        title.textContent = 'ICPADS 2025 注册管理系统';

        titleSection.appendChild(title);
        
        logoSection.appendChild(logoIcon);
        logoSection.appendChild(titleSection);
        headerLeft.appendChild(logoSection);

        // 右侧用户信息部分
        const userSection = document.createElement('div');
        userSection.className = 'user-section';

        const currentUser = document.createElement('div');
        currentUser.className = 'current-user';
        
        const userName = document.createElement('span');
        userName.id = 'current-user';
        userName.textContent = 'admin';

        currentUser.appendChild(userName);

        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'settings-btn';
        settingsBtn.id = 'settings-btn';
        settingsBtn.innerHTML = `
            <i class="fas fa-cog"></i>
            <span>设置</span>
        `;

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.id = 'logout-btn';
        logoutBtn.innerHTML = `
            <i class="fas fa-sign-out-alt"></i>
            <span>退出</span>
        `;

        userSection.appendChild(currentUser);
        userSection.appendChild(settingsBtn);
        userSection.appendChild(logoutBtn);

        header.appendChild(headerLeft);
        header.appendChild(userSection);

        this.shadowRoot.appendChild(fontAwesome);
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(header);
    }

    setupEventListeners() {
        const settingsBtn = this.shadowRoot.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.handleSettings();
            });
        }

        const logoutBtn = this.shadowRoot.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    handleSettings() {
        // 发送设置事件
        this.emit('settings');
    }

    handleLogout() {
        // 发送登出事件
        this.emit('logout');
    }

    // 公共API方法
    setCurrentUser(username) {
        this.currentUser = username;
        const userElement = this.shadowRoot.getElementById('current-user');
        if (userElement) {
            userElement.textContent = username || 'admin';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// 注册组件
customElements.define('admin-header', AdminHeader);

export default AdminHeader;
