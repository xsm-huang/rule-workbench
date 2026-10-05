<template>
  <div>
    <header>
      <h2>新建方案</h2>
      <el-button type="primary" :loading="isPending" @click="saveDraft"> 保存草稿 </el-button>
    </header>

    <el-form ref="formRef" :model="model" :rules="rules" label-position="top" inline>
      <el-form-item label="方案编号">
        <el-input model-value="保存后自动生成" disabled />
      </el-form-item>
      <el-form-item label="方案名称" prop="name">
        <el-input v-model="model.name" :maxlength="30" show-word-limit />
      </el-form-item>
      <el-form-item label="适用范围" prop="scope">
        <el-input v-model="model.scope" :maxlength="100" show-word-limit />
      </el-form-item>
      <el-form-item label="计价模式" prop="pricingMode">
        <el-radio-group v-model="model.pricingMode">
          <el-radio :value="PRICING_MODES.UNIT_PRICE">单价计价</el-radio>
          <el-radio :value="PRICING_MODES.TOTAL_POOL">总盘计价</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="方案生效日期" prop="effectiveDate">
        <el-date-picker
          v-model="model.effectiveDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择生效日期"
        />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="model.remark"
          type="textarea"
          :rows="3"
          :maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <el-tabs v-model="activeGroupKey">
      <el-tab-pane
        v-for="group in model.content.groups"
        :key="group.key"
        :name="group.key"
        :label="group.name"
      >
        <div class="rule-validation">
          <el-button :disabled="model.pricingMode === null" @click="checkRanges">
            检查区间
          </el-button>

          <div v-if="checkedRules" class="validation-result">
            <el-alert :type="issues.length ? 'error' : 'success'" :closable="false">
              <template #default>
                <div>
                  <span>
                    {{ issues.length ? `发现 ${issues.length} 处区间错误` : '区间校验通过' }}
                  </span>
                  <el-button
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

            <template v-if="issues.length">
              <el-collapse-transition>
                <ul v-show="showIssueDetails" class="issue-list">
                  <li v-for="(issue, index) in issues" :key="index">
                    <el-button link type="danger" @click="locateIssue(issue)">
                      {{ getIssueLabel(issue) }}
                    </el-button>
                  </li>
                </ul>
              </el-collapse-transition>
            </template>
          </div>
        </div>
        <RuleTable
          v-if="model.pricingMode !== null"
          v-model:rows="group.rows"
          :pricing-mode="model.pricingMode"
          :issues="issues.filter((issue) => issue.groupKey === group.key)"
        />
        <el-empty v-else description="请先选择计价模式" />
      </el-tab-pane>
    </el-tabs>
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
.rule-validation {
  margin: 16px 0;
}

.validation-result {
  margin-top: 12px;
}

.issue-list {
  margin: 8px 0 0;
  padding-left: 20px;
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
