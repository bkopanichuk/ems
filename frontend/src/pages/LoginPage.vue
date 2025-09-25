<template>
  <q-page class="col column items-center base-page login-page">
    <div class="col flex flex-center base-page-wrapper">
      <div class="column items-center base-card bordered-card login-card">
        <div class="column items-center full-width base-margin-bottom base-margin-bottom--large">
          <div class="text-xxl text-center">EMS</div>
          <div class="text-lg text-medium text-center">Energy Management System</div>
        </div>

        <q-form class="column items-center full-width" @submit="onSubmit" @reset="onReset" greedy>
          <q-input
            v-model="loginForm.username"
            class="base-input full-width base-margin-bottom base-margin-bottom--mini"
            placeholder="Username"
            :rules="[required('')]"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <q-input
            v-model="loginForm.password"
            class="base-input full-width base-margin-bottom base-margin-bottom--large"
            placeholder="Password"
            type="password"
            :rules="[required('')]"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>

          <q-btn type="submit" class="base-button full-width" :loading="loading" :disable="loading">
            Sign In
          </q-btn>
        </q-form>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth.store';
import { useQuasar } from 'quasar';
import { required } from 'src/utils/validation';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loginForm = ref({
  username: '',
  password: '',
});

const loading = ref(false);

const onSubmit = async () => {
  loading.value = true;

  try {
    const result = await authStore.login(loginForm.value.username, loginForm.value.password);

    if (result.success) {
      $q.notify({
        message: 'Login successful!',
        position: $q.screen.gt.xs ? 'top-right' : 'top',
        classes: 'max-width-24rem notify-success',
      });

      // Navigate to redirect URL or home
      const redirectTo = (route.query.redirect as string) || '/';
      await router.push(redirectTo);
    } else {
      $q.notify({
        message: result.error || 'Login failed',
        position: $q.screen.gt.xs ? 'top-right' : 'top',
        classes: 'max-width-24rem notify-error',
      });
    }
  } catch (error) {
    $q.notify({
      message: (error as Error).message || 'An unexpected error occurred',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-error',
    });

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
