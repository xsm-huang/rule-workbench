<template>
  <section class="scheme-edit">
    <el-result
      v-if="!schemeId"
      icon="warning"
      title="缺少方案信息"
      sub-title="请返回方案列表重新选择"
      class="state-card"
    >
      <template #extra>
        <el-button @click="backToList">返回列表</el-button>
      </template>
    </el-result>

    <div
      v-else-if="isPending"
      v-loading="true"
      element-loading-text="正在加载方案"
      class="state-card"
    ></div>

    <el-result
      v-else-if="isForbiddenError(error) || (scheme && !scheme.permissions.canEdit)"
      icon="warning"
      title="无法编辑此方案"
      sub-title="仅负责人可以编辑草稿或已驳回的方案"
      class="state-card"
    >
      <template #extra>
        <el-button @click="backToDetail">查看详情</el-button>
        <el-button @click="backToList">返回列表</el-button>
      </template>
    </el-result>

    <el-result
      v-else-if="isError && !scheme"
      icon="error"
      title="方案加载失败"
      :sub-title="errorMessage"
      class="state-card"
    >
      <template #extra>
        <el-button type="primary" @click="retry">重新加载</el-button>
        <el-button @click="backToList">返回列表</el-button>
      </template>
    </el-result>

    <!-- ID 变化时重建表单；同一方案的后台刷新不重新回填输入。 -->
    <SchemeEditorView v-else-if="scheme" :key="schemeId" :initial-scheme="scheme" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiErrorMessage, isForbiddenError } from '@/api/error'
import { useSchemeDetail } from '@/queries/schemes'
import SchemeEditorView from './SchemeEditorView.vue'

const route = useRoute()
const router = useRouter()
const schemeId = computed(() => {
  const value = route.params.id
  const id = Array.isArray(value) ? value[0] : value
  return typeof id === 'string' ? id.trim() : ''
})

const { data: scheme, error, isError, isPending, refetch } = useSchemeDetail(schemeId)
const errorMessage = computed(() => getApiErrorMessage(error.value, '加载方案失败，请稍后重试'))

const retry = (): void => {
  void refetch()
}

const backToDetail = (): void => {
  void router.push({ name: 'scheme-detail', params: { id: schemeId.value } })
}

const backToList = (): void => {
  void router.push({ name: 'schemes' })
}
</script>

<style scoped lang="scss">
.scheme-edit {
  max-width: 1560px;
  margin: 0 auto;
}

.state-card {
  min-height: 280px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}
</style>
