/**
 * 共享样式加载器
 * 为管理后台组件提供统一的样式管理
 */

class SharedStylesLoader {
    static _stylesLoaded = false;
    static _sharedStylesCache = null;

    /**
     * 获取共享样式元素
     * @returns {HTMLStyleElement} 包含共享样式的 style 元素
     */
    static getSharedStyles() {
        if (this._sharedStylesCache) {
            return this._sharedStylesCache.cloneNode(true);
        }

        const style = document.createElement('style');
        style.setAttribute('data-shared-styles', 'admin-components');
        
        // 这里可以动态加载CSS文件或直接内联样式
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/admin/backend/styles/shared-components.css';
        
        // 对于Shadow DOM，我们需要内联样式
        // 在实际应用中，可以通过fetch加载CSS内容
        this._loadSharedStylesContent().then(content => {
            style.textContent = content;
        });

        this._sharedStylesCache = style;
        return style.cloneNode(true);
    }

    /**
     * 异步加载共享样式内容
     * @returns {Promise<string>} CSS内容
     */
    static async _loadSharedStylesContent() {
        try {
            const response = await fetch('/admin/backend/styles/shared-components.css');
            if (response.ok) {
                return await response.text();
            }
        } catch (error) {
            console.warn('Failed to load shared styles, using fallback');
        }
        
        // 如果加载失败，返回基础样式
        return this._getFallbackStyles();
    }

    /**
     * 获取回退样式（内联的基础样式）
     * @returns {string} 基础CSS样式
     */
    static _getFallbackStyles() {
        return `
            /* 基础共享样式 */
            .admin-page {
                display: block;
                padding: 32px;
                background: #f8fafc;
                min-height: calc(100vh - 120px);
                position: relative;
            }

            .admin-container {
                max-width: 1400px;
                margin: 0 auto;
                position: relative;
                z-index: 1;
            }

            .page-header {
                margin-bottom: 32px;
                text-align: left;
                padding: 0 4px;
            }

            .page-title {
                font-size: 28px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 8px 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .page-subtitle {
                font-size: 16px;
                color: #6b7280;
                margin: 0;
                font-weight: 400;
            }

            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                white-space: nowrap;
            }

            .btn-primary {
                background: #3b82f6;
                color: white;
            }

            .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .btn-success {
                background: #10b981;
                color: white;
            }

            .btn-danger {
                background: #ef4444;
                color: white;
            }

            .btn-sm {
                padding: 8px 14px;
                font-size: 14px;
            }

            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 14px;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }

            .status-pending {
                background: #fef3c7;
                color: #92400e;
            }

            .status-approved {
                background: #d1fae5;
                color: #065f46;
            }

            .status-rejected {
                background: #fee2e2;
                color: #991b1b;
            }

            .status-processed, .status-paid {
                background: #dbeafe;
                color: #1e40af;
            }
        `;
    }

    /**
     * 创建组件特定的样式
     * @param {string} componentName 组件名称
     * @param {string} additionalStyles 额外的样式
     * @returns {HTMLStyleElement} 样式元素
     */
    static createComponentStyles(componentName, additionalStyles = '') {
        const style = document.createElement('style');
        style.setAttribute('data-component', componentName);
        style.textContent = additionalStyles;
        return style;
    }

    /**
     * 为组件添加共享样式和特定样式
     * @param {ShadowRoot} shadowRoot Shadow DOM根节点
     * @param {string} componentName 组件名称
     * @param {string} componentSpecificStyles 组件特定样式
     */
    static async applyStyles(shadowRoot, componentName, componentSpecificStyles = '') {
        // 添加共享样式
        const sharedStylesContent = await this._loadSharedStylesContent();
        const sharedStyle = document.createElement('style');
        sharedStyle.textContent = sharedStylesContent;
        shadowRoot.appendChild(sharedStyle);

        // 添加组件特定样式
        if (componentSpecificStyles) {
            const componentStyle = this.createComponentStyles(componentName, componentSpecificStyles);
            shadowRoot.appendChild(componentStyle);
        }
    }
}

export default SharedStylesLoader;
