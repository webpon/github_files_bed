<template>
  <el-dialog
    v-model="dialogVisible"
    :append-to-body="true"
    :close-on-click-modal="true"
    :show-close="true"
    width="80%"
    class="image-preview-dialog"
  >
    <div class="preview-container" tabindex="0" @keydown="handleKeydown">
      <!-- 左右切换按钮 -->
      <div class="nav-button prev" @click="prevImage" v-if="showNavButtons">
        <el-icon><ArrowLeft /></el-icon>
      </div>
      
      <img 
        :src="currentUrl" 
        :alt="currentIndex + 1" 
        class="preview-image"
        :style="{ transform: `rotate(${rotation}deg)` }"
      />
      
      <div class="nav-button next" @click="nextImage" v-if="showNavButtons">
        <el-icon><ArrowRight /></el-icon>
      </div>

      <!-- 底部工具栏 -->
      <div class="toolbar">
        <span class="image-counter">{{ currentIndex + 1 }}/{{ totalImages }}</span>
        <div class="actions">
          <el-button text @click="rotateImage">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button text @click="downloadImage">
            <el-icon><Download /></el-icon>
          </el-button>
          <el-button text @click="copyImageUrl">
            <el-icon><Link /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight, Refresh, Download, Link } from '@element-plus/icons-vue';

const props = defineProps({
  visible: Boolean,
  url: String,
  urls: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:visible']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const currentIndex = ref(0);
const rotation = ref(0);

// 计算当前显示的URL
const currentUrl = computed(() => {
  return props.urls.length > 0 ? props.urls[currentIndex.value] : props.url;
});

// 是否显示导航按钮
const showNavButtons = computed(() => props.urls.length > 1);

// 总图片数
const totalImages = computed(() => Math.max(props.urls.length, 1));

// 监听 url 变化
watch(() => props.url, () => {
  if (props.url) {
    currentIndex.value = props.urls.indexOf(props.url);
    if (currentIndex.value === -1) currentIndex.value = 0;
  }
});

// 键盘事件处理
const handleKeydown = (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      prevImage();
      break;
    case 'ArrowRight':
      nextImage();
      break;
    case 'Escape':
      dialogVisible.value = false;
      break;
  }
};

// 上一张图片
const prevImage = () => {
  if (!showNavButtons.value) return;
  currentIndex.value = (currentIndex.value - 1 + totalImages.value) % totalImages.value;
  rotation.value = 0;
};

// 下一张图片
const nextImage = () => {
  if (!showNavButtons.value) return;
  currentIndex.value = (currentIndex.value + 1) % totalImages.value;
  rotation.value = 0;
};

// 旋转图片
const rotateImage = () => {
  rotation.value = (rotation.value + 90) % 360;
};

// 下载图片
const downloadImage = async () => {
  try {
    const response = await fetch(currentUrl.value);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image_${currentIndex.value + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    ElMessage.error('下载失败');
  }
};

// 复制图片链接
const copyImageUrl = async () => {
  try {
    await navigator.clipboard.writeText(currentUrl.value);
    ElMessage.success('链接已复制');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};
</script>

<style lang="less" scoped>
.image-preview-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
    background: #000;
  }
}

.preview-container {
  position: relative;
  height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;

  .preview-image {
    max-width: 100%;
    max-height: 100%;
    transition: transform 0.3s ease;
  }

  .nav-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    color: white;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    &.prev {
      left: 20px;
    }

    &.next {
      right: 20px;
    }
  }

  .toolbar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;

    .image-counter {
      font-size: 14px;
    }

    .actions {
      display: flex;
      gap: 8px;

      .el-button {
        color: white;
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }
  }
}
</style> 