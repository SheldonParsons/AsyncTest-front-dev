<template>
  <div class="container">
    <div class="switch-tab">
      <div :class="{ active: activeTab === 'menu' }" @click="change_tag('menu')">
        <span>目录设置</span>
      </div>
      <div :class="{ active: activeTab === 'interface' }" @click="change_tag('interface')">
        <span>全部接口</span>
      </div>
      <div :class="{ active: activeTab === 'pre_action' }" @click="change_tag('pre_action')">
        <span>前置操作</span>
      </div>
      <div :class="{ active: activeTab === 'after_action' }" @click="change_tag('after_action')">
        <span>后置操作</span>
      </div>
      <div :class="{ active: activeTab === 'auth' }" @click="change_tag('auth')">
        <span>Auth</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
const emit = defineEmits(["changeTag"]);
import {ref} from 'vue'
const activeTab:any = ref<"menu" | "interface" | "pre_action" | "after_action" | "auth">("menu");
function change_tag(t: String) {
  if (t === 'auth') {
    window.$toast({title: '该功能暂不可用，请后续关注'})
    return
  }
  activeTab.value = t
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

.switch-tab {
  display: flex;
  justify-content: start;
  align-items: center;
  padding-top: 10px;
  padding-bottom: 10px;
  padding-left: 20px;
  margin-left: 0px !important;
  background-color: white;
  gap: 5px;

  .active {
    background-color: black;
    color: white;
  }

  div {
    padding: 3px 10px;
    color: #667085;
    font-size: 14px;
    cursor: pointer;
    border-radius: 8px;
  }

  .active {
    background-color: black !important;
    color: white !important;
  }

  div:hover {
    background-color: rgba(16, 24, 40, 0.05);
  }
}
</style>
