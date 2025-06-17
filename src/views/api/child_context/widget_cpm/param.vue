<template>
  <div class="cm-outer">
    <div class="cm-inner" :class="['param', type]" @click="showCode = !showCode">
        <span>{{ text }}</span>
      </div>
  </div>
  
</template> 

<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  type: String
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
    color: white;
    border-radius: 4px;
    background: #FF8C00;
    font-size: 12px;
  }
}

</style>
