import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/components/FirstPage.vue'),
    meta: {
      title: 'AsyncTest - Asynchronous Way of Testing',
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
            path: '/home/main/project/case/project/:project',
            name: 'case',
            component: () => import('@/views/case/index.vue')
          },
          {
            path: '/home/main/project/:project/settings',
            name: 'settings',
            component: () => import('@/views/settings/index.vue'),
            children: [
              {
                path: '/home/main/project/:project/settings/source/database',
                name: 'settings_source_database',
                component: () => import('@/views/settings/source_management/database.vue')
              },
              {
                path: '/home/main/project/:project/settings/source/datasource',
                name: 'settings_source_datasource',
                component: () => import('@/views/settings/source_management/datasource.vue')
              },
              {
                path: '/home/main/project/:project/settings/source/files',
                name: 'settings_source_files',
                component: () => import('@/views/settings/source_management/files.vue')
              },
              {
                path: '/home/main/project/:project/settings/source/asyncexecutor',
                name: 'settings_asyncexecutor',
                component: () => import('@/views/settings/source_management/async_executor.vue')
              },
              {
                path: '/home/main/project/:project/settings/source/usertoken',
                name: 'settings_user_token',
                component: () => import('@/views/settings/source_management/user_api_token.vue')
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
    ]
  }
]

export function createSSRrouter() {
  return createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes
  })
}
