import { createRouter, createWebHistory } from 'vue-router'
import CardWall from '../views/CardWall.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'CardWall',
      component: CardWall
    }
  ]
})

export default router
