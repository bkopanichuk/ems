<template>
  <q-layout view="hHh lpR fFf" class="flex clean-layout">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.clean-layout {
  height: 100dvh;
  width: 100dvw;
  max-height: 100dvh;
  max-width: 100dvw;
}
</style>
