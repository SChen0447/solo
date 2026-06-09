import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'BookList',
    component: () => import('./pages/BookList.vue')
  },
  {
    path: '/reading-list',
    name: 'ReadingList',
    component: () => import('./pages/ReadingList.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
