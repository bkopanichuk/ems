<template>
  <q-page class="col base-page column items-center">
    <div class="column no-wrap base-page-wrapper">
      <div class="text-xl base-margin-bottom">Dashboard</div>

      <div class="row q-col-gutter-sm">
        <!-- Welcome Card -->
        <div class="col-12">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">Welcome, {{ userName }}!</div>
            <div class="text-md text-medium">
              You are logged in as
              <q-badge
                :color="userRole === 'ADMIN' ? 'orange' : 'blue'"
                class="q-ml-xs"
                style="padding: 0.25rem 0.5rem; font-weight: 600"
              >
                {{ userRole }}
              </q-badge>
            </div>
          </div>
        </div>

        <!-- Dashboard Content Placeholder -->
        <div class="col-12">
          <div class="column items-center base-card bordered-card" style="padding: 3rem 1.5rem">
            <q-icon name="dashboard" size="4rem" color="accent" style="opacity: 0.5" />
            <div class="text-lg base-margin-bottom--small" style="margin-top: 1rem">
              Dashboard Content
            </div>
            <div class="text-sm text-medium text-center" style="max-width: 30rem">
              This area will display your dashboard content and metrics.
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="col-12">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">Quick Actions</div>
            <div class="row q-col-gutter-sm" style="margin-top: 0.5rem">
              <template v-if="isAdmin">
                <div class="col-12 col-sm-6 col-md-3">
                  <q-btn
                    icon="group"
                    label="Manage Users"
                    class="base-button full-width"
                    @click="navigateToUsers"
                  />
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <q-btn
                    icon="person"
                    label="My Profile"
                    class="base-button full-width"
                    @click="navigateToProfile"
                  />
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <q-btn icon="settings" label="Settings" class="base-button full-width" disabled />
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <q-btn
                    icon="assessment"
                    label="Reports"
                    class="base-button full-width"
                    disabled
                  />
                </div>
              </template>
              <template v-else>
                <div class="col-12 col-sm-6 col-md-4">
                  <q-btn
                    icon="person"
                    label="View Profile"
                    class="base-button full-width"
                    @click="navigateToProfile"
                  />
                </div>
                <div class="col-12 col-sm-6 col-md-4">
                  <q-btn icon="settings" label="Settings" class="base-button full-width" disabled />
                </div>
                <div class="col-12 col-sm-6 col-md-4">
                  <q-btn icon="help" label="Help" class="base-button full-width" disabled />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- System Status Card -->
        <div class="col-12 col-md-6">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">System Status</div>
            <div class="row items-center" style="gap: 0.5rem">
              <div class="status-indicator indicator--active"></div>
              <span class="text-md">All systems operational</span>
            </div>
            <div class="text-sm text-medium" style="margin-top: 0.5rem">
              Last updated: {{ formatDate(new Date()) }}
            </div>
          </div>
        </div>

        <!-- Account Information Card -->
        <div class="col-12 col-md-6">
          <div class="column no-wrap base-card bordered-card" style="gap: 0.5rem 0">
            <div class="text-lg">Account Information</div>
            <div class="column" style="gap: 0.5rem">
              <div class="row justify-between">
                <span class="text-sm text-medium">Username:</span>
                <span class="text-sm">{{ userLogin }}</span>
              </div>
              <div class="row justify-between">
                <span class="text-sm text-medium">Role:</span>
                <span class="text-sm">{{ userRole }}</span>
              </div>
              <div class="row justify-between">
                <span class="text-sm text-medium">Member Since:</span>
                <span class="text-sm">{{ formatDate(userCreatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const userName = computed(() => authStore.user?.displayName || authStore.user?.login || 'User');
const userLogin = computed(() => authStore.user?.login || 'Unknown');
const userRole = computed(() => authStore.user?.role || 'USER');
const userCreatedAt = computed(() => authStore.user?.createdAt || new Date());
const isAdmin = computed(() => authStore.isAdmin);

const formatDate = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return 'N/A';

  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    // For "Last updated" show time, for "Member Since" show only date
    if (dateInput instanceof Date && dateInput.getTime() === new Date().getTime()) {
      // Current time
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // For member since, show only date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', dateInput, error);
    return 'N/A';
  }
};

const navigateToProfile = () => {
  void router.push('/profile');
};

const navigateToUsers = () => {
  void router.push('/users');
};
</script>
