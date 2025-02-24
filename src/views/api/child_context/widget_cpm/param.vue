<template>
  <div class="cm-outer">
    <span class="cm-inner" @click="showCode = !showCode">
        {{ text }}
      </span>
  </div>
  
</template>

<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.cm-outer {
  cursor: pointer;
  display: inline-block;
  padding: 0px 0.2em;
  .cm-inner {
    cursor: pointer;
    display: flex;
    align-items: center;
    height: 16px;
    padding: 0px 0.2em;
    color: var(--white);
    border: 1px solid var(--primary);
    border-radius: 2px;
    background: var(--el-color-primary-light-3);
    font-size: 12px;
  }
}

</style>
