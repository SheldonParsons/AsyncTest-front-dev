<template>
  <div class="segmented-control-other g-unselect">
    <input
      type="radio"
      name="radio2"
      @click="changeMenu('5')"
      value="5"
      id="tab-5"
      :checked="activeMenu === '5'"
    />
    <label for="tab-5" class="segmented-control-other__5">
      <p>{{ $t('project.mock.desc.expectResponse') }}</p></label
    >

    <input
      type="radio"
      @click="changeMenu('6')"
      name="radio2"
      value="6"
      id="tab-6"
      :checked="activeMenu === '6'"
    />
    <label for="tab-6" class="segmented-control-other__6">
      <p>{{ $t('project.mock.desc.presetsResponse') }}</p></label
    >

    <div class="segmented-control-other__color"></div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  activeMenu: {
    type: String,
    default: '0'
  }
})

const emit = defineEmits(['changeMenuAction'])

function changeMenu(_t: any) {
  emit('changeMenuAction', _t, true)
}
</script>

<style lang="scss" scoped>
/* new style */
$shadow: 0.3rem 0.3rem 0.6rem var(--greyLight-2),
  -0.2rem -0.2rem 0.5rem var(--white);
$inner-shadow: inset 0.2rem 0.2rem 0.5rem var(--greyLight-2),
  inset -0.2rem -0.2rem 0.5rem var(--white);
.segmented-control-other {
  padding-right: 5px;
  --p: var(--greyDark);
  grid-column: 3 / 4;
  grid-row: 1 / 2;
  width: 13.7rem;
  height: 3.5rem;
  box-shadow: $shadow;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  position: relative;
  .checkbox-p {
    font-size: 18px;
    font-weight: 500;
    margin-left: 5px;
    color: var(--primary);
  }

  input {
    display: none;
  }

  > input:checked + label {
    transition: all 0.5s ease;
    color: var(--p);
  }

  &__5,
  &__6 {
    width: 6.8rem;
    height: 2.6rem;
    font-size: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    color: var(--greyDark);
    transition: all 0.5s ease;

    &:hover {
      color: var(--primary);
    }
  }

  &__color {
    display: none;
    position: absolute;
    height: 2.4rem;
    width: 6.4rem;
    margin-left: 0.3rem;
    border-radius: 0.5rem;
    box-shadow: $inner-shadow;
    pointer-events: none;
  }
}
.checkbox-control {
  width: auto;
  padding-right: 20px;
}

#tab-1:checked ~ .segmented-control-other__color {
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-2:checked ~ .segmented-control-other__color {
  transform: translateX(6.8rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-3:checked ~ .segmented-control-other__color {
  transform: translateX(13.6rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

#tab-4:checked ~ .segmented-control-other__color {
  transform: translateX(20.4rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-5:checked ~ .segmented-control-other__color {
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-6:checked ~ .segmented-control-other__color {
  transform: translateX(6.8rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
</style>
