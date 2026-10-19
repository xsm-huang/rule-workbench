<template>
  <section class="scheme-detail">
    <header class="page-header">
      <div>
        <nav class="breadcrumb" aria-label="页面位置">
          <router-link :to="{ name: 'schemes' }"> 方案管理 </router-link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">方案详情</span>
        </nav>

        <h1>{{ scheme?.name ?? '方案详情' }}</h1>
        <p v-if="scheme" class="page-description">
          {{ scheme.code }}
        </p>
      </div>

      <div class="header-actions">
        <el-button v-if="scheme?.permissions.canEdit" type="primary" @click="editScheme">
          编辑
        </el-button>
        <el-button @click="backToList"> 返回列表 </el-button>
      </div>
    </header>

    <!-- 首次请求尚未得到数据时展示加载状态。 -->
    <div
      v-if="isPending"
      v-loading="true"
      element-loading-text="正在加载方案详情"
      class="state-card"
    ></div>

    <!-- 只有没有可用缓存数据时，才使用错误页替换正文。 -->
    <el-result
      v-else-if="isError && !scheme"
      icon="error"
      title="方案详情加载失败"
      :sub-title="errorMessage"
      class="state-card"
    >
      <template #extra>
        <el-button type="primary" @click="retry"> 重新加载 </el-button>
        <el-button @click="backToList"> 返回列表 </el-button>
      </template>
    </el-result>

    <template v-else-if="scheme">
      <el-card shadow="never" class="detail-card">
        <template #header>
          <div class="card-header">
            <span>基本信息</span>

            <el-tag :type="SCHEME_STATUS_CONFIG[scheme.status].type" effect="plain">
              {{ SCHEME_STATUS_CONFIG[scheme.status].label }}
            </el-tag>
          </div>
        </template>

        <el-descriptions :column="3" border>
          <el-descriptions-item label="方案编号">
            {{ scheme.code }}
          </el-descriptions-item>

          <el-descriptions-item label="方案名称">
            {{ scheme.name }}
          </el-descriptions-item>

          <el-descriptions-item label="计价模式">
            {{ PRICING_MODE_LABELS[scheme.pricingMode] }}
          </el-descriptions-item>

          <el-descriptions-item label="适用范围">
            {{ scheme.scope }}
          </el-descriptions-item>

          <el-descriptions-item label="生效日期">
            {{ scheme.effectiveDate }}
          </el-descriptions-item>

          <el-descriptions-item label="负责人">
            {{ scheme.owner.displayName }}
          </el-descriptions-item>

          <el-descriptions-item label="编辑版本">
            {{ scheme.editVersion }}
          </el-descriptions-item>

          <el-descriptions-item label="业务版本">
            {{ scheme.currentVersionNo }}
          </el-descriptions-item>

          <el-descriptions-item label="更新时间">
            {{ formatUpdatedAt(scheme.updatedAt) }}
          </el-descriptions-item>

          <el-descriptions-item label="备注" :span="3">
            {{ scheme.remark || '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never" class="detail-card">
        <template #header>
          <div class="card-header">
            <span>规则配置</span>
            <span class="card-description"> 当前详情为只读模式 </span>
          </div>
        </template>

        <el-tabs v-model="activeGroupKey">
          <el-tab-pane
            v-for="group in scheme.content.groups"
            :key="group.key"
            :name="group.key"
            :label="`${group.name}（${group.rows.length}）`"
          >
            <!--
              当前先复用已有规则表格，通过 disabled 禁止编辑。
              后续再单独优化只读状态下的按钮和表格样式。
            -->
            <RuleTable
              :rows="group.rows"
              :pricing-mode="scheme.pricingMode"
              :issues="noIssues"
              disabled
            />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>

    <!-- 防止路由参数为空时页面完全没有反馈。 -->
    <el-result
      v-else
      icon="warning"
      title="缺少方案信息"
      sub-title="请返回方案列表重新选择"
      class="state-card"
    >
      <template #extra>
        <el-button type="primary" @click="backToList"> 返回列表 </el-button>
      </template>
    </el-result>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PRICING_MODE_LABELS,
  RULE_GROUP_KEYS,
  type ValidationIssue,
} from '@rule-workbench/contracts'
import { getApiErrorMessage } from '@/api/error'
import { useSchemeDetail } from '@/queries/schemes'
import RuleTable from './RuleTable.vue'
import { SCHEME_STATUS_CONFIG } from './config/scheme-display'

const route = useRoute()
const router = useRouter()

/**
 * Vue Router 的动态参数可能是 string 或 string[]。
 * 页面在调用接口前将它统一转换成普通字符串。
 */
const schemeId = computed(() => {
  const value = route.params.id
  const firstValue = Array.isArray(value) ? value[0] : value

  return typeof firstValue === 'string' ? firstValue.trim() : ''
})

/**
 * 详情数据属于服务端状态，由 TanStack Query 管理。
 * schemeId 变化时，Query Key 也会变化并请求对应方案。
 */
const { data: scheme, error, isError, isPending, refetch } = useSchemeDetail(schemeId)

/** 默认展示基础规则分组。 */
const activeGroupKey = ref(RULE_GROUP_KEYS.BASE)

/**
 * 详情页面不执行规则检查，因此传入稳定的空数组。
 * 避免在模板每次渲染时创建新的数组对象。
 */
const noIssues: ValidationIssue[] = []

/** 将接口中的 ISO 时间转换为当前浏览器时区的展示文本。 */
const formatUpdatedAt = (value: string): string => {
  const date = new Date(value)

  // 接口时间异常时保留原始内容，避免页面直接显示 Invalid Date。
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}

/** 将后端错误转换成适合页面展示的消息。 */
const errorMessage = computed(() => getApiErrorMessage(error.value, '加载方案详情失败，请稍后重试'))

/** 重新执行当前详情查询。 */
const retry = (): void => {
  void refetch()
}

/** 操作权限由服务端按角色、负责人和方案状态计算。 */
const editScheme = (): void => {
  if (!scheme.value?.permissions.canEdit) return

  void router.push({ name: 'scheme-edit', params: { id: scheme.value.id } })
}

/** 明确返回列表，避免直接进入详情页时 history.back() 去向不确定。 */
const backToList = (): void => {
  void router.push({ name: 'schemes' })
}
</script>

<style scoped lang="scss">
.scheme-detail {
  max-width: 1560px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;

  h1 {
    color: #303133;
    font-size: 26px;
    line-height: 1.4;
  }
}

.breadcrumb {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  color: #909399;
  font-size: 13px;

  a:hover {
    color: var(--el-color-primary);
  }
}

.header-actions {
  display: flex;
  flex-shrink: 0;
}

.page-description {
  margin-top: 4px;
  color: #909399;
  font-size: 14px;
}

.state-card {
  min-height: 280px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.detail-card + .detail-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-weight: 600;
}

.card-description {
  color: #909399;
  font-size: 13px;
  font-weight: 400;
}
</style>
