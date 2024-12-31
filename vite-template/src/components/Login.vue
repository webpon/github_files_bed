<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="title">
        <el-icon class="icon"><Upload /></el-icon>
        图床上传
      </h1>
      <el-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        @submit.prevent="handleSubmit"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="formState.username" 
            placeholder="请输入用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="formState.password" 
            type="password" 
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            native-type="submit" 
            :loading="loading"
            class="submit-btn"
          >
            {{ isRegister ? '注册' : '登录' }}
          </el-button>
        </el-form-item>
        <div class="form-footer">
          <el-button type="text" @click="toggleMode">
            {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { User, Lock, Upload } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import http from '@/api/request';
import { useRouter } from 'vue-router';

const router = useRouter();
const formRef = ref(null);
const formState = ref({
  username: '',
  password: ''
});
const loading = ref(false);
const isRegister = ref(false);

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
};

const toggleMode = () => {
  isRegister.value = !isRegister.value;
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    loading.value = true;

    if (isRegister.value) {
      // 注册
      const response = await http.post('/auth/register', {
        username: formState.value.username,
        password: formState.value.password
      });

      if (response.success) {
        ElMessage.success('注册成功，请登录');
        isRegister.value = false;
      }
    } else {
      // 登录
      const response = await http.post('/auth/login', {
        username: formState.value.username,
        password: formState.value.password
      });

      if (response.success) {
        localStorage.setItem('token', response.token);
        ElMessage.success('登录成功');
        router.push('/');
      }
    }
  } catch (error) {
    console.error('Login/Register error:', error);
    ElMessage.error(error.response?.data?.error || (isRegister.value ? '注册失败' : '登录失败'));
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="less" scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}

.login-box {
  width: 100%;
  max-width: 400px;
  padding: 32px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .title {
    text-align: center;
    margin-bottom: 32px;
    color: var(--el-color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 24px;

    .icon {
      font-size: 28px;
    }
  }

  :deep(.el-form-item__label) {
    padding-bottom: 4px;
  }

  .submit-btn {
    width: 100%;
    padding: 12px;
    font-size: 16px;
  }

  .form-footer {
    text-align: center;
    margin-top: 16px;
  }
}
</style> 