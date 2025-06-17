import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login'
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
            path: '/home/main/project/:project/settings',
            name: 'settings',
            component: () => import('@/views/settings/index.vue'),
            children:[
              {
                path: '/home/main/project/:project/settings/source/database',
                name: 'settings_source_database',
                component: () => import('@/views/settings/source_management/database.vue')
              },
              {
                path: '/home/main/project/:project/settings/source/files',
                name: 'settings_source_files',
                component: () => import('@/views/settings/source_management/files.vue')
              }
            ]
          },
          {
            path: '/home/main/project/ai/:project',
            name: 'ai',
            component: () => import('@/views/ai/index.vue'),
            children: [
              {
                path: '/home/main/project/audit/interface/project/:project/',
                name: 'audit',
                component: () => import('@/views/audit/index.vue')
              },
              {
                path: '/home/main/project/ai/application/arrange/project/:project/:application',
                name: 'ai_application_arrange',
                component: () => import('@/views/ai/application/arrange/index.vue')
              },
              {
                path: '/home/main/project/ai/requirement/project/:project/',
                name: 'ai_requirement_group',
                component: () => import('@/views/ai/requirement/index.vue')
              },
              {
                path: '/home/main/project/ai/requirement/project/:project/group/:group',
                name: 'ai_requirement',
                component: () => import('@/views/ai/requirement/requirement.vue')
              },
              {
                path: '/home/main/project/ai/application/conversation/project/:project/',
                name: 'application_conversation',
                component: () => import('@/views/ai//application/conversation/index.vue')
              },
              {
                path: '/home/main/project/ai/application/ground/project/:project',
                name: 'ai_application_ground',
                component: () => import('@/views/ai/application/index.vue')
              },
              {
                path: '/home/main/project/ai/custom/plugin/project/:project',
                name: 'ai_custom_plugin',
                component: () => import('@/views/ai/custom_plugin/index.vue')
              }, 
              {
                path: '/home/main/project/ai/knwoledge/project/:project',
                name: 'ai_knowledge',
                component: () => import('@/views/ai/knowledge/index.vue'),
                children: [
                  {
                    path: '/home/main/project/ai/knwoledge/base/project/:project/',
                    name: 'ai_knowledge_base',
                    component: () => import('@/views/ai/knowledge/base/index.vue')
                  },
                  {
                    path: '/home/main/project/ai/knwoledge/document/project/:project/:knowledge',
                    name: 'ai_knowledge_document',
                    component: () => import('@/views/ai/knowledge/document/index.vue')
                  },
                  {
                    path: '/home/main/project/ai/knwoledge/document/create/project/:project/:knowledge',
                    name: 'ai_knowledge_createdocument',
                    component: () => import('@/views/ai/knowledge/create_document/index.vue')
                  },
                  {
                    path: '/home/main/project/ai/knwoledge/document/segment/project/:project/:knowledge/:document',
                    name: 'ai_knowledge_document_segment',
                    component: () => import('@/views/ai/knowledge/segment/index.vue')
                  }
                ]
              }
            ]
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
