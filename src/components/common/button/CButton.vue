<template>
  <div>
    <div
      class="btn btn__primary g-unselect"
      :style="{ width: width, height: height }"
    >
      <slot class="c-icon"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

const props = defineProps({
  width: {
    type: String,
    default: '40px'
  },
  height: {
    type: String,
    default: '30px'
  }
})
const { width, height } = toRefs(props)
</script>

<style lang="scss" scoped>
/* new style */
$shadow: 0.2rem 0.2rem 0.3rem var(--greyLight-2),
  -0.1rem -0.1rem 0.3rem var(--white);
$inner-shadow: inset 0.2rem 0.2rem 0.5rem var(--greyLight-2),
  inset -0.2rem -0.2rem 0.5rem var(--white);
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
.btn {
  //   width: 15rem;
  //   height: 4rem;
  border-radius: 0.5rem;
  box-shadow: $shadow;
  justify-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.3s ease;

  :deep(i) {
    font-size: 18px;
    color: white;
  }

  &__primary {
    grid-column: 1 / 2;
    grid-row: 4 / 5;
    background: black;
    // box-shadow: inset 0.2rem 0.2rem 1rem var(--primary-light),
    //   inset -0.2rem -0.2rem 1rem var(--primary-dark), $shadow;
    color: white;

    &:hover {
      color: var(--white);
    }
    &:active {
      box-shadow: inset 0.2rem 0.2rem 1rem rgb(91, 91, 91),
        inset -0.2rem -0.2rem 1rem rgb(91, 91, 91);
    }
  }

  &__secondary {
    grid-column: 1 / 2;
    grid-row: 5 / 6;
    color: var(--greyDark);
    &:hover {
      color: var(--primary);
    }
    &:active {
      box-shadow: $inner-shadow;
    }
  }

  p {
    font-size: 1rem;
  }
}
</style>
