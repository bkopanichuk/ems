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
          </div>
        </div>

        <!-- Update Display Name Card -->
        <div class="col-12 col-md-6">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">Update Display Name</div>

            <q-form @submit="updateDisplayName" class="column" style="gap: 1rem">
              <q-input
                v-model="displayNameForm.displayName"
                label="Display Name"
                hint="This is how your name appears in the system"
                :rules="[required('Display name is required')]"
                :disable="loadingName"
                class="base-input base-margin-bottom base-margin-bottom--small"
              />

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

            <q-form @submit="changePassword" class="column" style="gap: 1rem">
              <div class="row q-col-gutter-md">
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
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import profileService from 'src/services/profile.service';
import { useAuthStore } from 'src/stores/auth.store';
import { required, simplePasswordRules, confirmPasswordRules } from 'src/utils/validation';

const authStore = useAuthStore();
const $q = useQuasar();

const profile = ref({
  id: '',
  login: '',
  displayName: null as string | null,
  role: 'USER' as 'USER' | 'ADMIN',
  createdAt: '',
  updatedAt: '',
});

const displayNameForm = ref({
  displayName: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const loadingName = ref(false);
const loadingPassword = ref(false);

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
  try {
    const response = await profileService.getProfile();
    // Backend returns data directly, not wrapped
    profile.value = response.data;
    displayNameForm.value.displayName = profile.value.displayName || '';
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    $q.notify({
      message: 'Failed to load profile information',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-error',
    });
  }
};

const updateDisplayName = async () => {
  loadingName.value = true;
  try {
    const response = await profileService.updateProfile({
      displayName: displayNameForm.value.displayName,
    });

    // Backend returns data directly
    profile.value = response.data;
    await authStore.fetchProfile(); // Update store

    $q.notify({
      message: 'Display name updated successfully',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-success',
    });
  } catch (error) {
    $q.notify({
      message:
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to update display name',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-error',
    });
  } finally {
    loadingName.value = false;
  }
};

const changePassword = async () => {
  loadingPassword.value = true;
  try {
    await profileService.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    });

    $q.notify({
      message: 'Password changed successfully',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-success',
    });

    // Reset form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  } catch (error) {
    $q.notify({
      message:
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to change password',
      position: $q.screen.gt.xs ? 'top-right' : 'top',
      classes: 'max-width-24rem notify-error',
    });
  } finally {
    loadingPassword.value = false;
  }
};

onMounted(() => {
  void fetchProfile();
});
</script>
