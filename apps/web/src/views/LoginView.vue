<template>
  <div class="login-view">
    <div class="login-right">
      <h1>规则驱动业务配置平台</h1>
    </div>
    <div class="login-left">
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        class="form"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input type="text" placeholder="请输入邮箱" v-model="form.email" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input type="password" placeholder="请输入密码" v-model="form.password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="el-btn" :loading="submitting" native-type="submitting">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, type FormRules, type FormInstance } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores'
import { resolvePostLoginRedirect } from '@/router/auth-redirect'
import { getApiErrorMessage } from '@/api/error'

const form = reactive({
  email: '',
  password: '',
})
const rules = reactive<FormRules>({
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 128, message: '密码长度应为 8—128 个字符', trigger: 'blur' },
  ],
})
const formRef = ref<FormInstance>()
const submitting = ref<boolean>(false)
const authStore = useAuthStore(pinia)
const router = useRouter()
const route = useRoute()

const handleLogin = async (): Promise<void> => {
  if (!formRef.value || submitting.value) return

  const isValid = await formRef.value
    .validate()
    .then(() => true)
    .catch(() => false)

  if (!isValid) return
  submitting.value = true
  try {
    await authStore.login({ email: form.email.trim(), password: form.password })
    ElMessage.success('登录成功')

    // 有合法原目标页时返回原页面，否则进入方案工作台。
    await router.replace(resolvePostLoginRedirect(route.query.redirect))
  } catch (error) {
    form.password = ''
    ElMessage.error(getApiErrorMessage(error, '登录失败，请稍后重试'))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.login-view {
  display: flex;
  height: 100%;

  .login-right {
    position: relative;
    display: flex;
    flex: 3;
    flex-direction: column;
    justify-content: center;
    padding: 68px;
    overflow: hidden;
    color: #fff;
    background: linear-gradient(145deg, #173a78, #285ec5 58%, #4b7ce8);
  }

  .login-left {
    display: flex;
    flex: 2;
    align-items: center;
    justify-content: center;
    background-color: #fff;

    .form {
      width: 100%;
      max-width: 300px;

      .el-btn {
        width: 100%;
      }
    }
  }
}
</style>
