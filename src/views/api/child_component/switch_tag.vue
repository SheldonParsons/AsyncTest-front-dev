<template>
  <div class="container">
    <div class="tabs">
      <input type="radio" :checked="props.glider === 'menu'"  id="radio-1" name="tabs" />
      <label class="tab" for="radio-1" @click="change_tag('menu')"
        >目录设置</label
      >
      <input type="radio" :checked="props.glider === 'interface'" id="radio-2" name="tabs" />
      <label class="tab" for="radio-2" @click="change_tag('interface')"
        >全部接口</label
      >
      <input type="radio" :checked="props.glider === 'pre_action'" id="radio-3" name="tabs" />
      <label class="tab" for="radio-3" @click="change_tag('pre_action')"
        >前置操作</label
      >
      <input type="radio" :checked="props.glider === 'after_action'" id="radio-4" name="tabs" />
      <label class="tab" for="radio-4" @click="change_tag('after_action')"
        >后置操作</label
      >
      <input type="radio" :checked="props.glider === 'auth'" id="radio-5" name="tabs" />
      <label class="tab" for="radio-5" @click="change_tag('auth')">Auth</label>
      <span
        class="glider"
        :style="{ transform: `translateX(${get_position(props.glider)}%)` }"
      ></span>
    </div>
  </div>
</template>
<script lang="ts" setup>
const emit = defineEmits(["changeTag"]);
function change_tag(t: String) {
  emit("changeTag", t);
}
const props = defineProps({
  glider: {
    type: String,
    default: "interface",
  },
});

const position_mapping: any = {
  menu: 0,
  interface: 100,
  pre_action: 200,
  after_action: 300,
  auth: 400,
};

function get_position(glider: any) {
    return position_mapping[glider];
}

</script>
<style lang="scss" scoped>
*,
*:after,
*:before {
  box-sizing: border-box;
}

body {
  font-family: "Inter", sans-serif;
  background-color: rgba(#e6eef9, 0.5);
}
.container {
  display: flex;
  align-items: center;
  justify-content: left;
}
.tabs {
  display: flex;
  position: relative;
  background-color: #fff;
  // box-shadow: 0 0 0px 0 rgba(#185ee0, 0.9), 0 1px 1px 0 rgba(#185ee0, 0.9);
  padding: 0.75rem;
  border: 1px solid #e7e7e7;
  border-radius: 14px; // just a high number to create pill effect
  * {
    z-index: 2;
  }
}

input[type="radio"] {
  display: none;
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  width: 150px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 14px; // just a high number to create pill effect
  cursor: pointer;
  transition: color 0.15s ease-in;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  margin-left: 0.75rem;
  border-radius: 51px;
  background-color: #e6eef9;
  transition: 0.15s ease-in;
}

input[type="radio"] {
  &:checked {
    & + label {
      color: #fff;
      & > .notification {
        background-color: #fff;
        color: #fff;
      }
    }
  }
}

input[id="radio-1"] {
  &:checked {
    & ~ .glider {
      transform: translateX(0);
    }
  }
}

input[id="radio-2"] {
  &:checked {
    & ~ .glider {
      transform: translateX(100%);
    }
  }
}

input[id="radio-3"] {
  &:checked {
    & ~ .glider {
      transform: translateX(200%);
    }
  }
}

input[id="radio-4"] {
  &:checked {
    & ~ .glider {
      transform: translateX(300%);
    }
  }
}

input[id="radio-5"] {
  &:checked {
    & ~ .glider {
      transform: translateX(400%);
    }
  }
}

.glider {
  position: absolute;
  display: flex;
  height: 24px;
  width: 150px;
  background-color: #000000;
  z-index: 1;
  border-radius: 5px; // just a high number to create pill effect
  transition: 0.25s ease-out;
}

@media (max-width: 700px) {
  .tabs {
    transform: scale(0.6);
  }
}
</style>
