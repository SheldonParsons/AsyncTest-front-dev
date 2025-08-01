<script setup lang="ts">
import { ref } from 'vue'
import { Toolbar } from 'reka-ui/namespaced'
import ToggleItem from '@/assets/motion/ToggleItem.vue' // 按你的目录改路径
const formatting = ref<string[]>([])
const alignment = ref('left')
</script>

<template>
    <Toolbar.Root class="toggle-container" aria-label="Formatting options">
        <Toolbar.ToggleGroup class="toggle-group" type="single" v-model="alignment" aria-label="Text alignment">
            <ToggleItem value="left" :model-value="alignment" icon="radix-icons:text-align-left"
                aria-label="Left aligned">123</ToggleItem>
            <ToggleItem value="center" :model-value="alignment" icon="radix-icons:text-align-center"
                aria-label="Center aligned" />
            <ToggleItem value="right" :model-value="alignment" icon="radix-icons:text-align-right"
                aria-label="Right aligned" :with-focus="true" />
        </Toolbar.ToggleGroup>
    </Toolbar.Root>
</template>

<style lang="scss" scoped>
.toggle-container {
  display: flex;
  padding: 10px;
  width: 100%;
  max-width: 350px;
  min-width: max-content;
  border-radius: 6px;
  background-color: #0b1011;
  border-radius: 10px;
}

.toggle-container svg {
  width: 24px;
  height: 24px;
}

.toggle-group {
  display: flex;
  flex-direction: row;
  gap: 4px;
}

.toggle-item,
.link,
.button {
  flex: 0 0 auto;
  color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  display: inline-flex;
  font-size: 14px;
  line-height: 1;
  align-items: center;
  justify-content: center;
}

.toggle-item {
  position: relative;
}

.toggle-item > span {
  position: relative;
  z-index: 1;
}

.separator {
  width: 1px;
  background-color: #1d2628;
  margin: 0 10px;
}

@media (max-width: 520px) {
  .toggle-item,
  .link,
  .button {
    padding: 5px;
  }

  .toggle-container svg {
    width: 16px;
    height: 16px;
  }
}

.selected-indicator {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background-color: #2b323d;
  border-radius: 5px;
  mix-blend-mode: lighten;
}

.button {
  padding-left: 15px;
  padding-right: 15px;
  font-size: 16px;
  color: #f5f5f5;
  background-color: #ff0088;
}

.button:hover {
  background-color: #ff0088;
}
</style>