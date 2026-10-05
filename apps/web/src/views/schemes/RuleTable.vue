<template>
  <div>
    <el-button type="primary" :disabled="disabled" @click="addRuleRow"> 新增规则行 </el-button>

    <el-table :data="rows" row-key="id" border>
      <el-table-column type="index" label="行" width="60" />

      <el-table-column
        v-for="(columnGroup, index) in fieldGroups"
        :key="`${columnGroup.label}-${index}`"
        :label="columnGroup.label"
      >
        <el-table-column v-for="field in columnGroup.fields" :key="field.key" :label="field.label">
          <template #default="{ row }">
            <div :id="`rule-${row.id}-${field.key}`" class="rule-cell">
              <el-input-number
                v-if="field.component === 'number'"
                v-model="row[field.key]"
                controls-position="right"
                size="small"
                :disabled="disabled"
              />
              <el-date-picker
                v-else-if="field.component === 'date'"
                v-model="row[field.key]"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="disabled"
              />
              <el-switch
                v-else-if="field.component === 'switch'"
                v-model="row[field.key]"
                :disabled="disabled"
              />
              <el-input v-else v-model="row[field.key]" :disabled="disabled" />

              <span v-if="getFieldError(row.id, field.key)" class="rule-error">
                {{ getFieldError(row.id, field.key) }}
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table-column>

      <el-table-column label="操作" fixed="right" width="150">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="disabled" @click="copyRuleRow(row.id)">
            复制
          </el-button>
          <el-popconfirm
            title="确定删除这条规则吗？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            confirm-button-type="danger"
            :disabled="disabled || rows.length <= 1"
            @confirm="removeRuleRow(row.id)"
          >
            <template #reference>
              <el-button link type="danger" :disabled="disabled || rows.length <= 1">
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import type { PricingMode, RuleRow, ValidationIssue } from '@rule-workbench/contracts'
import { computed } from 'vue'
import { getVisibleFieldGroups } from './config/rule-fields'
import { createRuleRow } from './config/editor-model.ts'

const props = defineProps<{
  disabled?: boolean
  pricingMode: PricingMode
  issues: ValidationIssue[]
}>()

const rows = defineModel<RuleRow[]>('rows', { required: true })

// 表格只展示传入的错误；具体校验规则由规则引擎负责。
const getFieldError = (rowId: string, field: keyof RuleRow): string | undefined =>
  props.issues.find((issue) => issue.rowId === rowId && issue.field === field)?.message

const fieldGroups = computed(() => getVisibleFieldGroups(props.pricingMode))

const addRuleRow = (): void => {
  if (props.disabled) return
  rows.value = [...rows.value, createRuleRow()]
}

const copyRuleRow = (rowId: string): void => {
  if (props.disabled) return
  const index = rows.value.findIndex((row) => row.id === rowId)
  const source = rows.value[index]
  if (!source) return

  // 复制字段值，但新行使用独立 ID，避免表格把两行当成同一行。
  const nextRows = [...rows.value]
  nextRows.splice(index + 1, 0, {
    ...source,
    id: crypto.randomUUID(),
  })
  rows.value = nextRows
}

const removeRuleRow = (rowId: string): void => {
  if (props.disabled || rows.value.length <= 1) return
  rows.value = rows.value.filter((row) => row.id !== rowId)
}
</script>

<style scoped lang="scss">
.rule-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.rule-error {
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 1.4;
}
</style>
