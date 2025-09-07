<template>
  <div>
    <!-- 这个组件只用于路由处理，不显示内容 -->
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  mounted() {
    // 这个组件被挂载时，路由守卫已经处理了重定向逻辑
    // 这里不需要额外的逻辑
  }
}
</script>
