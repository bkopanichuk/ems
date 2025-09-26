import type { PiniaPluginContext } from 'pinia';
import { ref } from 'vue';

declare module 'pinia' {
  export interface PiniaCustomProperties {
    $reset: () => void;
  }

  export interface Pinia {
    resetAllStores: () => void;
  }
}

interface StoreWithReset {
  $id: string;
  $state: Record<string, unknown>;
  $patch: (state: Record<string, unknown>) => void;
  $reset?: () => void;
  reset?: () => void;
}

export function createResetPlugin() {
  const stores = ref<Set<StoreWithReset>>(new Set());

  return (context: PiniaPluginContext) => {
    const { store, pinia } = context;

    // Track this store
    stores.value.add(store);

    // Add $reset method to each store if it doesn't have one
    if (!store.$reset) {
      store.$reset = () => {
        // Call the store's own reset method if it exists
        if (typeof store.reset === 'function') {
          store.reset();
        } else {
          // Otherwise reset to initial state
          store.$patch(store.$state);
        }
      };
    }

    // Add global reset function to pinia instance
    if (!pinia.resetAllStores) {
      pinia.resetAllStores = () => {
        stores.value.forEach(s => {
          // Skip auth store to avoid circular dependency
          if (s.$id === 'auth') return;

          if (typeof s.reset === 'function') {
            s.reset();
          } else if (typeof s.$reset === 'function') {
            s.$reset();
          }
        });
      };
    }
  };
}