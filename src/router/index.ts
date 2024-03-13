import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'blank',
    component: () => import('@/views/login/loginIndexNew.vue'),
    children: [
      {
        path: '',
        redirect: '/login'
      }
    ]
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/loginIndexNew.vue'),
    meta: {
      title: '',
      keepAlive: false
    }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/home/homeIndex.vue'),
    children: [
      {
        path: '/home/main',
        name: 'main',
        component: () => import('@/views/home/main/mainView.vue'),
        children: [
          {
            path: '/home/main/project/interface/project/:project',
            name: 'interface',
            component: () => import('@/views/api/index.vue')
          },
          {
            path: '/home/main/project/data/project/:project',
            name: 'data',
            component: () => import('@/views/data/index.vue')
          },
          {
            path: '/home/main/project/about/update/:project',
            name: 'update',
            component: () => import('@/views/about/index.vue')
          },
          {
            path: '/home/main/project/apiServer/authorization/:project',
            name: 'apiAuthorization',
            component: () => import('@/views/apiServer/authorization/index.vue')
          },
          {
            path: '/home/main/project/apiServer/data/:project',
            name: 'apiData',
            component: () => import('@/views/apiServer/data/index.vue')
          },
          {
            path: '/home/main/project/apiServer/mock/:project',
            name: 'apiMock',
            component: () => import('@/views/apiServer/mock/index.vue')
          },
          {
            path: '/home/main/project/mock/management/:project',
            name: 'mockData',
            component: () => import('@/views/mock/mockManagement/index.vue')
          },
          {
            path: '/home/main/project/mock/record/:project',
            name: 'mockRecord',
            component: () => import('@/views/mock/mockRecord/index.vue')
          },
          {
            path: '/home/main/project/other/tools/:project',
            name: 'otherwise',
            component: () => import('@/views/otherwise/index.vue')
          },
          {
            path: '/home/main/project/other/reporting/:project',
            name: 'reporting',
            component: () => import('@/views/otherwise/reporting/index.vue')
          }
        ]
      },
      {
        path: '/home/project',
        name: 'project',
        component: () => import('@/views/home/project/projectView.vue')
      },
      {
        path: '/home/task',
        name: 'task',
        component: () => import('@/views/home/task/taskView.vue')
      },
      {
        path: '/home/project/:project/data/add',
        name: 'addData',
        component: () => import('@/views/data/createView.vue')
      },
      {
        path: '/home/project/:project/mock/add',
        name: 'addMock',
        component: () => import('@/views/mock/mockManagement/detailView.vue')
      },
      {
        path: '/home/project/:project/data/edit/:data',
        name: 'editData',
        component: () => import('@/views/data/createView.vue')
      },
      {
        path: '/home/project/:project/mock/edit/:mock',
        name: 'editMock',
        component: () => import('@/views/mock/mockManagement/detailView.vue')
      }
    ]
  }
]

export function createSSRrouter() {
  return createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes
  })
}
