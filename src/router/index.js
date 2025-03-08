import { createRouter, createWebHistory } from 'vue-router'
import { userStore } from '@/stores'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      component: () => import('@/views/LoginPage.vue')
    },
    {
      path: '/',
      component: () => import('@/views/layout/LayoutContainer.vue'),
      redirect: '/message',
      children: [
        {
          path: '/message',
          component: () => import('@/views/message/MessageLayout.vue'),
          meta: {
            active_1: '/message' // 一级导航default-active
          }
        },
        {
          path: '/contactList',
          component: () => import('@/views/contactList/ContactListLayout.vue'),
          redirect: '/contactList/user',
          children: [
            {
              path: '/contactList/user',
              component: () => import('@/views/contactList/user/ContactListUser.vue'),
              redirect: '/contactList/user/all',
              children: [
                {
                  path: '/contactList/user/all',
                  component: () => import('@/views/contactList/user/sub/SubAll.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/user' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/user/mark',
                  component: () => import('@/views/contactList/user/sub/SubMark.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/user' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/user/partition',
                  component: () => import('@/views/contactList/user/sub/SubPartition.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/user' // 二级导航default-active
                  }
                }
              ]
            },
            {
              path: '/contactList/group',
              component: () => import('@/views/contactList/group/ContactListGroup.vue'),
              redirect: '/contactList/group/all',
              children: [
                {
                  path: '/contactList/group/all',
                  component: () => import('@/views/contactList/group/sub/SubAll.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/group' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/group/created',
                  component: () => import('@/views/contactList/group/sub/SubCreated.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/group' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/group/managed',
                  component: () => import('@/views/contactList/group/sub/SubManaged.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/group' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/group/joined',
                  component: () => import('@/views/contactList/group/sub/SubJoined.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/group' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/group/mark',
                  component: () => import('@/views/contactList/group/sub/SubMark.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/group' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/group/partition',
                  component: () => import('@/views/contactList/group/sub/SubPartition.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/group' // 二级导航default-active
                  }
                },
                {
                  path: '/contactList/group/public',
                  component: () => import('@/views/contactList/group/sub/SubPublic.vue'),
                  meta: {
                    active_1: '/contactList', // 一级导航default-active
                    active_2: '/contactList/group' // 二级导航default-active
                  }
                }
              ]
            },
            {
              path: '/contactList/organization',
              component: () =>
                import('@/views/contactList/organization/ContactListOrganization.vue'),
              meta: {
                active_1: '/contactList' // 一级导航default-active
              }
            }
          ]
        },
        {
          path: '/meeting',
          component: () => import('@/views/meeting/MeetingLayout.vue')
        },
        {
          path: '/setting',
          component: () => import('@/views/setting/SettingLayout.vue'),
          redirect: '/setting/personal',
          children: [
            {
              path: '/setting/personal',
              component: () => import('@/views/setting/sub/SettingPersonal.vue'),
              meta: {
                active_1: '/setting' // 一级导航default-active
              }
            },
            {
              path: '/setting/security',
              component: () => import('@/views/setting/sub/SettingSecurity.vue'),
              meta: {
                active_1: '/setting' // 一级导航default-active
              }
            },
            {
              path: '/setting/notify',
              component: () => import('@/views/setting/sub/SettingNotify.vue'),
              meta: {
                active_1: '/setting' // 一级导航default-active
              }
            }
          ]
        }
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const userData = userStore()
  const isLogin = await userData.isLogin()

  if (!isLogin) {
    if (to.path === '/login') {
      next()
    } else if (router.getRoutes().some((route) => route.path === to.path)) {
      next('/login')
    } else {
      // 其他请求一律转到/根请求
      next('/')
    }
  } else {
    if (to.path === '/login') {
      next('/message')
    } else if (router.getRoutes().some((route) => route.path === to.path)) {
      next()
    } else {
      // 其他请求一律转到/根请求
      next('/')
    }
  }
})

export default router
