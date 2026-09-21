<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { type SchemeListItem, getSchemeList } from '@/api/schemes'
import { ElMessage } from 'element-plus'

const schemeList = ref<SchemeListItem[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

const loadSchemeList = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getSchemeList()
    schemeList.value = response.items
  } catch (error) {
    errorMessage.value = `加载方案列表失败，请稍后重试`
    ElMessage.error(errorMessage.value)
    console.error('加载方案列表失败:', error)
  } finally {
    isLoading.value = false
  }
}
onMounted(() => {
  loadSchemeList()
})

type SchemeStatus = SchemeListItem['status']
type PricingMode = SchemeListItem['pricingMode']
type StatusTagType = 'success' | 'warning' | 'info' | 'danger'

const pricingModeMap: Record<PricingMode, string> = {
  UNIT_PRICE: '单价',
  TOTAL_POOL: '总池',
}
const statusConfig: Record<SchemeStatus, { label: string; type: StatusTagType }> = {
  DRAFT: { label: '草稿', type: 'info' },
  PENDING_REVIEW: { label: '待审核', type: 'warning' },
  PUBLISHED: { label: '已发布', type: 'success' },
  REJECTED: { label: '已驳回', type: 'danger' },
}

const getPricingModeLabel = (pricingMode: PricingMode): string => {
  return pricingModeMap[pricingMode]
}
</script>

<template>
  <section class="scheme-workbench">
    <header class="page-header">
      <div>
        <h2>方案管理</h2>
        <p class="page-description">创建和管理业务计价方案</p>
      </div>

      <el-button type="primary">新建方案</el-button>
    </header>

    <div class="table-card">
      <div class="table-toolbar">
        <span class="table-title">方案列表</span>
        <span class="table-count">共 {{ schemeList.length }} 条</span>
      </div>
      <el-table :data="schemeList" stripe border>
        <template #empty>
          <template v-if="errorMessage">
            <span>加载失败 </span>
            <!-- TODO 调整样式，对齐文字 -->
            <el-button type="text" @click="loadSchemeList" :loading="isLoading"> 刷新 </el-button>
          </template>
          <span v-else>暂无数据</span>
        </template>

        <el-table-column prop="code" label="方案编码" width="140" />
        <el-table-column prop="name" label="方案名称" min-width="200" />
        <el-table-column label="计价模式" width="140">
          <template #default="{ row }">
            {{ getPricingModeLabel(row.pricingMode) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="statusConfig[row.status as SchemeStatus].type">
              {{ statusConfig[row.status as SchemeStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ownerName" label="负责人" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
      </el-table>
    </div>
  </section>
</template>
<style scoped lang="scss">
.scheme-workbench {
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    color: #303133;
    font-size: 24px;
    line-height: 1.4;
  }
}

.page-description {
  margin-top: 4px;
  color: #909399;
  font-size: 14px;
}

.table-card {
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 4%);
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.table-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.table-count {
  color: #909399;
  font-size: 13px;
}
</style>
