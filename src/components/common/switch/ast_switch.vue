<template>
  <div class="switch">
    <div class="switch__2">
      <input
        @click="changeSwitchAction"
        :id="switchIndex"
        type="checkbox"
        :checked="isChecked === true && allDisabled === false"
        :disabled="allDisabled === true"
      />
      <label :id="switchIndex + '-label'" :for="switchIndex"></label>
    </div>
  </div>
</template>

<script setup lang="ts">
const prop = defineProps({
  allDisabled: {
    type: Boolean,
    default: false
  },
  isChecked: {
    type: Boolean,
    default: false
  },
  switchIndex: {
    type: String,
    default: 'switch-2'
  },
  coreId: {
    type: Number,
    default: -1
  }
})

const emit = defineEmits(['changeSwitch'])

function changeSwitchAction() {
  emit('changeSwitch', prop.coreId)
}
</script>

<style lang="scss" scoped>
$shadow: 0.3rem 0.3rem 0.6rem var(--greyLight-2),
  -0.2rem -0.2rem 0.5rem var(--white);
.switch {
  grid-column: 1 / 2;
  display: grid;
  grid-template-columns: repeat(2, min-content);
  // grid-gap: 3rem;
  justify-self: center;
  input {
    display: none;
  }

  &__1,
  &__2 {
    width: 3rem;
    label {
      display: flex;
      align-items: center;
      width: 100%;
      height: 1.5rem;
      box-shadow: $shadow;
      background: rgba(255, 255, 255, 0);
      position: relative;
      cursor: pointer;
      border-radius: 1.6rem;

      &::after {
        content: '';
        position: absolute;
        left: 0.4rem;
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        background: var(--greyDark);
        transition: all 0.4s ease;
      }
      &::before {
        content: '';
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(
          330deg,
          var(--primary-dark) 0%,
          var(--primary) 50%,
          var(--primary-light) 100%
        );
        opacity: 0;
        transition: all 0.4s ease;
      }
    }
  }
  & input:checked {
    & ~ label {
      &::before {
        opacity: 1;
      }
      &::after {
        left: 57%;
        background: var(--greyLight-1);
      }
    }
  }
}
</style>
