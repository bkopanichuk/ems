<template>
  <q-page class="col base-page column items-center">
    <div class="column no-wrap base-page-wrapper">
      <div class="text-xl base-margin-bottom">Profile Settings</div>

      <div class="row q-col-gutter-sm">
        <!-- Profile Information Card -->
        <div class="col-12 col-md-6">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">Profile Information</div>

            <q-input :model-value="profile.login" label="Username" readonly class="base-input" />

            <q-input
              :model-value="profile.displayName || 'Not set'"
              label="Display Name"
              readonly
              class="base-input"
            />

            <q-input :model-value="profile.role" label="Role" readonly class="base-input" />

            <q-input
              :model-value="formatDate(profile.createdAt)"
              label="Created At"
              readonly
              class="base-input"
            />

            <q-input
              :model-value="formatDate(profile.updatedAt)"
              label="Updated At"
              readonly
              class="base-input"
            />

            <!-- <q-input
              :model-value="formatDate(profile.lastLoginAt)"
              label="Last Login"
              readonly
              class="base-input"
            />

            <q-input
              :model-value="profile.loginCount || 0"
              label="Login Count"
              readonly
              class="base-input"
            /> -->
          </div>
        </div>

        <!-- Update Display Name Card -->
        <div class="col-12 col-md-6">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">Update Display Name</div>

            <q-form @submit="updateDisplayName" greedy class="column no-wrap" style="gap: 1.5rem 0">
              <div class="row full-width">
                <q-input
                  v-model="displayNameForm.displayName"
                  label="Display Name"
                  hint="This is how your name appears in the system"
                  :rules="[required('Display name is required')]"
                  :disable="loadingName"
                  class="base-input full-width"
                />
              </div>

              <q-btn
                type="submit"
                label="Update Name"
                :loading="loadingName"
                :disable="loadingName"
                class="base-button"
              />
            </q-form>
          </div>
        </div>

        <!-- Change Password Card (USER role only) -->
        <div v-if="profile.role === 'USER'" class="col-12">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">Change Password</div>

            <q-form
              ref="changePasswordForm"
              @submit="changePassword"
              greedy
              class="column no-wrap"
              style="gap: 1.5rem 0"
            >
              <div class="row q-col-gutter-x-sm q-col-gutter-y-sm">
                <div class="col-12 col-md-4">
                  <q-input
                    v-model="passwordForm.currentPassword"
                    label="Current Password"
                    type="password"
                    :rules="[required('Current password is required')]"
                    :disable="loadingPassword"
                    class="base-input"
                  />
                </div>

                <div class="col-12 col-md-4">
                  <q-input
                    v-model="passwordForm.newPassword"
                    label="New Password"
                    type="password"
                    :rules="simplePasswordRules()"
                    :disable="loadingPassword"
                    class="base-input"
                  />
                </div>

                <div class="col-12 col-md-4">
                  <q-input
                    v-model="passwordForm.confirmPassword"
                    label="Confirm New Password"
                    type="password"
                    :rules="confirmPasswordRules(passwordForm.newPassword)"
                    :disable="loadingPassword"
                    class="base-input"
                  />
                </div>
              </div>

              <q-btn
                type="submit"
                label="Change Password"
                :loading="loadingPassword"
                :disable="loadingPassword"
                class="base-button"
              />
            </q-form>
          </div>
        </div>

        <!-- Admin Notice -->
        <div v-else class="col-12">
          <div class="row items-center base-card bordered-card" style="gap: 1rem">
            <q-icon name="info" size="1.5rem" color="accent" />
            <div class="col text-medium">
              Administrators cannot change their password through the application. Password must be
              set via environment variables.
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useQuasar, QForm } from 'quasar';
import { useAuthStore } from 'src/stores/auth.store';
import { required, simplePasswordRules, confirmPasswordRules } from 'src/utils/validation';

const authStore = useAuthStore();
const $q = useQuasar();

const profile = computed(
  () =>
    authStore.user || {
      id: '',
      login: '',
      displayName: null as string | null,
      role: 'USER' as 'USER' | 'ADMIN',
      createdAt: '',
      updatedAt: '',
      lastLoginAt: '',
      loginCount: 0,
    },
);

const displayNameForm = ref({
  displayName: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const loadingName = computed(() => authStore.profileLoading);
const loadingPassword = computed(() => authStore.profileLoading);

const formatDate = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return 'N/A';

  try {
    // If it's already a Date object, use it directly
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateInput);
      return 'N/A';
    }

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', dateInput, error);
    return 'N/A';
  }
};

const fetchProfile = async () => {
  // Trigger background refresh (silent=true means no loading state)
  const result = await authStore.fetchProfile(true);

  if (result.success && result.data) {
    displayNameForm.value.displayName = result.data.displayName || '';
  } else if (!result.success && authStore.user) {
    // We have cached data, just couldn't refresh - that's ok
    displayNameForm.value.displayName = authStore.user.displayName || '';
  } else {
    // No cached data and fetch failed
    $q.notify({
      message: 'Failed to load profile information',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-error',
    });
  }
};

const updateDisplayName = async () => {
  const result = await authStore.updateProfile(displayNameForm.value.displayName);

  if (result.success) {
    $q.notify({
      message: 'Display name updated successfully',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-success',
    });
  } else {
    $q.notify({
      message: result.error || 'Failed to update display name',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-error',
    });
  }
};

const changePasswordForm = ref<QForm | null>(null);

const changePassword = async () => {
  const result = await authStore.changePassword(
    passwordForm.value.currentPassword,
    passwordForm.value.newPassword,
  );

  if (result.success) {
    $q.notify({
      message: result.message || 'Password changed successfully',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-success',
    });

    // Reset form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    // Reset validation state in nextTick to ensure DOM updates first
    await nextTick();
    changePasswordForm.value?.resetValidation();
  } else {
    $q.notify({
      message: result.error || 'Failed to change password',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-error',
    });
  }
};

onMounted(() => {
  // Initialize display name from cached data immediately
  if (authStore.user) {
    displayNameForm.value.displayName = authStore.user.displayName || '';
  }

  // Trigger background refresh
  void fetchProfile();
});
</script>
