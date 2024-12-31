import { createRouter, createWebHistory } from 'vue-router';
import Upload from '@/components/Upload.vue';
import Help from '@/components/ImagePage.vue';
import Login from '@/components/Login.vue';
import http from '@/api/request';

const routes = [
  {
    path: '/',
    component: Upload,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    component: Login
  },
  {
    path: '/help',
    component: Help
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 添加路由守卫
router.beforeEach(async (to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    try {
      // 验证 token
      const response = await http.get('/auth/verify');
      if (!response.isAuthenticated) {
        next('/login');
      } else {
        next();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      next('/login');
    }
  } else {
    next();
  }
});

export default router; 