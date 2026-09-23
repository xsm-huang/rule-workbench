<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import {
  type SchemeListQuery,
  type PricingMode,
  type SchemeStatus,
  type SchemeFilters,
  getSchemeList,
} from '@/api/schemes'

const route = useRoute()
const readQueryString = (key: string): string | undefined => {
  const value = route.query[key]
  const firstValue = Array.isArray(value) ? value[0] : value

  return typeof firstValue === 'string' && firstValue !== '' ? firstValue : undefined
}

const listQuery = computed<SchemeListQuery>(() => ({
  keyword: readQueryString('keyword'),
  status: readQueryString('status') as SchemeStatus | undefined,
  pricingMode: readQueryString('pricingMode') as PricingMode | undefined,
  ownerId: readQueryString('ownerId'),
  updatedFrom: readQueryString('updatedFrom'),
  updatedTo: readQueryString('updatedTo'),
  page: Number(readQueryString('page')) || 1,
  pageSize: Number(readQueryString('pageSize')) || 10,
  sort: readQueryString('sort') === 'updatedAt:asc' ? 'updatedAt:asc' : 'updatedAt:desc',
}))

// route.query 改变后，listQuery 是响应式的，TanStack Query 会自动请求新数据
const { data, isFetching, isError, refetch } = useQuery({
  queryKey: ['schemes', listQuery],
  queryFn: () => getSchemeList(listQuery.value),
})
const schemeList = computed(() => data.value?.items ?? [])
const errorMessage = computed(() => (isError.value ? '加载失败' : ''))
const loadSchemeList = async () => {
  await refetch()
}

const router = useRouter()
const replaceListQuery = (patch: Partial<SchemeListQuery>) => {
  void router.replace({
    query: {
      ...route.query,
      ...patch,
    },
  })
}

type SchemeFilterForm = SchemeFilters
const filterForm = reactive<SchemeFilterForm>({
  keyword: '',
  status: undefined,
  pricingMode: undefined,
  ownerId: '',
  updatedFrom: undefined,
  updatedTo: undefined,
  sort: 'updatedAt:desc',
})

watch(
  listQuery,
  (query) => {
    filterForm.keyword = query.keyword ?? ''
    filterForm.status = query.status
    filterForm.pricingMode = query.pricingMode
    filterForm.ownerId = query.ownerId ?? ''
    filterForm.updatedFrom = query.updatedFrom
    filterForm.updatedTo = query.updatedTo
    filterForm.sort = query.sort ?? 'updatedAt:desc'
  },
  { immediate: true },
)

const applyFilters = () => {
  replaceListQuery({
    keyword: filterForm.keyword?.trim() || undefined,
    status: filterForm.status,
    pricingMode: filterForm.pricingMode,
    ownerId: filterForm.ownerId?.trim() || undefined,
    updatedFrom: filterForm.updatedFrom,
    updatedTo: filterForm.updatedTo,
    sort: filterForm.sort,
    page: 1,
  })
}

const resetFilters = () => {
  Object.assign(filterForm, {
    keyword: '',
    status: undefined,
    pricingMode: undefined,
    ownerId: '',
    updatedFrom: undefined,
    updatedTo: undefined,
    sort: 'updatedAt:desc',
  })

  applyFilters()
}
const handlePageChange = (page: number) => {
  replaceListQuery({ page })
}
const handlePageSizeChange = (pageSize: number) => {
  replaceListQuery({
    page: 1,
    pageSize,
  })
}

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
    <el-form class="filter-form" :model="filterForm" inline @submit.prevent="applyFilters">
      <el-form-item label="关键词">
        <el-input
          v-model="filterForm.keyword"
          clearable
          placeholder="方案名称或编码"
          @keyup.enter="applyFilters"
        />
      </el-form-item>

      <el-form-item label="状态">
        <el-select v-model="filterForm.status" clearable placeholder="全部状态">
          <el-option label="草稿" value="DRAFT" />
          <el-option label="待审核" value="PENDING_REVIEW" />
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="已驳回" value="REJECTED" />
        </el-select>
      </el-form-item>

      <el-form-item label="计价模式">
        <el-select v-model="filterForm.pricingMode" clearable placeholder="全部模式">
          <el-option label="单价" value="UNIT_PRICE" />
          <el-option label="总池" value="TOTAL_POOL" />
        </el-select>
      </el-form-item>

      <el-form-item label="创建人 ID">
        <el-input
          v-model="filterForm.ownerId"
          clearable
          placeholder="例如 user-editor"
          @keyup.enter="applyFilters"
        />
      </el-form-item>

      <el-form-item label="更新开始">
        <el-date-picker
          v-model="filterForm.updatedFrom"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          placeholder="选择开始时间"
        />
      </el-form-item>

      <el-form-item label="更新结束">
        <el-date-picker
          v-model="filterForm.updatedTo"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          placeholder="选择结束时间"
        />
      </el-form-item>

      <el-form-item label="更新时间排序">
        <el-select v-model="filterForm.sort">
          <el-option label="最新优先" value="updatedAt:desc" />
          <el-option label="最早优先" value="updatedAt:asc" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" native-type="submit"> 查询 </el-button>
        <el-button @click="resetFilters"> 重置 </el-button>
      </el-form-item>
    </el-form>
    <div class="table-card">
      <div class="table-toolbar">
        <span class="table-title">方案列表</span>
        <span class="table-count">共 {{ data?.total ?? 0 }} 条</span>
      </div>
      <el-table v-loading="isFetching" :data="schemeList" stripe border>
        <template #empty>
          <template v-if="errorMessage">
            <span>加载失败 </span>
            <!-- TODO 调整样式，对齐文字 -->
            <el-button type="text" @click="loadSchemeList" :loading="isFetching"> 刷新 </el-button>
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
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="listQuery.page"
          :page-size="listQuery.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="data?.total ?? 0"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
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

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;

  :deep(.el-select) {
    width: 180px;
  }
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
