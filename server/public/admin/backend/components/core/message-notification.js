import BaseComponent from './base-component.js';

/**
 * 消息通知组件
 * 显示系统提示、错误和成功消息
 */
class MessageNotification extends BaseComponent {
    constructor() {
        super();
        this.messages = [];
        this.maxMessages = 5;
        this.defaultDuration = 5000;
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            }

            .message-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .message {
                pointer-events: all;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                transform: translateX(100%);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                cursor: pointer;
            }

            .message.show {
                transform: translateX(0);
            }

            .message.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .message-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                position: relative;
                z-index: 2;
            }

            .message-icon {
                font-size: 20px;
                margin-top: 2px;
                flex-shrink: 0;
            }

            .message-text {
                flex: 1;
                line-height: 1.4;
            }

            .message-title {
                font-weight: 600;
                margin-bottom: 4px;
                font-size: 14px;
            }

            .message-description {
                font-size: 13px;
                opacity: 0.9;
                margin: 0;
            }

            .message-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: currentColor;
                cursor: pointer;
                padding: 4px;
                border-radius: 50%;
                transition: background-color 0.2s ease;
                opacity: 0.7;
                z-index: 3;
            }

            .message-close:hover {
                background: rgba(255,255,255,0.2);
                opacity: 1;
            }

            .message-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255,255,255,0.3);
                transform-origin: left;
                transition: transform linear;
                z-index: 1;
            }

            /* 消息类型样式 */
            .message.success {
                background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                color: white;
            }

            .message.error {
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
            }

            .message.warning {
                background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
                color: white;
            }

            .message.info {
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                color: white;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                :host {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }

                .message {
                    transform: translateY(-100%);
                }

                .message.show {
                    transform: translateY(0);
                }

                .message.hide {
                    transform: translateY(-100%);
                }
            }

            @media (max-width: 480px) {
                .message {
                    padding: 12px 16px;
                }

                .message-content {
                    gap: 10px;
                }

                .message-icon {
                    font-size: 18px;
                }

                .message-title {
                    font-size: 13px;
                }

                .message-description {
                    font-size: 12px;
                }
            }
        `;

        const container = document.createElement('div');
        container.className = 'message-container';
        container.id = 'message-container';

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);
    }

    showMessage(message, type = 'info', duration = null) {
        const messageData = {
            id: Date.now() + Math.random(),
            text: message,
            type: type,
            duration: duration || this.defaultDuration,
            timestamp: Date.now()
        };

        // 限制消息数量
        if (this.messages.length >= this.maxMessages) {
            this.removeOldestMessage();
        }

        this.messages.push(messageData);
        this.renderMessage(messageData);
    }

    renderMessage(messageData) {
        const container = this.shadowRoot.getElementById('message-container');
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${messageData.type}`;
        messageEl.setAttribute('data-message-id', messageData.id);
        
        const icon = this.getIconForType(messageData.type);
        const title = this.getTitleForType(messageData.type);
        
        messageEl.innerHTML = `
            <div class="message-content">
                <div class="message-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="message-text">
                    <div class="message-title">${title}</div>
                    <p class="message-description">${messageData.text}</p>
                </div>
            </div>
            <button class="message-close">
                <i class="fas fa-times"></i>
            </button>
            <div class="message-progress"></div>
        `;

        // 添加关闭事件
        const closeBtn = messageEl.querySelector('.message-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeMessage(messageData.id);
        });

        // 点击消息也可以关闭
        messageEl.addEventListener('click', () => {
            this.removeMessage(messageData.id);
        });

        container.appendChild(messageEl);

        // 触发显示动画
        requestAnimationFrame(() => {
            messageEl.classList.add('show');
            
            // 启动进度条动画
            const progress = messageEl.querySelector('.message-progress');
            progress.style.transformOrigin = 'left';
            progress.style.transform = 'scaleX(0)';
            progress.style.transition = `transform ${messageData.duration}ms linear`;
            
            requestAnimationFrame(() => {
                progress.style.transform = 'scaleX(1)';
            });
        });

        // 自动移除
        if (messageData.duration > 0) {
            setTimeout(() => {
                this.removeMessage(messageData.id);
            }, messageData.duration);
        }
    }

    removeMessage(messageId) {
        const messageEl = this.shadowRoot.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;

        messageEl.classList.add('hide');
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
            
            // 从数组中移除
            this.messages = this.messages.filter(msg => msg.id !== messageId);
        }, 300);
    }

    removeOldestMessage() {
        if (this.messages.length > 0) {
            const oldestMessage = this.messages[0];
            this.removeMessage(oldestMessage.id);
        }
    }

    getIconForType(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getTitleForType(type) {
        const titles = {
            success: '成功',
            error: '错误',
            warning: '警告',
            info: '提示'
        };
        return titles[type] || titles.info;
    }

    // 公共API方法
    success(message, duration = null) {
        this.showMessage(message, 'success', duration);
    }

    error(message, duration = null) {
        this.showMessage(message, 'error', duration);
    }

    warning(message, duration = null) {
        this.showMessage(message, 'warning', duration);
    }

    info(message, duration = null) {
        this.showMessage(message, 'info', duration);
    }

    clear() {
        const container = this.shadowRoot.getElementById('message-container');
        const messages = container.querySelectorAll('.message');
        
        messages.forEach(messageEl => {
            messageEl.classList.add('hide');
        });

        setTimeout(() => {
            container.innerHTML = '';
            this.messages = [];
        }, 300);
    }

    setMaxMessages(max) {
        this.maxMessages = max;
    }

    setDefaultDuration(duration) {
        this.defaultDuration = duration;
    }
}

// 注册组件
customElements.define('message-notification', MessageNotification);

export default MessageNotification;
