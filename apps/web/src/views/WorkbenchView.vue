<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="workbench-layout">
    <div class="sidebar">
      <div class="brand">规则工作台</div>
      <el-menu
        class="navigation"
        background-color="transparent"
        text-color="#b9c3d6"
        active-text-color="#fff"
        :default-active="route.path"
        unique-opened
        router
      >
        <el-menu-item index="schemes"> 方案管理 </el-menu-item>
      </el-menu>
    </div>
    <div class="main-area">
      <header class="topbar">
        <span class="page-title">方案工作台</span>
        <span class="user-name">管理员</span>
      </header>
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.workbench-layout {
  display: flex;
  height: 100%;
  min-width: 960px;
  background: #f5f7fa;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  color: #fff;
  background: #18243a;
}

.brand {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
  font-size: 20px;
  font-weight: 600;
}

.main-area {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  flex-shrink: 0;
  padding: 0 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.user-name {
  color: #606266;
  font-size: 14px;
}

.content {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
</style>
