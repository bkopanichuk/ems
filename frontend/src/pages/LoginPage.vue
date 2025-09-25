<template>
  <q-page class="col column items-center base-page login-page">
    <div class="col flex flex-center base-page-wrapper">
      <div class="column items-center base-card bordered-card login-card">
        <div class="column items-center full-width base-margin-bottom">
          <div class="text-xxl">EMS</div>
          <div class="text-lg text-medium">Energy Management System</div>
        </div>

        <q-form class="column items-center full-width" @submit="onSubmit" @reset="onReset">
          <q-input
            v-model="loginForm.username"
            class="base-input full-width"
            label="Username"
            lazy-rules
            :rules="[required('Username is required')]"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <q-input
            v-model="loginForm.password"
            class="base-input full-width base-margin-bottom"
            label="Password"
            type="password"
            lazy-rules
            :rules="[required('Password is required')]"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>

          <q-btn type="submit" class="base-button full-width" :loading="loading" :disable="loading">
            Sign In
          </q-btn>

          <div v-if="errorMessage" class="text-negative text-caption">
            {{ errorMessage }}
          </div>
        </q-form>

        <q-card-section v-if="isBlocked" class="bg-negative text-white">
          <q-banner class="bg-transparent">
            <template v-slot:avatar>
              <q-icon name="error" color="white" />
            </template>
            Your account has been blocked. Please contact the administrator.
          </q-banner>
        </q-card-section>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth.store';
import { Notify } from 'quasar';
import { required } from 'src/utils/validation';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loginForm = ref({
  username: '',
  password: '',
});

const loading = ref(false);
const errorMessage = ref('');
const isBlocked = ref(false);

const onSubmit = async () => {
  loading.value = true;
  errorMessage.value = '';
  isBlocked.value = false;

  try {
    const result = await authStore.login(loginForm.value.username, loginForm.value.password);

    if (result.success) {
      Notify.create({
        type: 'positive',
        message: 'Login successful!',
        position: 'top',
      });

      // Navigate to redirect URL or home
      const redirectTo = (route.query.redirect as string) || '/';
      await router.push(redirectTo);
    } else {
      errorMessage.value = result.error || 'Login failed';

      // Check if user is blocked
      if (result.error?.toLowerCase().includes('blocked')) {
        isBlocked.value = true;
      }
    }
  } catch (error) {
    errorMessage.value = (error as Error).message || 'An unexpected error occurred';
    console.error('Login error:', error);
  } finally {
    loading.value = false;
  }
};

const onReset = () => {
  loginForm.value = {
    username: '',
    password: '',
  };
  errorMessage.value = '';
  isBlocked.value = false;
};
</script>

<style scoped lang="scss">
.login-page {
  .login-card {
    width: 24rem;
    max-width: 100%;
  }
}
</style>
