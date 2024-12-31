<template>
  <div class="page-container">
    <div class="header">
      <div class="header-left">
        <el-icon class="logo-icon"><Upload /></el-icon>
        <span class="title">图床上传(一定不要上传敏感文件，因为是上传到公开的仓库)</span>
      </div>
      <div class="header-right">
        <div class="select-wrapper">
          <el-select
            v-model="selectedRepo"
            placeholder="选择目标仓库"
            :loading="loadingRepos"
            :disabled="loadingRepos"
          >
            <el-option 
              v-for="repo in repositories" 
              :key="repo.full_name" 
              :label="repo.full_name"
              :value="repo.full_name"
            >
              <template #default>
                <el-icon><Platform /></el-icon>
                {{ repo.full_name }}
              </template>
            </el-option>
          </el-select>
        </div>
        <el-button @click="showFiles">
          <el-icon><Folder /></el-icon>
          查看文件
        </el-button>
        <el-button type="primary" @click="showCreateRepoModal">
          <el-icon><Plus /></el-icon>
          新建仓库
        </el-button>
        <el-button type="warning" @click="showConfigModal">
          <el-icon><Setting /></el-icon>
          GitHub 配置
        </el-button>
        <div class="user-info">
          <el-dropdown>
            <span class="user-dropdown">
              <el-icon><User /></el-icon>
              <span>{{ userInfo?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <div class="tab-container">
      <div class="tab-header">
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'upload' }"
          @click="activeTab = 'upload'"
        >
          <el-icon><Upload /></el-icon>
          上传区域
        </div>
        <div 
          class="tab-item"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          <el-icon><Clock /></el-icon>
          上传历史
        </div>
      </div>

      <div class="tab-content">
        <div v-show="activeTab === 'upload'" class="upload-section">
          <div class="upload-area">
            <div class="dropzone" 
               @drop.prevent="dropFiles" 
               @dragover.prevent 
               @dragenter.prevent="isDragging = true"
               @dragleave.prevent="isDragging = false"
               @click="onClickUploadButton"
               :class="{ 'dragging': isDragging }"
            >
              <input
                type="file"
                ref="fileInput"
                @change="onFileChange"
                style="display: none"
                multiple
              />
              <div class="upload-content">
                <el-icon class="upload-icon"><Upload /></el-icon>
                <p class="upload-text">点击或拖拽文件到此处上传</p>
                <p class="upload-hint">
                  支持所有文件格式，单个文件大小不超过 20MB
                  <br>
                  支持剪贴板粘贴上传
                </p>
              </div>
            </div>
          </div>

          <div v-if="uploadingFiles.length > 0" class="upload-progress">
            <div v-for="file in uploadingFiles" :key="file.name" class="progress-item">
              <div class="progress-info">
                <div class="file-info">
                  <el-icon><Document /></el-icon>
                  <span class="filename">{{ file.name }}</span>
                </div>
                <span class="progress-text">{{ file.progress }}%</span>
              </div>
              <el-progress :percentage="file.progress" :status="file.status" />
            </div>
          </div>

          <div class="preview-section" v-if="previewImages.length">
            <div class="preview-header">
              <div class="preview-title">
                <span>已上传 {{ totalUploaded }} 个文件</span>
              </div>
              <div class="preview-actions">
                <el-button type="text" @click="clearHistory" danger>
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
              </div>
            </div>

            <div class="preview-grid">
              <el-card v-for="(file, index) in previewImages" 
                      :key="index" 
                      class="preview-card"
                      :body-style="{ padding: '0px' }"
              >
                <div class="image-wrapper">
                  <div class="image-container">
                    <template v-if="isImageFile(file.name)">
                      <img 
                        :src="file.url"
                        :alt="file.name"
                        @click="showPreview(file.url)"
                        class="preview-image"
                      />
                    </template>
                    <template v-else>
                      <div class="file-icon">
                        <el-icon :size="40"><Document /></el-icon>
                        <span class="file-ext">{{ getFileExt(file.name) }}</span>
                      </div>
                    </template>
                  </div>
                </div>
                <div class="card-footer">
                  <div>
                    <div class="filename long-text" :title="file.originalName || file.name">
                    {{ file.originalName || file.name }}
                  </div>
                  <div class="upload-time">{{ formatDate(file.uploadTime) }}</div>
                  </div>

                  <div class="file-actions">
                    <template v-if="isImageFile(file.name)">
                      <el-button type="text" @click="showPreview(file.url)" style="padding: 0; height: auto;">
                        <el-icon><View /></el-icon>
                        预览
                      </el-button>
                    </template>
                    <el-dropdown trigger="click">
                      <el-button type="text">
                        <el-icon><Link /></el-icon>
                        复制链接
                        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item @click="copyUrl(file, 'proxy')">
                            <el-icon><Link /></el-icon>
                            复制代理链接
                          </el-dropdown-item>
                          <el-dropdown-item @click="copyUrl(file, 'raw')">
                            <el-icon><Link /></el-icon>
                            复制原始链接
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'history'" class="history-section">
          <div class="history-list">
            <el-table 
              v-loading="loadingHistory"
              :data="uploadHistory"
              style="width: 100%"
            >
              <el-table-column label="预览" width="100">
                <template #default="{ row }">
                  <img 
                    v-if="isImageFile(row.filename)"
                    :src="row.url"
                    class="history-preview"
                    @click="showPreview(row.url)"
                  />
                  <el-icon v-else><Document /></el-icon>
                </template>
              </el-table-column>
              <el-table-column prop="filename" label="文件名" />
              <el-table-column prop="created_at" label="上传时间">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column prop="size" label="大小">
                <template #default="{ row }">
                  {{ formatFileSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="250">
                <template #default="{ row }">
                  <el-button link type="primary" @click="copyFileUrl(row)">
                    复制代理链接
                  </el-button>
                  <el-button link type="primary" @click="copyRawUrl(row)">
                    复制原始链接
                  </el-button>
                  <el-button link type="primary" @click="copyMarkdown(row)">
                    复制 MD
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="createRepoModalVisible"
      title="创建新仓库"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form 
        ref="repoFormRef"
        :model="newRepoForm"
        :rules="repoFormRules"
        label-position="top"
      >
        <el-form-item label="仓库名称" prop="name">
          <el-input 
            v-model="newRepoForm.name" 
            placeholder="请输入仓库名称"
            :prefix-icon="Files"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="newRepoForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入仓库描述"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="newRepoForm.isPrivate">
            <template #default>
              <span style="display: flex; align-items: center; gap: 4px;">
                <el-icon><Lock /></el-icon>
                设为私有仓库
              </span>
            </template>
          </el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createRepoModalVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="creatingRepo"
            @click="handleCreateRepo"
          >
            创建
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-drawer
      v-model="fileDrawerVisible"
      title="仓库文件"
      size="500px"
      :with-header="true"
      :destroy-on-close="false"
    >
      <template #header>
        <div style="flex: 1">
          <span>仓库文件</span>
          <div style="float: right">
            <el-select
              v-model="currentViewRepo"
              style="width: 200px"
              placeholder="选择仓库"
              @change="fetchFiles"
              size="default"
              :loading="loadingRepos"
              :disabled="loadingRepos"
            >
              <el-option 
                v-for="repo in repositories" 
                :key="repo.full_name" 
                :label="repo.full_name" 
                :value="repo.full_name"
              >
                <template #default>
                  <el-icon><Platform /></el-icon>
                  {{ repo.full_name }}
                </template>
              </el-option>
            </el-select>
          </div>
        </div>
      </template>

      <div class="file-list">
        <div class="file-header">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item @click="navigateToRoot">仓库根目录</el-breadcrumb-item>
            <el-breadcrumb-item 
              v-for="(part, index) in pathParts" 
              :key="index"
              @click="navigateToPath(index)"
            >
              {{ part }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <el-empty v-if="!files.length && !loadingFiles" description="暂无文件" />
        <div v-else class="file-items">
          <el-skeleton :loading="loadingFiles" animated :count="3">
            <template #default>
              <div v-if="currentPath" class="file-item">
                <div class="file-content" @click="navigateUp">
                  <div class="file-avatar">
                    <el-icon><Back /></el-icon>
                  </div>
                  <div class="file-info">
                    <div class="file-title">
                      <span class="filename">返回上一层</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-for="item in files" :key="item.path" class="file-item">
                <div class="file-content" @click="item.type === 'dir' ? openFolder(item.path) : null">
                  <div class="file-avatar">
                    <template v-if="item.type === 'file'">
                      <img v-if="isImageFile(item.name)" :src="item.url" :alt="item.name" class="preview-thumbnail" />
                      <el-icon v-else><Document /></el-icon>
                    </template>
                    <el-icon v-else><Folder /></el-icon>
                  </div>
                  <div class="file-info">
                    <div class="file-title">
                      <template v-if="item.type === 'file'">
                        <el-tooltip :content="item.name">
                          <a :href="item.url" target="_blank" class="filename">{{ item.name }}</a>
                        </el-tooltip>
                        <img
                          v-if="isImageFile(item.name)"
                          :src="item.url"
                          :alt="item.name"
                          @click.stop="showPreview(item.url)"
                          class="preview-trigger"
                        />
                      </template>
                      <template v-else>
                        <span class="filename">{{ item.name }}</span>
                      </template>
                    </div>
                    <div class="file-meta">
                      <span class="file-time">
                        <el-icon><Clock /></el-icon>
                        {{ formatDate(item.created_at) }}
                      </span>
                      <span v-if="item.size" class="file-size">
                        <el-icon><Files /></el-icon>
                        {{ formatFileSize(item.size) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="file-actions" v-if="item.type === 'file'">
                  <el-button link type="primary" @click.stop="copyFileUrl(item)">
                    <el-icon><Link /></el-icon>
                    复制链接
                  </el-button>
                  <el-button link type="primary" @click.stop="copyMarkdown(item)">
                    <el-icon><Picture /></el-icon>
                    复制 MD
                  </el-button>
                  <el-popconfirm
                    title="确定要删除这个文件吗？"
                    @confirm="deleteFile(item)"
                  >
                    <template #reference>
                      <el-button link type="danger">
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>
    </el-drawer>

    <image-viewer
      v-model:visible="previewVisible"
      :url="previewUrl"
    />

    <config-form
      v-model:visible="configVisible"
      @success="handleConfigSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { uploadFile, createRepository } from "@/api";
import { 
  Upload,
  Platform,
  Folder,
  Plus,
  User,
  ArrowDown,
  SwitchButton,
  Picture,
  Delete,
  Document,
  Link,
  Clock,
  Files,
  Lock,
  Back,
  Setting,
  QuestionFilled,
  View
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/api/request';
import { useRouter } from 'vue-router';
import ImageViewer from './ImageViewer.vue';
import ConfigForm from './ConfigForm.vue';

// 添加调试日志
console.log('ConfigForm imported:', ConfigForm);

const fileInput = ref(null);
const previewImages = ref([]);
const uploading = ref(false);
const repositories = ref([]);
const loadingRepos = ref(false);
const selectedRepo = ref('');
const isDragging = ref(false);
const createRepoModalVisible = ref(false);
const creatingRepo = ref(false);
const newRepoForm = ref({
  name: '',
  description: '',
  isPrivate: false
});
const fileDrawerVisible = ref(false);
const currentViewRepo = ref('');
const currentPath = ref('');
const files = ref([]);
const loadingFiles = ref(false);
const isAuthenticated = ref(false);
const userInfo = ref(null);
const router = useRouter();
const previewVisible = ref(false);
const previewUrl = ref('');
const repoFormRef = ref(null);
const repoFormRules = {
  name: [
    { required: true, message: '请输入仓库名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_.-]+$/, message: '仓库名称只能包含字母、数字、下划线、点和横线', trigger: 'blur' }
  ]
};

// 添加配置相关的状态
const configVisible = ref(false);

// 添加配置相关的方法
const showConfigModal = () => {
  console.log('Opening config modal');  // 添加调试日志
  configVisible.value = true;
};

const handleConfigSuccess = async () => {
  ElMessage.success('配置已更新，正在刷新数据...');
  await fetchRepositories();
};

const pathParts = computed(() => {
  return currentPath.value ? currentPath.value.split('/').filter(Boolean) : [];
});

const navigateUp = () => {
  const parts = currentPath.value.split('/');
  parts.pop();
  currentPath.value = parts.join('/');
  fetchFiles();
};

const navigateToRoot = () => {
  currentPath.value = '';
  fetchFiles();
};

const navigateToPath = (index) => {
  const parts = pathParts.value;
  currentPath.value = parts.slice(0, index + 1).join('/');
  fetchFiles();
};

const openFolder = async (path) => {
  currentPath.value = path;
  await fetchFiles();
};

const fetchFiles = async () => {
  if (!currentViewRepo.value) {
    ElMessage.warning('请先选择仓库');
    return;
  }
  
  loadingFiles.value = true;
  try {
    const [owner, repo] = currentViewRepo.value.split('/');
    console.log('Fetching files:', { owner, repo, path: currentPath.value }); // 调试日志
    
    const response = await http.get('/files', { 
      params: { 
        owner, 
        repo,
        path: currentPath.value 
      }
    });
    
    console.log('Files response:', response); // 调试日志
    files.value = response;
  } catch (error) {
    console.error('Fetch files error:', error);
    ElMessage.error('获取文件列表失败');
  } finally {
    loadingFiles.value = false;
  }
};

// 检查认证状态
const checkAuthStatus = async () => {
  try {
    const authStatus = await http.get('/auth/status');
    isAuthenticated.value = authStatus.isAuthenticated;
    if (!isAuthenticated.value) {
      window.location.href = '/login';
      return;
    }
    // 获取用户信息
    const userResponse = await http.get('/user');
    userInfo.value = userResponse;
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/login';
  }
};

// 处理登出
const handleLogout = async () => {
  try {
    await http.get('/auth/logout');
    ElMessage.success('退出成功');
    router.push('/login');
  } catch (error) {
    ElMessage.error('退出失败');
  }
};

// 获取用户信息
const getUserInfo = async () => {
  try {
    const response = await http.get('/auth/status');
    userInfo.value = response.user;
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
};

onMounted(async () => {
  await getUserInfo();
  await fetchRepositories();
});

const fetchRepositories = async () => {
  try {
    loadingRepos.value = true;
    const response = await http.get('/repositories');
    repositories.value = response;
    
    // 如果有仓库，获取配置
    if (repositories.value.length > 0) {
      const configs = await http.get('/configs');
      
      // 如果有默认仓库配置，尝试找到对应的仓库
      if (configs.GITHUB_DEFAULT_REPO) {
        const defaultRepo = repositories.value.find(
          repo => repo.name === configs.GITHUB_DEFAULT_REPO
        );
        if (defaultRepo) {
          selectedRepo.value = defaultRepo.full_name;
        } else {
          // 如果找不到默认仓库，使用第一个
          selectedRepo.value = repositories.value[0].full_name;
        }
      } else {
        // 没有默认仓库配置，使用第一个
        selectedRepo.value = repositories.value[0].full_name;
      }
    }
  } catch (error) {
    console.error('Get repositories error:', error);
    ElMessage.error('获取仓库列表失败');
  } finally {
    loadingRepos.value = false;
  }
};

const onClickUploadButton = () => {
  fileInput.value.click();
};

const onFileChange = (e) => {
  const files = e.target.files;
  uploadFiles(files);
};

const dropFiles = (e) => {
  const files = e.dataTransfer.files;
  uploadFiles(files);
};

const readAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 生成带时间戳的唯一文件名
const generateUniqueFilename = (originalName) => {
  const timestamp = new Date().getTime();
  const ext = originalName.split('.').pop();
  const baseName = originalName.slice(0, originalName.lastIndexOf('.'));
  return `${baseName}_${timestamp}.${ext}`;
};

const uploadingFiles = ref([]);

const checkFileSize = (file) => {
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    ElMessage.error(`文件 ${file.name} 超过 20MB 限制`);
    return false;
  }
  return true;
};

const uploadFiles = async (files) => {
  if (!selectedRepo.value && repositories.value.length === 0) {
    ElMessage.error('请先创建一个仓库');
    return;
  }

  for (const file of files) {
    // 检查文件大小
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.error(`文件 ${file.name} 超过20MB限制`);
      continue;
    }

    // 添加到上传队列
    const uploadingFile = {
      name: file.name,
      progress: 0,
      status: 'primary'
    };
    uploadingFiles.value.push(uploadingFile);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onload = async () => {
          const base64Data = reader.result.split(',')[1];
          
          try {
            const response = await http.post('/upload', {
              file: base64Data,
              filename: file.name
            }, {
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                uploadingFile.progress = percentCompleted;
              }
            });

            if (response.success) {
              uploadingFile.status = 'success';
              previewImages.value.unshift({
                ...response.files[0],
                originalName: file.name,
                uploadTime: new Date()
              });
              resolve();
            } else {
              uploadingFile.status = 'exception';
              reject(new Error(response.error));
            }
          } catch (error) {
            uploadingFile.status = 'exception';
            reject(error);
          }
        };
      });
    } catch (error) {
      ElMessage.error(`上传失败: ${error.message}`);
    } finally {
      setTimeout(() => {
        const index = uploadingFiles.value.indexOf(uploadingFile);
        if (index !== -1) {
          uploadingFiles.value.splice(index, 1);
        }
      }, 2000);
    }
  }
};

// 计算已上传文件数量
const totalUploaded = computed(() => previewImages.value.length);

// 清空历史记录
const clearHistory = () => {
  ElMessageBox.confirm('确定要清空上传历史记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    previewImages.value = [];
    ElMessage.success('历史记录已清空');
  });
};

// 复制所有链接
const copyAllUrls = async () => {
  try {
    const urls = previewImages.value.map(img => img.url).join('\n');
    await navigator.clipboard.writeText(urls);
    ElMessage.success('所有链接已复制到剪贴板');
  } catch (err) {
    ElMessage.error('复制失败');
  }
};

// 将文件转换为 Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const showCreateRepoModal = () => {
  createRepoModalVisible.value = true;
};

const handleCreateRepo = async () => {
  if (!repoFormRef.value) return;
  
  try {
    await repoFormRef.value.validate();
  } catch (error) {
    return;
  }

  creatingRepo.value = true;
  try {
    await createRepository(newRepoForm.value);
    ElMessage.success('仓库创建成功');
    createRepoModalVisible.value = false;
    await fetchRepositories(); // 刷新仓库列表
    // 重置表单
    repoFormRef.value.resetFields();
  } catch (error) {
    ElMessage.error(`创建失败: ${error.message}`);
  } finally {
    creatingRepo.value = false;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const copyImageUrl = (img) => {
  navigator.clipboard.writeText(img.url);
  ElMessage.success('链接已复制到剪贴板');
};

const copyMarkdown = async (file) => {
  try {
    const md = `![${file.name}](${file.url})`;
    await navigator.clipboard.writeText(md);
    ElMessage.success('Markdown 已复制');
  } catch (err) {
    ElMessage.error('复制失败');
  }
};

const copyFileUrl = async (file) => {
  try {
    await navigator.clipboard.writeText(file.url);
    ElMessage.success('代理链接已复制');
  } catch (err) {
    ElMessage.error('复制失败');
  }
};

const copyRawUrl = async (file) => {
  try {
    await navigator.clipboard.writeText(file.raw_url);
    ElMessage.success('原始链接已复制');
  } catch (err) {
    ElMessage.error('复制失败');
  }
};

const deleteFile = async (file) => {
  try {
    const [owner, repo] = currentViewRepo.value.split('/');
    await http.delete('/files', { 
      data: {
        owner,
        repo,
        path: file.path,
        sha: file.sha
      }
    });
    ElMessage.success('删除成功');
    await fetchFiles();
  } catch (error) {
    ElMessage.error(error.message || '删除失败');
  }
};

// 判断是否为图片文件
const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = getFileExt(filename);
  return imageExtensions.includes(ext.toLowerCase());
};

// 获取文件扩展名
const getFileExt = (filename) => {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase();
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const showPreview = (url) => {
  previewUrl.value = url;
  previewVisible.value = true;
};

// 修改消息提示
const showMessage = (type, message) => {
  ElMessage({
    type,
    message
  });
};

// 修改确认对话框
const showConfirm = (message) => {
  return ElMessageBox.confirm(message, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  });
};

// 处理仓库切换
const handleRepoChange = async (value) => {
  if (!value) return;
  currentViewRepo.value = value;
  currentPath.value = '';  // 重置路径
  await fetchFiles();
};

// 显示文件抽屉
const showFiles = () => {
  console.log('Opening file drawer'); // 调试日志
  fileDrawerVisible.value = true;
  if (selectedRepo.value) {
    currentViewRepo.value = selectedRepo.value;
    fetchFiles();
  } else {
    ElMessage.warning('请先选择仓库');
  }
};

// 监听仓库选择变化
watch(selectedRepo, (newValue) => {
  if (newValue && fileDrawerVisible.value) {
    currentViewRepo.value = newValue;
    fetchFiles();
  }
});

const activeTab = ref('upload');
const uploadHistory = ref([]);
const loadingHistory = ref(false);

// 获取上传历史
const fetchHistory = async () => {
  loadingHistory.value = true;
  try {
    const response = await http.get('/history');
    uploadHistory.value = response;
  } catch (error) {
    ElMessage.error('获取历史记录失败');
  } finally {
    loadingHistory.value = false;
  }
};

// 监听标签页切换
watch(activeTab, (newValue) => {
  if (newValue === 'history') {
    fetchHistory();
  }
});

// 页面加载时获取历史记录
// 在 script setup 中添加检查配置的方法
const checkGitHubConfig = async () => {
  try {
    const configs = await http.get('/configs');
    if (!configs.GITHUB_TOKEN) {
      ElMessageBox.confirm(
        '检测到您还未配置 GitHub Token，是否现在配置？',
        '提示',
        {
          confirmButtonText: '去配置',
          cancelButtonText: '暂不配置',
          type: 'warning'
        }
      ).then(() => {
        configVisible.value = true;
      }).catch(() => {
        ElMessage.info('您可以稍后在右上角点击"GitHub 配置"进行配置');
      });
    }
  } catch (error) {
    console.error('Check GitHub config error:', error);
  }
};
// 在 script setup 中添加
// 监听粘贴事件
const handlePaste = async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        await uploadFiles([file]);
      }
    }
  }
};
// 修改 onMounted，添加配置检查
onMounted(async () => {
  await getUserInfo();
  await checkGitHubConfig();  // 添加这一行
  await fetchRepositories();
  document.addEventListener('paste', handlePaste);
});
// 在 onUnmounted 中移除事件监听
onUnmounted(() => {
  document.removeEventListener('paste', handlePaste);
});

// 复制链接
const copyUrl = async (file, type = 'proxy') => {
  try {
    const url = type === 'proxy' ? file.url : file.raw_url;
    await navigator.clipboard.writeText(url);
    ElMessage.success(`${type === 'proxy' ? '代理' : '原始'}链接已复制到剪贴板`);
  } catch (err) {
    ElMessage.error('复制失败');
  }
};
</script>

<style lang="less" scoped>
.page-container {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

.header {
  height: 64px;
  padding: 0 24px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .logo-icon {
      font-size: 24px;
      color: var(--el-color-primary);
    }

    .title {
      font-size: 18px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .select-wrapper {
    width: 240px;

    :deep(.el-select) {
      width: 100%;

      .el-select__loading {
        color: var(--el-color-primary);
      }
    }
  }

  .user-dropdown {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    color: var(--el-text-color-regular);
    transition: all 0.3s;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }
}

.tab-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: white;
  border-radius: 8px;
  margin: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-header {
  display: flex;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: white;
  border-radius: 8px 8px 0 0;
}

.tab-item {
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  border-bottom: 2px solid transparent;
  transition: all 0.3s;

  &:hover {
    color: var(--el-color-primary);
  }

  &.active {
    color: var(--el-color-primary);
    border-bottom-color: var(--el-color-primary);
  }

  .el-icon {
    font-size: 16px;
  }
}

.tab-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.upload-section,
.history-section {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  background: #f6f8fa;
}

.upload-area {
  flex-shrink: 0;
  padding: 8px;
  background: #fafafa;
  border-radius: 8px;
}

.dropzone {
  background: white;
  border: 2px dashed #e8e8e8;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover, &.dragging {
    border-color: #1890ff;
    background: #f0f7ff;
  }

  .upload-icon {
    font-size: 48px;
    color: #1890ff;
    margin-bottom: 16px;
  }

  .upload-text {
    font-size: 16px;
    color: #262626;
    margin-bottom: 8px;
  }

  .upload-hint {
    font-size: 14px;
    color: #8c8c8c;
  }
}

.preview-section {
  margin-top: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;
}

.preview-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;

  .preview-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .preview-actions {
    display: flex;
    gap: 16px;
  }
}

.preview-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  background: var(--el-fill-color-blank);
}

.preview-card {
  .image-wrapper {
    position: relative;
    height: 200px;
    overflow: hidden;

    .image-container {
      width: 100%;
      height: 100%;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .image-actions {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.3s;

      .el-button {
        color: white;
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }

    &:hover .image-actions {
      opacity: 1;
    }
  }

  .card-footer {
    padding: 12px;
    display: flex;
    justify-content: space-between;
    .file-actions {
      flex: 0;
    }
    .filename {
      font-size: 14px;
      margin-bottom: 4px;
      @include text-ellipsis;
    }
    
    .upload-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.image-wrapper {
  position: relative;
  height: 200px;
  overflow: hidden;
  
  .image-container {
    width: 100%;
    height: 100%;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
      cursor: pointer;
      
      &:hover {
        transform: scale(1.05);
      }
    }
  }
  
  .image-actions {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.3s;
    
    .el-button {
      color: white;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .el-icon {
        margin-right: 4px;
      }
    }
  }
  
  &:hover .image-actions {
    opacity: 1;
  }
}

.card-footer {
  padding: 12px;
  
  .filename {
    font-size: 14px;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
    @include text-ellipsis;
  }
  
  .upload-time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

// 添加文本省略的 mixin
@mixin text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-drawer {
  :deep(.ant-drawer-header) {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  :deep(.ant-drawer-title) {
    font-size: 16px;
  }
}

.file-list {
  height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 16px;
  
  .file-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.user-info {
  .user-dropdown {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #262626;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background: #f5f5f5;
    }
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0 16px;
    height: 56px;

    .select-wrapper {
      width: 160px;
    }
  }

  .main-content {
    padding: 12px;
    height: calc(100vh - 56px);
  }

  .preview-grid {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .file-list {
    height: calc(100vh - 56px);
  }

  .file-list {
    .file-title {
      .filename {
        max-width: 200px;
      }
    }

    .file-actions {
      flex-wrap: wrap;
    }
  }
}

:deep(.el-image) {
  width: 100%;
  height: 100%;
  display: block;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.preview-trigger {
  &.el-image {
    width: 20px;
    height: 20px;
    
    img {
      border-radius: 2px;
    }
  }
}

.image-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #8c8c8c;
  font-size: 24px;
}

.image-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.3s;
    
    &:hover {
      transform: scale(1.05);
    }
  }
}

.preview-trigger {
  width: 20px;
  height: 20px;
  cursor: pointer;
  overflow: hidden;
  border-radius: 2px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s;
    
    &:hover {
      opacity: 0.8;
    }
  }
}

.preview-modal {
  :deep(.ant-modal-content) {
    background: transparent;
    box-shadow: none;
    
    .ant-modal-body {
      padding: 0;
    }
  }
}

.preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  
  img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.filename {
  cursor: pointer;
  color: var(--el-text-color-primary);
  text-decoration: none;
  
  &:hover {
    color: var(--el-color-primary);
  }
}

.preview-thumbnail {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.file-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  flex-shrink: 0;

  .el-icon {
    font-size: 20px;
    color: var(--el-text-color-secondary);
  }
}

.file-actions {
  display: flex;
  flex-wrap: wrap;
}

.file-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);

  :deep(.el-breadcrumb__item) {
    cursor: pointer;
    
    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.file-item {
  padding: 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
  
  &:hover {
    background: var(--el-fill-color-light);
  }

  .file-content {
    display: flex;
    gap: 12px;
    cursor: pointer;
  }

  .file-avatar {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-fill-color-light);
    flex-shrink: 0;

    .el-icon {
      font-size: 20px;
      color: var(--el-text-color-secondary);
    }
  }
}

.history-list {
  padding: 16px;
  
  .history-preview {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.3s;
    
    &:hover {
      transform: scale(1.1);
    }
  }
}

.main-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
  }
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;

  .history-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    .image-container {
      width: 100%;
      height: 200px; // 固定高度
      background: var(--el-fill-color-light);
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain; // 使用 contain 而不是 cover
        padding: 16px; // 添加内边距
      }
    }

    .card-info {
      padding: 12px;
      border-top: 1px solid var(--el-border-color-lighter);

      .filename {
        font-size: 14px;
        color: var(--el-text-color-primary);
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .card-actions {
      padding: 8px;
      display: flex;
      justify-content: flex-start;
      gap: 8px;
      border-top: 1px solid var(--el-border-color-lighter);
    }
  }
}

// 添加进度条样式
.upload-progress {
  margin: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .progress-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .file-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .el-icon {
          font-size: 20px;
          color: var(--el-text-color-secondary);
        }

        .filename {
          color: var(--el-text-color-primary);
          font-size: 14px;
        }
      }

      .progress-text {
        color: var(--el-text-color-secondary);
        font-size: 14px;
      }
    }
  }
}

// 添加文件图标样式
.file-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);

  .file-ext {
    margin-top: 8px;
    font-size: 14px;
    text-transform: uppercase;
  }
}
.long-text {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>


