<template>
  <el-dialog
    v-model="dialogVisible"
    title="GitHub 配置"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      label-position="top"
    >
      <el-form-item label="GitHub Token" prop="githubToken">
        <el-input 
          v-model="formState.githubToken"
          type="password"
          show-password
          placeholder="请输入 GitHub Token"
        />
        <div class="form-tip">
          <el-link 
            type="primary" 
            href="https://github.com/settings/tokens/new" 
            target="_blank"
          >
            点击这里获取 Token
          </el-link>
          <el-tooltip content="需要勾选 repo 权限">
            <el-icon class="tip-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
          <el-button type="text" @click="openHelp" style="text-decoration: underline;">帮助</el-button>
        </div>
      </el-form-item>

      <el-form-item label="默认仓库名称" prop="defaultRepo">
        <el-select
          v-model="formState.defaultRepo"
          placeholder="请选择仓库（可选）"
          :loading="loadingRepos"
          clearable
          filterable
        >
          <el-option
            v-for="repo in repositories"
            :key="repo.name"
            :label="repo.name"
            :value="repo.name"
          >
            <el-icon><Platform /></el-icon>
            {{ repo.name }}
          </el-option>
        </el-select>
        <div class="form-tip">
          可选，不选择则每次上传使用第一个仓库
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Platform } from '@element-plus/icons-vue';
import http from '@/api/request';
import { useRouter } from 'vue-router';

const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['update:visible', 'success']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const formRef = ref(null);
const loading = ref(false);

const formState = reactive({
  githubToken: '',
  defaultRepo: ''
});

const rules = {
  githubToken: [
    { required: true, message: '请输入 GitHub Token', trigger: 'blur' }
  ],
  defaultRepo: [
    { pattern: /^[a-zA-Z0-9_.-]+$/, message: '仓库名称只能包含字母、数字、下划线、点和横线', trigger: 'blur' }
  ]
};

const repositories = ref([]);
const loadingRepos = ref(false);

const router = useRouter();

// 获取仓库列表
const fetchRepositories = async () => {
  if (!formState.githubToken) return;
  
  try {
    loadingRepos.value = true;
    // 先保存 Token
    await http.post('/configs', {
      githubToken: formState.githubToken,
      defaultRepo: formState.defaultRepo
    });
    
    // 然后获取仓库列表
    const response = await http.get('/repositories');
    repositories.value = response;
  } catch (error) {
    console.error('Get repositories error:', error);
    ElMessage.error('获取仓库列表失败，请检查 Token 是否正确');
    repositories.value = [];
  } finally {
    loadingRepos.value = false;
  }
};

// 监听 Token 变化，添加防抖
const tokenChangeTimer = ref(null);
watch(() => formState.githubToken, (newToken) => {
  if (tokenChangeTimer.value) {
    clearTimeout(tokenChangeTimer.value);
  }
  
  if (newToken) {
    tokenChangeTimer.value = setTimeout(() => {
      fetchRepositories();
    }, 500); // 500ms 防抖
  } else {
    repositories.value = [];
  }
});

// 获取配置
const fetchConfigs = async () => {
  try {
    const response = await http.get('/configs');
    formState.githubToken = response.GITHUB_TOKEN || '';
    formState.defaultRepo = response.GITHUB_DEFAULT_REPO || '';
    
    // 如果有 Token，获取仓库列表
    if (formState.githubToken) {
      await fetchRepositories();
    }
  } catch (error) {
    console.error('Fetch configs error:', error);
  }
};

// 监听对话框显示
watch(() => props.visible, (val) => {
  if (val) {
    fetchConfigs();
  }
});

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    loading.value = true;
    
    await http.post('/configs', {
      githubToken: formState.githubToken,
      defaultRepo: formState.defaultRepo
    });

    ElMessage.success('配置保存成功');
    dialogVisible.value = false;
    emit('success');
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    loading.value = false;
  }
};

const openHelp = () => {
  router.push('/help');
};

// 确保组件被正确导出
defineOptions({
  name: 'ConfigForm'
});
</script>

<style lang="less" scoped>
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 8px;

  .tip-icon {
    font-size: 14px;
    color: var(--el-color-info);
    cursor: help;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style> 