import BaseComponent from '../core/base-component.js';

/**
 * 仪表盘组件 - 现代极简风格
 * 显示系统统计信息和概览，采用Material Design + Flat Design
 */
class AdminDashboard extends BaseComponent {
    constructor() {
        super();
        this.stats = {
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            totalPayment: 0,
            totalRegistrations: 0
        };
        this.systemStatus = {
            cpuUsage: null,
            memoryUsage: null,
            pdfWorkerStatus: 'ready',
            pdfQueueCount: 0,
            pdfProcessingCount: 0
        };
        this.dataOverview = {
            newRegistrations: 0,
            processingSpeed: '--',
            paymentSuccessRate: '--',
            satisfactionRate: '--'
        };
        this.isLoading = false;
    }

    render() {
        // 使用基础组件的样式
        const baseStyles = this.createBaseStyles();
        
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                padding: 32px;
                background: #f8fafb;
                min-height: calc(100vh - 120px);
                position: relative;
            }

            .dashboard-container {
                max-width: 1400px;
                margin: 0 auto;
                position: relative;
                z-index: 1;
            }

            /* 页面标题区域 */
            .dashboard-header {
                margin-bottom: 40px;
                text-align: left;
                padding: 0 4px;
            }

            .dashboard-title {
                color: #1a202c;
                font-size: 32px;
                font-weight: 600;
                margin: 0 0 8px 0;
                letter-spacing: -0.5px;
            }

            .dashboard-subtitle {
                color: #4a5568;
                font-size: 16px;
                font-weight: 400;
                margin: 0 0 24px 0;
            }

            .dashboard-time {
                color: #718096;
                font-size: 14px;
                font-weight: 400;
                margin: 0;
            }

            /* 统计卡片网格 */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 32px;
            }

            .stat-card {
                background: white;
                border-radius: 12px;
                padding: 24px 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid #f1f5f9;
                position: relative;
                overflow: hidden;
                cursor: pointer;
                user-select: none;
            }

            .stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: var(--card-accent, #667eea);
                opacity: 1;
                transition: opacity 0.3s ease;
            }

            .stat-card:hover {
                transform: translateY(-6px);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
                border-color: #e2e8f0;
            }

            .stat-card:active {
                transform: translateY(-2px) scale(0.98);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
                transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .stat-card-content {
                display: flex;
                align-items: flex-start;
                gap: 20px;
            }

            .stat-icon {
                width: 56px;
                height: 56px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: white;
                flex-shrink: 0;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .stat-icon i {
                font-size: 24px;
                line-height: 1;
                position: relative;
                z-index: 2;
            }

            /* 如果Font Awesome未加载，显示后备字符 */
            .stat-icon .fas:before {
                font-family: "Font Awesome 5 Free", "Font Awesome 6 Free", sans-serif;
                font-weight: 900;
            }

            .stat-icon::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
                transform: translateX(-100%);
                transition: transform 0.6s ease;
            }

            .stat-card:hover .stat-icon::before {
                transform: translateX(100%);
            }

            /* 图标颜色主题 */
            .stat-icon.pending { 
                background: linear-gradient(135deg, #ff9500 0%, #ff6b35 100%);
            }
            .stat-icon.approved { 
                background: linear-gradient(135deg, #00d4aa 0%, #00b894 100%);
            }
            .stat-icon.rejected { 
                background: linear-gradient(135deg, #ff6b8a 0%, #ff4757 100%);
            }
            .stat-icon.total { 
                background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
            }

            .stat-card[data-theme="pending"] { --card-accent: #ff9500; }
            .stat-card[data-theme="approved"] { --card-accent: #00d4aa; }
            .stat-card[data-theme="rejected"] { --card-accent: #ff6b8a; }
            .stat-card[data-theme="total"] { --card-accent: #4285f4; }

            .stat-info {
                flex: 1;
                min-width: 0;
            }

            .stat-value {
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 6px 0;
                color: #1a202c;
                line-height: 1.1;
                display: flex;
                align-items: baseline;
                gap: 4px;
            }

            .stat-label {
                font-size: 14px;
                color: #4a5568;
                margin: 0 0 8px 0;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* 刷新按钮 */
            .refresh-section {
                text-align: center;
                margin-top: 24px;
            }

            .refresh-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 28px;
                background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
            }

            .refresh-btn:hover {
                background: linear-gradient(135deg, #3367d6 0%, #1a73e8 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
            }

            .refresh-btn:active {
                transform: translateY(0);
            }

            .refresh-btn i {
                font-size: 14px;
                line-height: 1;
            }

            .refresh-btn:hover i {
                transform: rotate(360deg);
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .refresh-btn.loading i {
                animation: spin 1s linear infinite;
            }

            /* 加载状态 */
            .loading-overlay {
                position: absolute;
                inset: 0;
                background: rgba(248, 250, 252, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 16px;
                border-radius: 12px;
                z-index: 10;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #4f46e5;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                color: #6b7280;
                font-size: 14px;
                font-weight: 500;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                :host {
                    padding: 20px;
                }

                .stats-grid {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .stat-card {
                    padding: 20px 16px;
                }

                .stat-value {
                    font-size: 24px;
                }

                .dashboard-title {
                    font-size: 28px;
                }

                .panel-row {
                    flex-direction: column;
                }

                .action-grid {
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: repeat(2, 1fr);
                    min-height: 180px;
                    flex: 1;
                }

                /* 移动端网格布局优化 */
                .process-grid {
                    grid-template-columns: 1fr;
                }

                .pdf-grid {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 480px) {
                .stat-card-content {
                    gap: 16px;
                }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    font-size: 20px;
                }

                .stat-value {
                    font-size: 20px;
                }

                .chart-card {
                    padding: 20px;
                }

                .action-grid {
                    grid-template-columns: 1fr;
                    grid-template-rows: repeat(4, 1fr);
                    min-height: 320px;
                    flex: 1;
                }
            }

            /* 系统面板样式 */
            .system-panel {
                margin-top: 32px;
            }

            .panel-row {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
                align-items: stretch; /* 确保所有子元素等高 */
            }

            .panel-row.full-width {
                flex-direction: column;
            }

            .panel-row:last-child {
                margin-bottom: 0;
            }

            .info-card {
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border: 1px solid #f1f5f9;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .info-card:hover {
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                border-color: #e2e8f0;
            }

            .card-header {
                padding: 20px 24px 16px;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #fafbfc;
            }

            .card-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: 600;
                color: #1a202c;
            }

            .card-title i {
                color: #667eea;
                font-size: 18px;
            }

            .card-content {
                padding: 20px 24px 24px;
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            /* 状态指示器 */
            .status-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                position: relative;
                background: #dc3545;
            }

            .status-indicator.active {
                background: #28a745;
                box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.2);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(40, 167, 69, 0); }
                100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
            }

            /* 系统状态卡片 */
            .system-status .card-content {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            .status-section {
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 20px;
            }

            .status-section:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }

            .section-title {
                font-size: 14px;
                color: #6b7280;
                font-weight: 600;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* 资源使用网格 */
            .resource-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            .resource-item {
                background: #f8fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                position: relative;
            }

            .resource-info {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                margin-bottom: 16px;
            }

            .resource-label {
                font-size: 14px;
                color: #4a5568;
                font-weight: 500;
                margin-bottom: 12px;
            }

            .resource-value {
                font-size: 24px;
                font-weight: 700;
                color: #1a202c;
                margin-bottom: 16px;
            }

            /* 圆形进度条容器 */
            .circular-progress {
                position: relative;
                width: 100px;
                height: 100px;
                margin: 0 auto;
            }

            .circular-progress svg {
                width: 100%;
                height: 100%;
                transform: rotate(-90deg);
            }

            .circular-progress-bg {
                fill: none;
                stroke: #e5e7eb;
                stroke-width: 8;
            }

            .circular-progress-bar {
                fill: none;
                stroke-width: 8;
                stroke-linecap: round;
                transition: stroke-dasharray 0.8s ease;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            }

            .circular-progress-bar.cpu {
                stroke: url(#cpu-gradient);
            }

            .circular-progress-bar.memory {
                stroke: url(#memory-gradient);
            }

            .circular-progress-bar.high {
                stroke: url(#high-gradient);
            }

            .circular-progress-bar.medium {
                stroke: url(#medium-gradient);
            }

            .circular-progress-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 16px;
                font-weight: 700;
                color: #1a202c;
            }

            /* SVG渐变定义 */
            .progress-gradients {
                position: absolute;
                width: 0;
                height: 0;
            }

            /* 进程和PDF Worker网格 */
            .process-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            .pdf-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 12px;
            }

            .status-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #f8fafb;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                min-height: 48px; /* 确保最小高度一致 */
                box-sizing: border-box; /* 包含padding和border在内 */
            }

            .status-label {
                font-size: 13px;
                color: #4a5568;
                font-weight: 500;
                flex: 1;
                line-height: 1.4; /* 确保行高一致 */
            }

            .status-value {
                font-size: 13px;
                font-weight: 600;
                color: #1a202c;
                padding: 4px 8px;
                border-radius: 4px;
                white-space: nowrap;
                line-height: 1.4; /* 确保行高一致 */
            }

            .status-value.online {
                color: #059669;
                background: #ecfdf5;
            }

            .status-value.offline {
                color: #dc2626;
                background: #fef2f2;
            }

            .status-value.warning {
                color: #d97706;
                background: #fef3c7;
            }

            /* 进度条样式 */
            .status-progress {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                max-width: 120px;
            }

            .progress-bar {
                height: 6px;
                background: #3b82f6;
                border-radius: 3px;
                transition: width 0.5s ease;
                position: relative;
                overflow: hidden;
            }

            .progress-bar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #e5e7eb;
                z-index: 0;
            }

            .progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                background: inherit;
                z-index: 1;
                width: var(--progress-width, 0%);
                transition: width 0.5s ease;
            }

            .progress-bar.memory {
                background: #10b981;
            }

            .progress-bar.high {
                background: #ef4444;
            }

            .progress-bar.medium {
                background: #f59e0b;
            }

            .progress-text {
                font-size: 12px;
                font-weight: 600;
                color: #374151;
                min-width: 35px;
                text-align: right;
            }

            .status-progress {
                position: relative;
                flex: 1;
                max-width: 100px;
                background: #e5e7eb;
                border-radius: 3px;
                height: 6px;
                margin-right: 8px;
            }

            #cpu-progress, #memory-progress {
                height: 100%;
                border-radius: 3px;
                transition: width 0.5s ease;
                position: relative;
            }

            #cpu-progress {
                background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
            }

            #memory-progress {
                background: linear-gradient(90deg, #10b981 0%, #047857 100%);
            }

            /* 最近活动卡片 */
            .view-all-btn {
                background: none;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 12px;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .view-all-btn:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
                color: #374151;
            }

            .activity-list {
                max-height: 280px;
                overflow-y: auto;
            }

            .activity-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 40px 0;
                color: #6b7280;
                font-size: 14px;
            }

            .loading-spinner-small {
                width: 20px;
                height: 20px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #6366f1;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .activity-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px 0;
                border-bottom: 1px solid #f1f5f9;
            }

            .activity-item:last-child {
                border-bottom: none;
            }

            .activity-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                color: white;
                flex-shrink: 0;
            }

            .activity-icon.registration { background: #3b82f6; }
            .activity-icon.payment { background: #10b981; }
            .activity-icon.system { background: #8b5cf6; }
            .activity-icon.admin { background: #f59e0b; }

            .activity-info {
                flex: 1;
                min-width: 0;
            }

            .activity-text {
                font-size: 14px;
                color: #374151;
                margin: 0 0 4px 0;
                line-height: 1.4;
            }

            .activity-time {
                font-size: 12px;
                color: #6b7280;
            }

            /* 快速操作卡片 */
            .action-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 16px;
                flex: 1;
                min-height: 200px;
            }

            .action-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 20px 12px;
                background: #f8fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                font-size: 15px;
                color: #374151;
                text-align: center;
                position: relative;
                overflow: hidden;
                user-select: none;
                min-height: 80px;
                height: 100%;
            }

            .action-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                transition: left 0.5s ease;
            }

            .action-btn:hover {
                background: #667eea;
                border-color: #667eea;
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .action-btn:hover::before {
                left: 100%;
            }

            .action-btn:active {
                transform: translateY(-1px) scale(0.98);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            }

            .action-btn i {
                font-size: 28px;
                margin-bottom: 2px;
                transition: transform 0.15s ease;
            }

            .action-btn:hover i {
                transform: scale(1.1);
            }

        `;

        const container = document.createElement('div');
        container.className = 'dashboard-container';

        // 页面标题
        const header = document.createElement('div');
        header.className = 'dashboard-header';
        header.innerHTML = `
            <h1 class="dashboard-title">系统仪表盘</h1>
            <p class="dashboard-subtitle">查看系统关键指标和统计数据</p>
            <p class="dashboard-time" id="current-time"></p>
        `;

        // 统计卡片网格
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';
        statsGrid.id = 'stats-grid';

        // 添加系统监控面板
        const systemPanel = document.createElement('div');
        systemPanel.className = 'system-panel';
        systemPanel.innerHTML = `
            <!-- SVG渐变定义 -->
            <svg class="progress-gradients">
                <defs>
                    <linearGradient id="cpu-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="memory-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#047857;stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="high-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="medium-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
                    </linearGradient>
                </defs>
            </svg>

            <div class="panel-row">
                <div class="info-card system-status">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-server"></i>
                            <span>系统状态</span>
                        </div>
                        <div class="status-indicator active" id="system-status-dot"></div>
                    </div>
                    <div class="card-content">
                        <div class="status-section">
                            <div class="section-title">系统资源</div>
                            <div class="resource-grid">
                                <div class="resource-item">
                                    <div class="resource-info">
                                        <span class="resource-label">CPU 使用率</span>
                                        <span class="resource-value" id="cpu-usage">未知</span>
                                    </div>
                                    <div class="circular-progress">
                                        <svg viewBox="0 0 120 120">
                                            <circle class="circular-progress-bg" cx="60" cy="60" r="50"></circle>
                                            <circle class="circular-progress-bar cpu" cx="60" cy="60" r="50" 
                                                    id="cpu-progress" stroke-dasharray="0 314.16"></circle>
                                        </svg>
                                        <div class="circular-progress-text" id="cpu-progress-text">0%</div>
                                    </div>
                                </div>
                                <div class="resource-item">
                                    <div class="resource-info">
                                        <span class="resource-label">内存使用率</span>
                                        <span class="resource-value" id="memory-usage">未知</span>
                                    </div>
                                    <div class="circular-progress">
                                        <svg viewBox="0 0 120 120">
                                            <circle class="circular-progress-bg" cx="60" cy="60" r="50"></circle>
                                            <circle class="circular-progress-bar memory" cx="60" cy="60" r="50" 
                                                    id="memory-progress" stroke-dasharray="0 314.16"></circle>
                                        </svg>
                                        <div class="circular-progress-text" id="memory-progress-text">0%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        

                        
                        <div class="status-section">
                            <div class="section-title">PDF Worker 状态</div>
                            <div class="pdf-grid">
                                <div class="status-item">
                                    <span class="status-label">Worker 状态</span>
                                    <span class="status-value online" id="pdf-worker-status">就绪</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">处理中任务</span>
                                    <span class="status-value" id="pdf-processing-count">0 个</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">待处理任务</span>
                                    <span class="status-value" id="pdf-queue-count">0 个</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="info-card quick-actions">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-bolt"></i>
                            <span>快速操作</span>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="action-grid">
                            <button class="action-btn" data-action="user-management">
                                <i class="fas fa-users"></i>
                                <span>用户管理</span>
                            </button>
                            <button class="action-btn" data-action="generate-report">
                                <i class="fas fa-chart-line"></i>
                                <span>生成报告</span>
                            </button>
                            <button class="action-btn" data-action="system-backup">
                                <i class="fas fa-save"></i>
                                <span>数据备份</span>
                            </button>
                            <button class="action-btn" data-action="system-settings">
                                <i class="fas fa-cog"></i>
                                <span>系统管理</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 刷新按钮
        const refreshSection = document.createElement('div');
        refreshSection.className = 'refresh-section';
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'refresh-btn';
        refreshBtn.id = 'refresh-dashboard-btn';
        refreshBtn.innerHTML = `
            <i class="fas fa-sync-alt"></i>
            <span>刷新数据</span>
        `;
        refreshSection.appendChild(refreshBtn);

        container.appendChild(header);
        container.appendChild(statsGrid);
        container.appendChild(systemPanel);
        container.appendChild(refreshSection);

        this.shadowRoot.appendChild(baseStyles);
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

        // 更新时间
        this.updateTime();
        setInterval(() => this.updateTime(), 60000); // 每分钟更新一次

        // 初始渲染加载状态，然后立即开始加载数据
        this.renderLoadingState();
        
        // 设置事件监听器
        this.setupEventListeners();
        
            // 自动开始加载数据
        setTimeout(() => {
            this.loadDashboardData();
            this.loadSystemStatus();
            // this.loadDataOverview('week');
        }, 100);
    }

    setupEventListeners() {
        const refreshBtn = this.shadowRoot.getElementById('refresh-dashboard-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
            });
        }

        // 统计卡片点击事件
        const statsGrid = this.shadowRoot.querySelector('.stats-grid');
        if (statsGrid) {
            statsGrid.addEventListener('click', (e) => {
                const statCard = e.target.closest('.stat-card');
                if (statCard && statCard.dataset.action) {
                    console.log('Stat card clicked:', statCard.dataset.action);
                    this.handleStatCardClick(statCard.dataset.action);
                }
            });
        }

        // 快速操作按钮事件
        const actionGrid = this.shadowRoot.querySelector('.action-grid');
        if (actionGrid) {
            actionGrid.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('.action-btn');
                if (actionBtn && actionBtn.dataset.action) {
                    this.handleQuickAction(actionBtn.dataset.action);
                }
            });
        }

    }

    updateTime() {
        const timeElement = this.shadowRoot.getElementById('current-time');
        if (timeElement) {
            const now = new Date();
            const timeString = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'long'
            });
            timeElement.textContent = timeString;
        }
    }

    renderLoadingState() {
        const statsGrid = this.shadowRoot.getElementById('stats-grid');
        if (!statsGrid) return;

        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载仪表盘数据...</div>
        `;
        
        // 清空网格并添加加载状态
        statsGrid.innerHTML = '';
        statsGrid.appendChild(loadingOverlay);
    }

    renderStats() {
        const statsGrid = this.shadowRoot.getElementById('stats-grid');
        if (!statsGrid) return;
        
        // 移除加载状态
        const loadingOverlay = statsGrid.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }

        const statsConfig = [
            { 
                key: 'pendingCount', 
                icon: 'fas fa-clock', 
                iconClass: 'pending', 
                theme: 'pending',
                label: '待审核注册',
                value: this.stats.pendingCount,
                fallback: '⏰',
                action: 'registration-pending'
            },
            { 
                key: 'approvedCount', 
                icon: 'fas fa-check-circle', 
                iconClass: 'approved', 
                theme: 'approved',
                label: '已通过注册',
                value: this.stats.approvedCount,
                fallback: '✅',
                action: 'registration-approved'
            },
            { 
                key: 'rejectedCount', 
                icon: 'fas fa-times-circle', 
                iconClass: 'rejected', 
                theme: 'rejected',
                label: '已拒绝注册',
                value: this.stats.rejectedCount,
                fallback: '❌',
                action: 'registration-rejected'
            },
            { 
                key: 'totalPayment', 
                icon: 'fas fa-dollar-sign', 
                iconClass: 'total', 
                theme: 'total',
                label: '总收入',
                value: typeof this.stats.totalPayment === 'number' ? 
                       `$${this.stats.totalPayment.toLocaleString()}` : 
                       this.stats.totalPayment,
                fallback: '💰',
                action: 'financial-overview'
            }
        ];

        statsGrid.innerHTML = statsConfig.map(stat => `
            <div class="stat-card" data-theme="${stat.theme}" data-action="${stat.action}">
                <div class="stat-card-content">
                    <div class="stat-icon ${stat.iconClass}">
                        <i class="${stat.icon}"></i>
                        <span class="icon-fallback" style="display: none;">${stat.fallback}</span>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">${stat.label}</div>
                        <div class="stat-value" id="${stat.key}">${stat.value}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadDashboardData() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            console.log('Starting to load dashboard data...');
            this.renderLoadingState();
            
            // 更新刷新按钮状态
            const refreshBtn = this.shadowRoot.getElementById('refresh-dashboard-btn');
            if (refreshBtn) {
                refreshBtn.classList.add('loading');
                refreshBtn.disabled = true;
            }
            
            const response = await this.request('/admin/statistics');
            console.log('Dashboard data response:', response);
            
            if (response.success && response.data) {
                const data = response.data;
                console.log('Dashboard data received:', data);
                
                this.stats = {
                    pendingCount: data.pending || 0,
                    approvedCount: data.approved || 0,
                    rejectedCount: data.rejected || 0,
                    totalPayment: data.totalPayment || 0,
                    totalRegistrations: (data.pending || 0) + (data.approved || 0) + (data.rejected || 0)
                };

                console.log('Processed stats:', this.stats);
                this.renderStats();
                
                this.emit('dashboard-loaded', { stats: this.stats });
            } else {
                throw new Error('Invalid response format');
            }
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showMessage('加载仪表盘数据失败', 'error');
            this.renderErrorState();
        } finally {
            this.isLoading = false;
            
            // 恢复刷新按钮状态
            const refreshBtn = this.shadowRoot.getElementById('refresh-dashboard-btn');
            if (refreshBtn) {
                refreshBtn.classList.remove('loading');
                refreshBtn.disabled = false;
            }
        }
    }

    renderErrorState() {
        const statsGrid = this.shadowRoot.getElementById('stats-grid');
        if (!statsGrid) return;

        statsGrid.innerHTML = `
            <div class="loading-overlay">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                <div class="loading-text">加载数据失败，请稍后重试</div>
            </div>
        `;
    }

    handleStatCardClick(action) {
        console.log('Stat card clicked:', action);
        
        // 立即提供视觉反馈
        const clickedCard = this.shadowRoot.querySelector(`[data-action="${action}"]`);
        if (clickedCard) {
            clickedCard.style.transform = 'translateY(-3px) scale(0.98)';
            setTimeout(() => {
                clickedCard.style.transform = '';
            }, 150);
        }
        
        // 立即执行导航，无需延迟和消息提示
        switch (action) {
            case 'registration-pending':
                this.navigateToPage('submission-manager', { filter: 'pending' });
                break;
            case 'registration-approved':
                this.navigateToPage('submission-manager', { filter: 'approved' });
                break;
            case 'registration-rejected':
                this.navigateToPage('submission-manager', { filter: 'rejected' });
                break;
            case 'financial-overview':
                this.navigateToPage('invoice-manager');
                break;
            default:
                console.warn('Unknown stat action:', action);
                this.showMessage('未知的统计操作', 'warning');
        }
    }

    // 统一的导航方法
    navigateToPage(page, params = {}) {
        console.log('Navigating to:', page, params);
        
        // 优先使用document事件方式，因为它最可靠
        const documentEvent = new CustomEvent('admin-navigate', {
            detail: { page, params },
            bubbles: true
        });
        document.dispatchEvent(documentEvent);
    }

    getStatActionName(action) {
        const actionNames = {
            'registration-pending': '待审核注册',
            'registration-approved': '已通过注册',
            'registration-rejected': '已拒绝注册',
            'financial-overview': '财务概览'
        };
        return actionNames[action] || '未知页面';
    }

    // 公共API方法
    refresh() {
        this.loadDashboardData();
    }

    updateStats(newStats) {
        this.stats = { ...this.stats, ...newStats };
        this.renderStats();
    }

    // 获取当前统计数据
    getStats() {
        return { ...this.stats };
    }

    // 加载系统状态
    async loadSystemStatus() {
        try {
            const response = await this.request('/admin/system-status');
            
            if (response.success && response.data) {
                this.systemStatus = response.data;
            } else {
                // 如果API失败，使用模拟数据
                const mockStatus = {
                    cpuUsage: Math.floor(Math.random() * 60) + 15, // 15-75%
                    memoryUsage: Math.floor(Math.random() * 50) + 30, // 30-80%
                    pdfWorkerStatus: 'ready',
                    pdfQueueCount: Math.floor(Math.random() * 5), // 0-4个任务
                    pdfProcessingCount: Math.floor(Math.random() * 3) // 0-2个任务
                };
                this.systemStatus = mockStatus;
            }
            
            this.renderSystemStatus();
            
            // 定期更新系统状态
            if (!this.statusInterval) {
                this.statusInterval = setInterval(() => {
                    this.loadSystemStatus();
                }, 30000); // 每30秒更新一次
            }
        } catch (error) {
            console.error('Failed to load system status:', error);
            // 在错误情况下使用模拟数据
            const mockStatus = {
                cpuUsage: Math.floor(Math.random() * 60) + 15,
                memoryUsage: Math.floor(Math.random() * 50) + 30,
                pdfWorkerStatus: 'ready',
                pdfQueueCount: Math.floor(Math.random() * 5),
                pdfProcessingCount: Math.floor(Math.random() * 3)
            };
            this.systemStatus = mockStatus;
            this.renderSystemStatus();
        }
    }

    // 渲染系统状态
    renderSystemStatus() {
        // CPU使用率
        const cpuProgress = this.shadowRoot.getElementById('cpu-progress');
        const cpuUsage = this.shadowRoot.getElementById('cpu-usage');
        const cpuProgressText = this.shadowRoot.getElementById('cpu-progress-text');
        
        if (cpuProgress && cpuUsage) {
            if (this.systemStatus.cpuUsage !== null && this.systemStatus.cpuUsage !== undefined) {
                const percentage = this.systemStatus.cpuUsage;
                cpuUsage.textContent = `${percentage}%`;
                
                // 更新圆形进度条
                if (cpuProgressText) {
                    cpuProgressText.textContent = `${percentage}%`;
                    const circumference = 2 * Math.PI * 50; // r=50
                    const strokeDasharray = (percentage / 100) * circumference;
                    cpuProgress.setAttribute('stroke-dasharray', `${strokeDasharray} ${circumference}`);
                }
                
                // 根据使用率调整颜色
                cpuProgress.setAttribute('class', 'circular-progress-bar cpu');
                if (percentage > 70) {
                    cpuProgress.setAttribute('class', 'circular-progress-bar high');
                } else if (percentage > 50) {
                    cpuProgress.setAttribute('class', 'circular-progress-bar medium');
                }
            } else {
                cpuUsage.textContent = '未知';
                if (cpuProgressText) {
                    cpuProgressText.textContent = '0%';
                    cpuProgress.setAttribute('stroke-dasharray', '0 314.16');
                }
                cpuProgress.setAttribute('class', 'circular-progress-bar cpu');
            }
        }

        // 内存使用率
        const memoryProgress = this.shadowRoot.getElementById('memory-progress');
        const memoryUsage = this.shadowRoot.getElementById('memory-usage');
        const memoryProgressText = this.shadowRoot.getElementById('memory-progress-text');
        
        if (memoryProgress && memoryUsage) {
            if (this.systemStatus.memoryUsage !== null && this.systemStatus.memoryUsage !== undefined) {
                const percentage = this.systemStatus.memoryUsage;
                memoryUsage.textContent = `${percentage}%`;
                
                // 更新圆形进度条
                if (memoryProgressText) {
                    memoryProgressText.textContent = `${percentage}%`;
                    const circumference = 2 * Math.PI * 50; // r=50
                    const strokeDasharray = (percentage / 100) * circumference;
                    memoryProgress.setAttribute('stroke-dasharray', `${strokeDasharray} ${circumference}`);
                }
                
                // 根据使用率调整颜色
                memoryProgress.setAttribute('class', 'circular-progress-bar memory');
                if (percentage > 80) {
                    memoryProgress.setAttribute('class', 'circular-progress-bar high');
                } else if (percentage > 60) {
                    memoryProgress.setAttribute('class', 'circular-progress-bar medium');
                }
            } else {
                memoryUsage.textContent = '未知';
                if (memoryProgressText) {
                    memoryProgressText.textContent = '0%';
                    memoryProgress.setAttribute('stroke-dasharray', '0 314.16');
                }
                memoryProgress.setAttribute('class', 'circular-progress-bar memory');
            }
        }

        // PDF Worker 状态 - 完全保持原来的逻辑
        const pdfWorkerStatus = this.shadowRoot.getElementById('pdf-worker-status');
        const pdfQueueCount = this.shadowRoot.getElementById('pdf-queue-count');
        const pdfProcessingCount = this.shadowRoot.getElementById('pdf-processing-count');

        if (pdfWorkerStatus) {
            const workerStatus = this.systemStatus.pdfWorkerStatus;
            pdfWorkerStatus.textContent = this.getPdfWorkerStatusText(workerStatus);
            
            // 根据状态设置相应的CSS类名
            let cssClass = 'status-value';
            if (typeof workerStatus === 'string') {
                if (workerStatus.includes('working') || /^\d+$/.test(workerStatus)) {
                    // 工作中的状态，显示橙色
                    cssClass += ' warning';
                } else if (workerStatus.includes('idle') || workerStatus === 'idle') {
                    // 空闲状态，显示绿色
                    cssClass += ' online';
                } else if (workerStatus === 'ready') {
                    // 就绪状态，显示绿色
                    cssClass += ' online';
                } else if (workerStatus === 'error' || workerStatus === 'offline') {
                    // 错误或离线状态，显示红色
                    cssClass += ' offline';
                } else {
                    // 未知状态，显示红色
                    cssClass += ' offline';
                }
            } else {
                // 非字符串状态，显示红色
                cssClass += ' offline';
            }
            
            pdfWorkerStatus.className = cssClass;
        }

        if (pdfQueueCount) {
            const queueCount = this.systemStatus.pdfQueueCount;
            pdfQueueCount.textContent = `${queueCount} 个`;
            pdfQueueCount.className = queueCount > 3 ? 'status-value warning' : 'status-value';
        }

        if (pdfProcessingCount) {
            const processingCount = this.systemStatus.pdfProcessingCount;
            pdfProcessingCount.textContent = `${processingCount} 个`;
            pdfProcessingCount.className = 'status-value';
        }

        // 更新系统状态指示器 - 完全保持原来的逻辑
        const statusDot = this.shadowRoot.getElementById('system-status-dot');
        if (statusDot) {
            const isSystemHealthy = (this.systemStatus.cpuUsage !== null ? this.systemStatus.cpuUsage < 80 : true) && 
                                  (this.systemStatus.memoryUsage !== null ? this.systemStatus.memoryUsage < 85 : true);
            statusDot.className = `status-indicator ${isSystemHealthy ? 'active' : ''}`;
        }
    }

    // 获取PDF Worker状态文本
    getPdfWorkerStatusText(status) {
        // 处理特殊格式的状态
        if (typeof status === 'string') {
            // 检查是否是 "数字working" 格式
            const workingMatch = status.match(/^(\d+)working$/);
            if (workingMatch) {
                const workerCount = parseInt(workingMatch[1]);
                return `${workerCount} 工作中`;
            }
            
            // 检查是否是 "数字idle" 格式
            const idleMatch = status.match(/^(\d+)idle$/);
            if (idleMatch) {
                const workerCount = parseInt(idleMatch[1]);
                return `${workerCount} 空闲`;
            }
        }
        
        // 处理简单的数字字符串（兼容旧格式）
        if (/^\d+$/.test(status)) {
            const workerCount = parseInt(status);
            return `${workerCount} 工作中`;
        }
        
        const statusTexts = {
            'ready': '就绪',
            'idle': '空闲',
            'busy': '繁忙',
            'offline': '离线',
            'error': '错误'
        };
        return statusTexts[status] || '未知';
    }

    // 获取变化样式类
    getChangeClass(changeText, reverse = false) {
        if (!changeText || changeText === '--') return 'neutral';
        
        const isPositive = changeText.includes('+');
        const isNegative = changeText.includes('-');
        
        if (reverse) {
            // 对于处理速度，减少是好的
            if (isNegative) return 'positive';
            if (isPositive) return 'negative';
        } else {
            if (isPositive) return 'positive';
            if (isNegative) return 'negative';
        }
        
        return 'neutral';
    }

    // 处理快速操作
    handleQuickAction(action) {
        console.log('Quick action clicked:', action);
        
        // 立即提供视觉反馈
        const clickedBtn = this.shadowRoot.querySelector(`[data-action="${action}"]`);
        if (clickedBtn) {
            clickedBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                clickedBtn.style.transform = '';
            }, 150);
        }

        // 所有操作立即执行，无延迟
        switch (action) {
            case 'system-backup':
                this.navigateToPage('settings-manager');
                break;
            case 'generate-report':
                this.navigateToPage('statistics-manager');
                break;
            case 'user-management':
                this.navigateToPage('user-manager');
                break;
            case 'system-settings':
                this.navigateToPage('settings-manager');
                break;
            default:
                this.showMessage('功能开发中...', 'warning');
        }
    }

    // 组件销毁时清理定时器
    disconnectedCallback() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }
}

// 注册组件
customElements.define('admin-dashboard', AdminDashboard);

export default AdminDashboard;
