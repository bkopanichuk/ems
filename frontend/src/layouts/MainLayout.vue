<template>
  <q-layout view="hHh Lpr lFf" class="main-layout">
    <q-header class="row items-center">
      <q-toolbar class="row no-wrap items-center">
        <q-btn
          v-if="$q.screen.lt.md"
          class="base-button base-button--icon base-button--outlined"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        >
          <q-icon name="menu" size="1.75rem" />
        </q-btn>

        <div v-if="$q.screen.gt.sm" class="text-lg">EMS - Energy Management System</div>

        <q-space />

        <q-btn-dropdown
          class="base-button base-button--outlined"
          content-class="base-button-dropdown-menu"
        >
          <q-list>
            <q-item class="row items-center" clickable v-close-popup @click="navigateToProfile">
              <q-icon
                name="person"
                class="base-margin-right base-margin-right--small"
                size="1.5rem"
              />
              <div class="ellipsis">Profile</div>
            </q-item>

            <q-item class="row items-center" clickable v-close-popup @click="showSessions">
              <q-icon
                name="devices"
                class="base-margin-right base-margin-right--small"
                size="1.5rem"
              />
              <div>Active Sessions ({{ sessionCount }})</div>
            </q-item>

            <q-separator />

            <q-item class="row items-center" clickable v-close-popup @click="handleLogout">
              <q-icon
                name="logout"
                color="negative"
                class="base-margin-right base-margin-right--small"
                size="1.5rem"
              />
              <div>Logout</div>
            </q-item>
          </q-list>
          <template v-slot:label>
            <div class="row no-wrap items-center" style="max-width: 10rem">
              <q-icon name="account_circle" class="base-margin-right base-margin-right--mini" />
              <div class="ellipsis">{{ userName }}</div>
            </div>
          </template>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above :width="remToPx(14)">
      <q-list>
        <q-item clickable v-ripple :to="'/'" exact class="row no-wrap items-center drawer-item">
          <q-icon name="dashboard" />
          <div>Dashboard</div>
        </q-item>

        <q-item clickable v-ripple :to="'/inverters'" class="row no-wrap items-center drawer-item">
          <q-icon name="solar_power" />
          <div>My systems</div>
        </q-item>

        <template v-if="isAdmin">
          <!-- <q-separator /> -->

          <q-item clickable v-ripple :to="'/users'" class="row no-wrap items-center drawer-item">
            <q-icon name="group" />
            <div>User Management</div>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Sessions Dialog -->
    <q-dialog v-model="sessionsDialog" position="right">
      <SessionsList @close="sessionsDialog = false" />
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth.store';
import { Dialog, Loading } from 'quasar';
import SessionsList from 'src/components/auth/SessionsList.vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const leftDrawerOpen = ref(false);
const sessionsDialog = ref(false);
const sessionCount = ref(0);

const userName = computed(() => authStore.user?.displayName || authStore.user?.login || 'User');
// const userLogin = computed(() => authStore.user?.login || '');
// const userRole = computed(() => authStore.user?.role || 'USER');
const isAdmin = computed(() => authStore.isAdmin);

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value;
};

const navigateToProfile = () => {
  void router.push('/profile');
};

const showSessions = async () => {
  sessionsDialog.value = true;
  const result = await authStore.getActiveSessions();
  if (result?.success && result?.data) {
    sessionCount.value = result.data.length;
  }
};

const handleLogout = () => {
  Dialog.create({
    title: 'Confirm Logout',
    message: 'Are you sure you want to logout?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      Loading.show({
        message: 'Logging out...',
      });

      try {
        await authStore.logout(router);
      } finally {
        Loading.hide();
      }
    })();
  });
};

const remToPx = (rem: number) => {
  const rootFontSize = getComputedStyle(document.documentElement).fontSize;
  const fontSize = parseFloat(rootFontSize);
  return rem * fontSize;
};

onMounted(async () => {
  // Fetch updated profile data
  await authStore.fetchProfile();

  // Get session count
  const result = await authStore.getActiveSessions();
  if (result?.success && result?.data) {
    sessionCount.value = result.data.length;
  }
});
</script>

<style lang="scss">
.main-layout {
  max-height: 100%;
  .q-header {
    height: 4rem;
    .q-toolbar {
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      padding: 0.5rem 1.5rem;
    }
    border-bottom: 0.0625rem solid $secondary-hover;
  }

  .q-drawer {
    background: $secondary;
    border-right: 0.0625rem solid $secondary-hover;

    .q-drawer__content {
      .q-separator {
        height: 0.0625rem;
        background: $secondary-hover;
      }

      .drawer-item {
        height: 4rem;
        border-bottom: 0.0625rem solid $secondary-hover;
        padding: 0.5rem 1.5rem;
        font-size: 1rem;
        line-height: 1.5;
        font-weight: 500;
        color: $text-medium;
        transition:
          background-color 0.3s,
          color 0.3s;

        .q-icon {
          font-size: 1.5rem;
          margin-right: 0.75rem;
        }

        &:hover {
          background-color: $secondary-hover;
          color: $text;
        }

        &.q-router-link--active {
          background-color: $accent;
          color: $text;
        }

        .q-focus-helper {
          display: none;
        }
      }
    }
  }
}
</style>
