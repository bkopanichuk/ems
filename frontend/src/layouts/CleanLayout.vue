<template>
  <q-layout view="hHh lpR fFf" class="flex clean-layout">
    <q-page-container class="flex full-width full-height">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.clean-layout {
  .q-page-container {
  }
}
</style>
