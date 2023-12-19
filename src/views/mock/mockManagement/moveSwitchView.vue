<template>
  <div class="segmented-control g-unselect">
    <input
      type="radio"
      name="radio2"
      @click="changeMenu('2')"
      value="3"
      id="tab-1"
      :checked="activeMenu === '2'"
    />
    <label for="tab-1" class="segmented-control__1"> <p>Body</p></label>

    <input
      type="radio"
      @click="changeMenu('1')"
      name="radio2"
      value="4"
      id="tab-2"
      :checked="activeMenu === '1'"
    />
    <label for="tab-2" class="segmented-control__2"> <p>Headers</p></label>

    <input
      type="radio"
      @click="changeMenu('3')"
      name="radio2"
      value="5"
      id="tab-3"
      :checked="activeMenu === '3'"
    />
    <label for="tab-3" class="segmented-control__3"> <p>Status</p></label>

    <input
      type="radio"
      @click="changeMenu('4')"
      name="radio2"
      value="5"
      id="tab-4"
      :checked="activeMenu === '4'"
    />
    <label for="tab-4" class="segmented-control__4">
      <p style="padding: 0px 5px">
        {{ $t('project.mock.desc.moreSetting') }}
      </p></label
    >

    <div class="segmented-control__color"></div>
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
  emit('changeMenuAction', _t)
}
</script>

<style lang="scss" scoped>
/* new style */
$shadow: 0.3rem 0.3rem 0.6rem var(--greyLight-2),
  -0.2rem -0.2rem 0.5rem var(--white);
$inner-shadow: inset 0.2rem 0.2rem 0.5rem var(--greyLight-2),
  inset -0.2rem -0.2rem 0.5rem var(--white);
.segmented-control {
  padding-right: 5px;
  --p: var(--primary);
  grid-column: 3 / 4;
  grid-row: 1 / 2;
  width: 27.4rem;
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

  &__1,
  &__2,
  &__3,
  &__4,
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
    position: absolute;
    height: 2.4rem;
    width: 6.4rem;
    margin-left: 0.3rem;
    border-radius: 0.5rem;
    box-shadow: $inner-shadow;
    pointer-events: none;
  }
}

#tab-1:checked ~ .segmented-control__color {
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-2:checked ~ .segmented-control__color {
  transform: translateX(6.8rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-3:checked ~ .segmented-control__color {
  transform: translateX(13.6rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

#tab-4:checked ~ .segmented-control__color {
  transform: translateX(20.4rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-5:checked ~ .segmented-control__color {
  display: none;
  // transform: translateX(6.8rem);
  // transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-6:checked ~ .segmented-control__color {
  transform: translateX(13.6rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
</style>
