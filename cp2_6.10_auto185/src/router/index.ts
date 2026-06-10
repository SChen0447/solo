import { createRouter, createWebHistory } from 'vue-router'
import ContractList from '@/views/ContractList.vue'
import ContractDetail from '@/views/ContractDetail.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: ContractList
  },
  {
    path: '/contracts',
    name: 'contracts',
    component: ContractList
  },
  {
    path: '/contracts/:id',
    name: 'contract-detail',
    component: ContractDetail,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
