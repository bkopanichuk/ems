import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Auth routes with Clean Layout
  {
    path: '/login',
    component: () => import('layouts/CleanLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('pages/LoginPage.vue'),
      },
    ],
  },

  // Main application routes with Main Layout
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('pages/IndexPage.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('pages/ProfilePage.vue'),
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('pages/UsersPage.vue'),
        meta: { requiresRole: 'ADMIN' },
      },
      {
        path: 'inverters',
        name: 'inverters',
        component: () => import('pages/InvertersPage.vue'),
      },
      {
        path: 'inverters/:id',
        name: 'inverter-detail',
        component: () => import('pages/InverterDetailPage.vue'),
      },
    ],
  },

  // Error page
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
