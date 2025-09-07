import globalSSEManager from './globalSSEManager';

export default {
  install(Vue) {
    Vue.prototype.$globalSSEManager = globalSSEManager;
  }
};
