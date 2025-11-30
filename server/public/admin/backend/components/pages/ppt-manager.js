import BaseComponent from '../core/base-component.js';
import SharedStylesLoader from '../utils/shared-styles-loader.js';

/**
 * PPT管理组件 - 管理用户上传的PPT文件
 * 支持查看列表、下载单个文件、导出所有文件列表
 */
class PptManager extends BaseComponent {
    constructor() {
        super();
        this.pptFiles = [];
        this.currentFilter = '';
        this.searchTerm = '';
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.totalRecords = 0;
    }

    async render() {
        const componentSpecificStyles = `
            :host {
                display: block;
                padding: 32px;
                background: #f8fafc;
                min-height: calc(100vh - 120px);
            }

            .toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                flex-wrap: wrap;
                gap: 16px;
            }

            .toolbar-left {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            .toolbar-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
        `;

        await SharedStylesLoader.applyStyles(this.shadowRoot, [
            '/admin/backend/styles/shared-components.css'
        ], componentSpecificStyles);

        const container = document.createElement('div');
        container.innerHTML = `
            <div class="admin-container">
                <!-- 工具栏 -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <input type="text" class="search-input" id="search-input" placeholder="搜索用户名、邮箱或文件名...">
                        <button class="btn btn-primary" id="search-btn">
                            <i class="fas fa-search"></i> 搜索
                        </button>
                    </div>
                    <div class="toolbar-right">
                        <button class="btn btn-success" id="export-list-btn">
                            <i class="fas fa-file-export"></i> 导出列表
                        </button>
                    </div>
                </div>

                <!-- 数据表格 -->
                <div class="content-area">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>用户</th>
                                    <th>邮箱</th>
                                    <th>文件名</th>
                                    <th>大小</th>
                                    <th>上传时间</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="ppt-tbody">
                            </tbody>
                        </table>
                    </div>

                    <!-- 分页 -->
                    <div class="pagination-container">
                        <div class="pagination-info" id="pagination-info">第 1 页，共 1 页</div>
                        <div class="pagination-controls">
                            <button class="btn btn-secondary btn-sm" id="prev-page" disabled>
                                <i class="fas fa-chevron-left"></i> 上一页
                            </button>
                            <button class="btn btn-secondary btn-sm" id="next-page" disabled>
                                下一页 <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const baseStyleElement = this.createBaseStyles();
        if (baseStyleElement) {
            this.shadowRoot.appendChild(baseStyleElement);
        }
        this.shadowRoot.appendChild(container);

        this.bindEvents();
        this.loadPptFiles();
    }

    bindEvents() {
        // 搜索按钮
        const searchBtn = this.shadowRoot.getElementById('search-btn');
        const searchInput = this.shadowRoot.getElementById('search-input');
        
        searchBtn?.addEventListener('click', () => this.performSearch());
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // 导出列表按钮
        const exportBtn = this.shadowRoot.getElementById('export-list-btn');
        exportBtn?.addEventListener('click', () => this.exportList());

        // 分页按钮
        const prevBtn = this.shadowRoot.getElementById('prev-page');
        const nextBtn = this.shadowRoot.getElementById('next-page');
        
        prevBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadPptFiles();
            }
        });

        nextBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadPptFiles();
            }
        });
    }

    performSearch() {
        const searchInput = this.shadowRoot.getElementById('search-input');
        this.searchTerm = searchInput?.value?.trim() || '';
        this.currentPage = 1;
        this.loadPptFiles();
    }

    async loadPptFiles() {
        this.isLoading = true;
        this.showLoadingState();

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize
            });

            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }

            const response = await fetch(`/admin/ppt?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load PPT files');
            }

            const data = await response.json();
            
            if (data.success) {
                this.pptFiles = data.data.files || [];
                const pagination = data.data.pagination || {};
                this.totalPages = pagination.total || 1;
                this.totalRecords = pagination.totalRecords || 0;
                
                this.renderPptFiles();
                this.updatePagination();
            } else {
                throw new Error(data.message || '加载数据失败');
            }
        } catch (error) {
            console.error('Error loading PPT files:', error);
            this.showError('加载数据失败，请稍后重试');
        } finally {
            this.isLoading = false;
        }
    }

    renderPptFiles() {
        const tbody = this.shadowRoot.getElementById('ppt-tbody');
        if (!tbody) return;

        if (this.pptFiles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>暂无数据</h3>
                        <p>当前没有找到PPT上传记录</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.pptFiles.map(file => `
            <tr>
                <td>${file.id}</td>
                <td>${this.escapeHtml(file.username || '未知用户')}</td>
                <td>${this.escapeHtml(file.email || '未知')}</td>
                <td title="${this.escapeHtml(file.originalFilename)}">${this.escapeHtml(this.truncateFilename(file.originalFilename, 30))}</td>
                <td>${this.formatFileSize(file.fileSize)}</td>
                <td>${this.formatDate(file.uploadTime)}</td>
                <td>
                    <button class="btn btn-primary btn-sm download-btn" data-id="${file.id}">
                        <i class="fas fa-download"></i> 下载
                    </button>
                </td>
            </tr>
        `).join('');

        // 绑定下载按钮事件
        tbody.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fileId = btn.getAttribute('data-id');
                this.downloadFile(fileId);
            });
        });
    }

    showLoadingState() {
        const tbody = this.shadowRoot.getElementById('ppt-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>正在加载数据...</p>
                </td>
            </tr>
        `;
    }

    showError(message) {
        const tbody = this.shadowRoot.getElementById('ppt-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                    <h3>加载失败</h3>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }

    updatePagination() {
        const paginationInfo = this.shadowRoot.getElementById('pagination-info');
        const prevBtn = this.shadowRoot.getElementById('prev-page');
        const nextBtn = this.shadowRoot.getElementById('next-page');

        if (paginationInfo) {
            paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页（共 ${this.totalRecords} 条记录）`;
        }

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    }

    async downloadFile(fileId) {
        try {
            window.open(`/admin/ppt/${fileId}/download`, '_blank');
        } catch (error) {
            console.error('Download error:', error);
            alert('下载失败，请稍后重试');
        }
    }

    async exportList() {
        try {
            const params = new URLSearchParams();
            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }
            
            window.open(`/admin/ppt/export?${params}`, '_blank');
        } catch (error) {
            console.error('Export error:', error);
            alert('导出失败，请稍后重试');
        }
    }

    // 工具方法
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateFilename(filename, maxLength) {
        if (!filename || filename.length <= maxLength) return filename;
        const ext = filename.split('.').pop();
        const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.slice(0, maxLength - ext.length - 4) + '...';
        return truncatedName + '.' + ext;
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    formatDate(dateString) {
        if (!dateString) return '未知';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '无效日期';
        }
    }
}

// 注册组件
customElements.define('ppt-manager', PptManager);

export default PptManager;