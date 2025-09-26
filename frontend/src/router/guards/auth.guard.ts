import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from 'src/stores/auth.store';

export const authGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore();

  // Check if route requires authentication
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login if not authenticated
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    // Redirect to home if already authenticated and trying to access login
    next({ path: '/' });
  } else {
    next();
  }
};

export const roleGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore();

  // Check if route requires specific role
  const requiredRole = to.meta.requiresRole as string | undefined;

  if (requiredRole && authStore.user) {
    if (authStore.user.role !== requiredRole) {
      // User doesn't have required role
      next({ path: '/', replace: true });
    } else {
      next();
    }
  } else {
    next();
  }
};
