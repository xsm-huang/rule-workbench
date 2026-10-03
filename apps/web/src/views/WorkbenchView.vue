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
        <el-menu-item index="/schemes"> 方案管理 </el-menu-item>
      </el-menu>
    </div>
    <div class="main-area">
      <header class="topbar">
        <span class="page-title">方案工作台</span>
        <div class="user-actions">
          <span class="user-name">
            <!-- 同时显示用户和角色，方便验收三个账号。 -->
            <span>
              {{ bootstrap?.user.displayName }} ·
              {{ bootstrap?.user.role }}
            </span>
          </span>
          <el-button link type="primary" :loading="loggingOut" @click="handleLogout">
            退出登录
          </el-button>
        </div>
      </header>
      <main class="content">
        <el-skeleton v-if="isPending" :rows="6" animated />
        <!-- 403 -->
        <ForbiddenState v-else-if="isForbidden"></ForbiddenState>
        <el-result v-else-if="isError" icon="error" title="工作台加载失败">
          <template #extra>
            <!-- refetch 重新执行相同的 bootstrap 查询。 -->
            <el-button type="primary" @click="refetch()"> 重试 </el-button>
          </template>
        </el-result>
        <RouterView v-else />
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getApiErrorMessage, isForbiddenError } from '@/api/error'
import { useWorkbenchBootstrap } from '@/queries/workbench'
import { pinia } from '@/stores'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import ForbiddenState from '@/components/ForbiddenState.vue'

const route = useRoute()
const router = useRouter()

const authStore = useAuthStore(pinia)
const loggingOut = ref(false)

const handleLogout = async (): Promise<void> => {
  if (loggingOut.value) return

  loggingOut.value = true

  try {
    await authStore.logout()
    ElMessage.success('已退出登录')
    await router.replace({ name: 'login' })
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, '退出失败，请稍后重试'))
  } finally {
    loggingOut.value = false
  }
}

// 初始化获取数据
const { data: bootstrap, isPending, isError, error, refetch } = useWorkbenchBootstrap()
const isForbidden = computed(() => isForbiddenError(error.value))
</script>

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

.user-actions {
  // 让用户名和退出按钮水平排列。
  display: flex;
  align-items: center;
  gap: 12px;
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
