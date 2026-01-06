/**
 * 简单的图片查看器工具类
 * 替代基于 Canvas 的 PixelVoyager，使用纯 JS+CSS 实现
 */
class SimpleImageViewer {
    constructor() {
        this.viewer = null;
        this.img = null;
        this.scale = 1;
        this.rotation = 0;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.isFitToScreen = true; // 是否是适配屏幕模式
        this.resetBtn = null; // 重置/1:1按钮的引用
        
        // 添加全局样式
        this.addGlobalStyles();
    }

    addGlobalStyles() {
        if (document.getElementById('simple-image-viewer-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'simple-image-viewer-styles';
        style.textContent = `
            .image-viewer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .image-viewer-img {
                max-width: 90vw;
                max-height: 90vh;
                object-fit: contain;
                cursor: grab;
                transition: transform 0.3s ease;
                user-select: none;
                -webkit-user-drag: none;
            }

            .image-viewer-img:active {
                cursor: grabbing;
            }

            .image-viewer-toolbar {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                gap: 10px;
                z-index: 1000000;
            }

            .viewer-btn {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #374151;
                font-size: 16px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .viewer-btn:hover {
                background: #ffffff;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                color: #3b82f6;
            }

            .viewer-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }

    open(imageUrl) {
        // 创建查看器容器
        this.viewer = document.createElement('div');
        this.viewer.className = 'image-viewer-overlay';
        
        // 创建图片元素
        this.img = document.createElement('img');
        this.img.src = imageUrl;
        this.img.className = 'image-viewer-img';
        
        // 创建工具栏
        const toolbar = document.createElement('div');
        toolbar.className = 'image-viewer-toolbar';
        toolbar.innerHTML = `
            <button class="viewer-btn" data-action="zoom-in" title="放大">
                <i class="fas fa-search-plus"></i>
            </button>
            <button class="viewer-btn" data-action="zoom-out" title="缩小">
                <i class="fas fa-search-minus"></i>
            </button>
            <button class="viewer-btn" data-action="rotate-left" title="左旋转">
                <i class="fas fa-undo"></i>
            </button>
            <button class="viewer-btn" data-action="rotate-right" title="右旋转">
                <i class="fas fa-redo"></i>
            </button>
            <button class="viewer-btn" data-action="reset" title="适配屏幕">
                <i class="fas fa-compress"></i>
            </button>
            <button class="viewer-btn" data-action="close" title="关闭">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.viewer.appendChild(this.img);
        this.viewer.appendChild(toolbar);
        document.body.appendChild(this.viewer);
        
        // 保存重置按钮的引用
        this.resetBtn = toolbar.querySelector('[data-action="reset"]');
        
        // 重置状态
        this.scale = 1;
        this.rotation = 0;
        this.translateX = 0;
        this.translateY = 0;
        this.isFitToScreen = true;
        
        // 初始化重置按钮状态
        this.updateResetButton();
        
        // 绑定事件
        this.bindEvents(toolbar);
    }

    bindEvents(toolbar) {
        // 工具栏按钮事件
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.viewer-btn');
            if (!btn) return;
            
            const action = btn.dataset.action;
            this.handleAction(action);
        });
        
        // 鼠标拖动
        this.img.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
        });
        
        const handleMouseMove = (e) => {
            if (!this.isDragging) return;
            this.translateX = e.clientX - this.startX;
            this.translateY = e.clientY - this.startY;
            this.updateTransform();
        };
        
        const handleMouseUp = () => {
            this.isDragging = false;
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // 鼠标滚轮缩放
        this.img.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.scale = Math.max(0.2, Math.min(5, this.scale + delta));
            this.updateTransform();
        });
        
        // 点击背景关闭
        this.viewer.addEventListener('click', (e) => {
            if (e.target === this.viewer) {
                this.close();
            }
        });
        
        // ESC 键关闭
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // 清理事件监听器
        this.viewer.addEventListener('removed', () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keydown', handleKeydown);
        });
    }

    handleAction(action) {
        switch(action) {
            case 'zoom-in':
                this.scale = Math.min(this.scale + 0.2, 5);
                this.isFitToScreen = false;
                this.updateResetButton();
                break;
            case 'zoom-out':
                this.scale = Math.max(this.scale - 0.2, 0.2);
                this.isFitToScreen = false;
                this.updateResetButton();
                break;
            case 'rotate-left':
                this.rotation -= 90;
                break;
            case 'rotate-right':
                this.rotation += 90;
                break;
            case 'reset':
                this.rotation = 0;
                this.translateX = 0;
                this.translateY = 0;
                
                if (this.isFitToScreen) {
                    // 当前是适配屏幕，切换到1:1原始尺寸
                    this.show1to1();
                } else {
                    // 当前不是适配屏幕，恢复适配屏幕
                    this.fitToScreen();
                }
                break;
            case 'close':
                this.close();
                return;
        }
        this.updateTransform();
    }

    updateTransform() {
        if (!this.img) return;
        this.img.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale}) rotate(${this.rotation}deg)`;
    }

    updateResetButton() {
        if (!this.resetBtn) return;
        
        if (this.isFitToScreen) {
            this.resetBtn.title = '1:1 原始尺寸';
            this.resetBtn.innerHTML = '<i class="fas fa-expand"></i>';
        } else {
            this.resetBtn.title = '适配屏幕';
            this.resetBtn.innerHTML = '<i class="fas fa-compress"></i>';
        }
    }

    show1to1() {
        // 显示图片的原始尺寸（1:1）
        if (!this.img) return;
        
        // 获取图片的原始尺寸
        const naturalWidth = this.img.naturalWidth;
        const naturalHeight = this.img.naturalHeight;
        const viewportWidth = window.innerWidth * 0.9;
        const viewportHeight = window.innerHeight * 0.9;
        
        // 计算当前图片显示的尺寸
        const currentWidth = Math.min(naturalWidth, viewportWidth);
        const currentHeight = Math.min(naturalHeight, viewportHeight);
        
        // 计算缩放比例：从当前适配尺寸到原始尺寸
        this.scale = naturalWidth / currentWidth;
        
        this.isFitToScreen = false;
        this.updateResetButton();
        this.updateTransform();
    }

    fitToScreen() {
        // 适配屏幕尺寸
        this.scale = 1;
        this.isFitToScreen = true;
        this.updateResetButton();
        this.updateTransform();
    }

    close() {
        if (this.viewer) {
            this.viewer.dispatchEvent(new Event('removed'));
            this.viewer.remove();
            this.viewer = null;
            this.img = null;
        }
    }

    /**
     * 初始化指定容器内的图片链接
     * @param {HTMLElement} container - 容器元素
     * @param {string} selector - 图片链接选择器，默认为 '.image-viewer-link'
     */
    static initializeLinks(container, selector = '.image-viewer-link') {
        const viewer = new SimpleImageViewer();
        const links = container.querySelectorAll(selector);
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const imageUrl = link.getAttribute('href');
                if (imageUrl) {
                    viewer.open(imageUrl);
                }
            });
        });
    }

    /**
     * 直接打开图片
     * @param {string} imageUrl - 图片 URL
     */
    static openImage(imageUrl) {
        const viewer = new SimpleImageViewer();
        viewer.open(imageUrl);
    }
}

// 导出为全局变量，方便在其他地方使用
window.SimpleImageViewer = SimpleImageViewer;
