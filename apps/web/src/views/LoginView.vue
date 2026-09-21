<template>
  <div class="login-view">
    <div class="login-right">
      <h1>规则驱动业务配置平台</h1>
    </div>
    <div class="login-left">
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef" class="form">
        <el-form-item label="用户名" prop="username">
          <el-input type="text" placeholder="请输入用户名" v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input type="password" placeholder="请输入密码" v-model="form.password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="el-btn" @click="handleLogin">登录</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, type FormRules, type FormInstance } from 'element-plus'
import { useRouter } from 'vue-router'
import { ref, reactive } from 'vue'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
})
const rules = reactive<FormRules>({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
})
const formRef = ref<FormInstance>()

const handleLogin = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    ElMessage.success('登录成功')
    router.push({ name: 'schemes' })
  } catch {
    ElMessage.error('请输入用户名和密码')
  }
}
</script>

<style scoped lang="scss">
.login-view {
  display: flex;
  height: 100%;
  .login-right {
    flex: 3;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 68px;
    color: #fff;
    background: linear-gradient(145deg, #173a78, #285ec5 58%, #4b7ce8);
  }
  .login-left {
    flex: 2;
    display: flex;
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
