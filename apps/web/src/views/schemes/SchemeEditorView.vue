<template>
  <div class="scheme-editor">
    <header class="editor-header">
      <div class="editor-heading">
        <nav class="breadcrumb" aria-label="页面位置">
          <router-link :to="{ name: 'schemes' }">方案管理</router-link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">新建草稿方案</span>
        </nav>
        <div class="title-line">
          <h1>新建草稿方案</h1>
          <el-tag type="info" effect="plain" round>未保存</el-tag>
        </div>
        <p>填写方案信息并配置规则，完成后保存为草稿。</p>
      </div>
      <el-button type="primary" size="large" :loading="isPending" @click="saveDraft">
        保存草稿
      </el-button>
    </header>

    <section class="editor-card basic-card" aria-labelledby="basic-info-title">
      <div class="section-heading">
        <span class="section-index">01</span>
        <div>
          <h2 id="basic-info-title">基本信息</h2>
          <p>设置方案的名称、范围和生效时间</p>
        </div>
      </div>

      <el-form
        ref="formRef"
        class="basic-form"
        :model="model"
        :rules="rules"
        label-position="top"
        size="large"
      >
        <div class="form-grid">
          <el-form-item label="方案编号">
            <el-input model-value="保存后自动生成" disabled />
          </el-form-item>
          <el-form-item label="方案名称" prop="name">
            <el-input
              v-model="model.name"
              placeholder="请输入方案名称"
              :maxlength="30"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="适用范围" prop="scope">
            <el-input
              v-model="model.scope"
              placeholder="请输入适用业务或对象范围"
              :maxlength="100"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="方案生效日期" prop="effectiveDate">
            <el-date-picker
              v-model="model.effectiveDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择生效日期"
            />
          </el-form-item>
          <el-form-item label="计价模式" prop="pricingMode">
            <el-radio-group v-model="model.pricingMode" class="pricing-options">
              <span class="pricing-choice">
                <el-radio :value="PRICING_MODES.UNIT_PRICE">单价计价</el-radio>
                <el-tooltip content="按区间设置单价，结合系数计算" placement="top">
                  <span
                    class="pricing-help"
                    tabindex="0"
                    aria-label="单价计价说明：按区间设置单价，结合系数计算"
                    >i</span
                  >
                </el-tooltip>
              </span>
              <span class="pricing-choice">
                <el-radio :value="PRICING_MODES.TOTAL_POOL">总盘计价</el-radio>
                <el-tooltip content="按区间设置总盘金额，结合系数计算" placement="top">
                  <span
                    class="pricing-help"
                    tabindex="0"
                    aria-label="总盘计价说明：按区间设置总盘金额，结合系数计算"
                    >i</span
                  >
                </el-tooltip>
              </span>
            </el-radio-group>
          </el-form-item>
          <el-form-item class="form-grid__remark" label="备注" prop="remark">
            <el-input
              v-model="model.remark"
              type="textarea"
              :rows="2"
              placeholder="可补充说明方案的适用场景或注意事项（选填）"
              :maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>
      </el-form>
    </section>

    <section class="editor-card rules-card" aria-labelledby="rules-title">
      <div class="section-heading section-heading--with-action">
        <span class="section-index">02</span>
        <div class="section-heading__copy">
          <h2 id="rules-title">规则配置</h2>
          <p>按分类维护规则；草稿允许稍后继续完善</p>
        </div>
        <el-button :disabled="model.pricingMode === null" @click="checkRanges">检查区间</el-button>
      </div>

      <div v-if="checkedRules" class="validation-result">
        <el-alert :type="issues.length ? 'error' : 'success'" :closable="false">
          <template #default>
            <div class="validation-summary">
              <span>{{ issues.length ? `发现 ${issues.length} 处区间错误` : '区间校验通过' }}</span>
              <el-button
                v-if="issues.length"
                link
                type="primary"
                class="detail-toggle"
                @click="showIssueDetails = !showIssueDetails"
              >
                {{ showIssueDetails ? '收起' : '查看详情' }}
              </el-button>
            </div>
          </template>
        </el-alert>

        <el-collapse-transition>
          <ul v-if="issues.length" v-show="showIssueDetails" class="issue-list">
            <li v-for="(issue, index) in issues" :key="index">
              <el-button link type="danger" @click="locateIssue(issue)">
                {{ getIssueLabel(issue) }}
              </el-button>
            </li>
          </ul>
        </el-collapse-transition>
      </div>

      <el-tabs v-model="activeGroupKey" class="rule-tabs">
        <el-tab-pane v-for="group in model.content.groups" :key="group.key" :name="group.key">
          <template #label>
            <span class="tab-label"
              >{{ group.name }}<span class="tab-count">{{ group.rows.length }}</span></span
            >
          </template>
          <RuleTable
            v-if="model.pricingMode !== null"
            v-model:rows="group.rows"
            :pricing-mode="model.pricingMode"
            :issues="issues.filter((issue) => issue.groupKey === group.key)"
          />
          <el-empty v-else description="选择计价模式后即可编辑规则" :image-size="88" />
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import {
  PRICING_MODES,
  RULE_GROUP_KEYS,
  type CreateSchemeInput,
  type ValidationIssue,
} from '@rule-workbench/contracts'
import { validateSchemeRules } from '@rule-workbench/rule-engine'
import { createSchemeDraft } from '@/api/schemes'
import { getApiErrorMessage } from '@/api/error'
import RuleTable from './RuleTable.vue'
import { createSchemeEditorModel } from './config/editor-model.ts'
import { WORKBENCH_BOOTSTRAP_QUERY_KEY } from '@/queries/workbench'

const model = reactive(createSchemeEditorModel())
const activeGroupKey = ref(RULE_GROUP_KEYS.BASE)
const checkedRules = ref(false)

const rules: FormRules = {
  name: [
    { required: true, message: '请输入方案名称', trigger: 'blur' },
    { min: 3, max: 30, message: '方案名称应为 3—30 个字符', trigger: 'blur' },
  ],
  scope: [
    { required: true, message: '请输入适用范围', trigger: 'blur' },
    { min: 2, max: 100, message: '适用范围应为 2—100 个字符', trigger: 'blur' },
  ],
  pricingMode: [{ required: true, message: '请选择计价模式', trigger: 'change' }],
  effectiveDate: [{ required: true, message: '请选择方案生效日期', trigger: 'change' }],
  remark: [{ max: 500, message: '备注不能超过 500 个字符', trigger: 'blur' }],
}

const showIssueDetails = ref(false)
// 首次检查后始终根据当前编辑内容计算错误，修正或删除行会同步更新提示。
const issues = computed(() => {
  if (!checkedRules.value || model.pricingMode === null) return []
  return validateSchemeRules(model.content, model.pricingMode)
})
const checkRanges = (): void => {
  checkedRules.value = true
}

const formRef = ref<FormInstance>()
const router = useRouter()
const queryClient = useQueryClient()

const { mutateAsync: createDraft, isPending } = useMutation({
  mutationFn: createSchemeDraft,
  onSuccess: async () => {
    // 创建成功后，让列表和工作台统计读取最新的服务端数据。
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['schemes'] }),
      queryClient.invalidateQueries({ queryKey: WORKBENCH_BOOTSTRAP_QUERY_KEY }),
    ])
  },
})

const saveDraft = async (): Promise<void> => {
  if (!formRef.value || isPending.value) return

  const isFormValid = await formRef.value.validate().catch(() => false)
  if (!isFormValid || model.pricingMode === null) return

  // 草稿允许规则暂未填完；显示错误，但不因此阻止保存。
  checkedRules.value = true
  const issueCount = issues.value.length

  const inactiveField = model.pricingMode === PRICING_MODES.UNIT_PRICE ? 'totalAmount' : 'unitPrice'

  const input: CreateSchemeInput = {
    name: model.name.trim(),
    scope: model.scope.trim(),
    pricingMode: model.pricingMode,
    effectiveDate: model.effectiveDate,
    remark: model.remark.trim() || undefined,
    content: {
      groups: model.content.groups.map((group) => ({
        ...group,
        rows: group.rows.map((row) => ({
          ...row,
          // 只清理提交副本，不改页面数据；切回模式时仍能看到先前输入。
          [inactiveField]: null,
        })),
      })),
    },
  }

  try {
    const result = await createDraft(input)
    ElMessage.success(
      issueCount > 0
        ? `草稿 ${result.code} 已保存，尚有 ${issueCount} 处规则待完善`
        : `草稿 ${result.code} 已保存`,
    )
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, '保存草稿失败，请稍后重试'))
    return
  }

  await router.replace({ name: 'schemes' })
}

const getIssueLabel = (issue: ValidationIssue): string => {
  const group = model.content.groups.find((item) => item.key === issue.groupKey)
  const rowIndex = issue.rowId ? (group?.rows.findIndex((row) => row.id === issue.rowId) ?? -1) : -1
  const rowLabel = rowIndex >= 0 ? `第 ${rowIndex + 1} 行` : ''

  return `${group?.name ?? issue.groupKey}${rowLabel}：${issue.message}`
}

const locateIssue = async (issue: ValidationIssue): Promise<void> => {
  activeGroupKey.value = issue.groupKey
  await nextTick()

  if (!issue.rowId || !issue.field) return

  const cell = document.getElementById(`rule-${issue.rowId}-${issue.field}`)
  cell?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  cell?.querySelector<HTMLInputElement>('input')?.focus()
}
</script>

<style scoped lang="scss">
.scheme-editor {
  min-width: 0;
  max-width: 1560px;
  margin: 0 auto;
  color: #263247;
}

.editor-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;

  > .el-button {
    min-width: 112px;
    margin-bottom: 2px;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: #8a94a5;
  font-size: 13px;

  a:hover {
    color: var(--el-color-primary);
  }

  [aria-current='page'] {
    color: #5d6a7d;
  }
}

.title-line {
  display: flex;
  align-items: center;
  gap: 12px;

  h1 {
    font-size: 26px;
    font-weight: 650;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }
}

.editor-heading > p {
  margin-top: 8px;
  color: #7d899a;
  font-size: 14px;
}

.editor-card {
  min-width: 0;
  padding: 28px 32px 32px;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  margin-bottom: 20px;
  background: #fff;
  box-shadow: 0 4px 20px rgb(28 54 91 / 3%);
}

.basic-card .section-heading {
  margin-bottom: 20px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 26px;

  h2 {
    font-size: 18px;
    font-weight: 650;
    line-height: 1.4;
  }

  p {
    margin-top: 4px;
    color: #8993a3;
    font-size: 13px;
  }
}

.section-heading--with-action {
  align-items: center;

  .section-heading__copy {
    flex: 1;
  }
}

.section-index {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border-radius: 9px;
  color: #3b70c8;
  background: #eaf2ff;
  font-size: 13px;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px 22px;
}

.form-grid__remark {
  grid-column: span 2;
}

.basic-form {
  :deep(.el-form-item) {
    min-width: 0;
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    color: #415066;
    font-weight: 600;
  }

  :deep(.el-input),
  :deep(.el-date-editor) {
    width: 100%;
  }

  :deep(.el-textarea__inner) {
    min-height: 78px;
  }
}

.pricing-options {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 30px;
}

.pricing-choice {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;

  :deep(.el-radio) {
    margin-right: 0;
  }

  :deep(.el-radio__label) {
    color: #34445a;
    font-size: 14px;
    font-weight: 600;
  }

  :deep(.el-radio.is-checked .el-radio__label) {
    color: #2f6fca;
  }
}

.pricing-help {
  display: inline-grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 1px solid #b6c3d3;
  border-radius: 50%;
  margin-left: 6px;
  color: #73849a;
  background: #f6f8fb;
  cursor: help;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;

  &:hover,
  &:focus-visible {
    border-color: #7aa8e9;
    color: #2f6fca;
    background: #edf5ff;
  }

  &:focus-visible {
    outline: 2px solid #a7ccff;
    outline-offset: 2px;
  }
}

.validation-result {
  margin: -4px 0 20px;
}

.validation-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.issue-list {
  margin: 10px 0 0;
  padding-left: 20px;
}

.issue-list li + li {
  margin-top: 4px;
}

.rule-tabs {
  min-width: 0;

  :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }

  :deep(.el-tabs__item) {
    height: 44px;
    padding: 0 22px;
    color: #68778d;
    font-weight: 600;
  }

  :deep(.el-tabs__item.is-active) {
    color: var(--el-color-primary);
  }

  :deep(.el-tabs__content) {
    overflow: visible;
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-count {
  display: grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  padding: 0 5px;
  border-radius: 6px;
  background: #f0f3f8;
  font-size: 11px;
  line-height: 1;
}

@media (max-width: 1100px) {
  .editor-card {
    padding: 24px;
  }
}

@media (max-width: 1280px) {
  .form-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .form-grid__remark {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .editor-header {
    align-items: flex-start;
  }

  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .form-grid__remark {
    grid-column: auto;
  }
}
</style>
