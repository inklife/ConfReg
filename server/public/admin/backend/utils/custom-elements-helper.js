/**
 * 安全注册自定义元素工具函数
 * 避免重复注册导致的错误
 */

/**
 * 安全地定义自定义元素
 * @param {string} name - 元素名称
 * @param {CustomElementConstructor} constructor - 元素构造函数
 * @param {Object} options - 可选的定义选项
 * @returns {boolean} - 是否成功注册（true：新注册，false：已存在）
 */
function safeDefineCustomElement(name, constructor, options = {}) {
    try {
        // 检查元素是否已经注册
        if (customElements.get(name)) {
            console.warn(`Custom element '${name}' is already defined, skipping redefinition.`);
            return false;
        }
        
        // 注册新元素
        customElements.define(name, constructor, options);
        console.log(`Custom element '${name}' successfully registered.`);
        return true;
    } catch (error) {
        console.error(`Failed to define custom element '${name}':`, error);
        return false;
    }
}

/**
 * 检查自定义元素是否已注册
 * @param {string} name - 元素名称
 * @returns {boolean} - 是否已注册
 */
function isCustomElementDefined(name) {
    return !!customElements.get(name);
}

/**
 * 等待自定义元素被定义
 * @param {string} name - 元素名称
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<void>}
 */
function whenCustomElementDefined(name, timeout = 5000) {
    return Promise.race([
        customElements.whenDefined(name),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout waiting for custom element '${name}'`)), timeout)
        )
    ]);
}

// 导出函数（如果支持模块化）
if (typeof window !== 'undefined') {
    window.safeDefineCustomElement = safeDefineCustomElement;
    window.isCustomElementDefined = isCustomElementDefined;
    window.whenCustomElementDefined = whenCustomElementDefined;
}

// ES6 模块导出
export { safeDefineCustomElement, isCustomElementDefined, whenCustomElementDefined };
