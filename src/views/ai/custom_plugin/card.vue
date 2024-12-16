<template>
<div class="card" data-state="#about">
  <div class="card-header">
    <div class="card-cover" :style="{ backgroundImage: `url(${img})` }"></div>
    <img class="card-avatar" :src="img" alt="avatar" />
    <h1 class="card-fullname">{{ title }}</h1>
    <h2 class="card-jobtitle">提供商：{{subtitle}}</h2>
  </div>
  <div class="card-main">
    <div class="card-section is-active" id="about">
      <div class="card-content">
        <div class="card-subtitle">关于该提供商</div>
        <p class="card-desc">{{ desc }}</p>
      </div>
      <button class="edit-btn" @click="editProviderAction">更多设置</button><button @click="deleteProviderAction" class="delete-btn">删除供应商</button>
    </div>
    <div class="card-section" id="contact">
      <div class="card-content">
        <div class="card-subtitle">插件列表</div>
        <div class="card-contact-wrapper">
          <div v-if="tools.length > 0" v-for="(item, index) in tools" :key="index" class="card-contact">
            
                <el-row style="width: 100%;" justify="center">
                    <el-col :span="24" style="color: var(--el-color-primary);font-weight: 600;"><el-divider><h3>{{ item.name }}</h3></el-divider></el-col>
                    <el-col style="color: var(--el-color-primary);font-weight: 600;" :span="5">{{ item.method }}</el-col>
                    <el-col :span="19">{{ item.url }}</el-col>
                    <el-col :span="24" style="font-weight: 600;margin-top: 5px;"><span>插件简介：{{ item.description }}</span></el-col>
                    <el-col :offset="1" :span="10"><button style="width: 100%;" class="edit-btn" @click="editPluginAction(item)">查看详情</button></el-col>
                    <el-col :offset="1" :span="10"><button style="width: 100%;margin-left: 0px;" @click="deletePluginAction(item)" class="delete-btn">删除插件</button></el-col>
                </el-row>
          </div>
          <div v-else class="card-contact">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" /></svg>
                暂无插件
          </div>
          <button @click="openPluginDialog" class="contact-me">添加插件</button>
        </div>
      </div>
    </div>
    <div class="card-buttons">
      <button @click="handleButtonClick" data-section="#about" class="is-active">提供商</button>
      <!-- <button @click="handleButtonClick" data-section="#experience">EXPERIENCE</button> -->
      <button @click="handleButtonClick" data-section="#contact">插件</button>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { deleteProvider,deleteProviderTool } from "@/api/ai/index";
const emit = defineEmits(['openPluginDialog','reload', 'deleteFailed', 'more','edit_plugin'])
const props = defineProps({
  img: {
    type: String,
    default: ""
  },
  title: {
    type: String,
    default: ""
  },
  subtitle: {
    type: String,
    default: ""
  },
  desc: {
    type: String,
    default: ""
  },
  provider: {
    type: Number,
    default: 0
  },
  tools: {
    type: Array as any,
    default: () => []
  }
})

const handleButtonClick = (e:any) => {
  const button = e.currentTarget; // 获取当前点击的按钮
  const card = button.closest(".card"); // 获取当前按钮所在的卡片
  const targetSection = button.getAttribute("data-section");
  const sections = card.querySelectorAll(".card-section"); // 仅获取当前卡片的部分
  const buttons = card.querySelectorAll(".card-buttons button"); // 仅获取当前卡片的按钮

  // 根据目标部分设置卡片的状态
  targetSection !== "#about"
    ? card.classList.add("is-active")
    : card.classList.remove("is-active");

  card.setAttribute("data-state", targetSection);
  
  // 移除所有部分和按钮的激活状态
  sections.forEach((s:any) => s.classList.remove("is-active"));
  buttons.forEach((b:any) => b.classList.remove("is-active"));
  
  // 为当前按钮和目标部分添加激活状态
  button.classList.add("is-active");
  const section = card.querySelector(targetSection); // 仅获取当前卡片的目标部分
  section.classList.add("is-active");
};

function openPluginDialog() {
    emit('openPluginDialog', true)
}

function editProviderAction() {
    emit('more', props.provider)
}
function editPluginAction(item:any) {
    emit('edit_plugin', item)
}

function deleteProviderAction() {
    const data = {}
    deleteProvider(props.provider, data).then((res:any) => {
        if (res.msg) {
            emit('deleteFailed', res.msg)
        } else {
            emit('reload', true)
        }
    })
}

function deletePluginAction(item:any) {
    const data = {}
    deleteProviderTool(item.id,data).then((res:any) => {
        if (res.msg) {
            emit('deleteFailed', res.msg)
        } else {
            emit('reload', true)
        }
    })
}

</script>


<style lang="scss" scoped>
.card::-webkit-scrollbar {
  display: none;
}

.card {
  width: 100%;
  margin: auto;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
  background-color: rgba(255, 255, 255, 1);
  display: flex;
  transition: 0.3s;
  flex-direction: column;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.2);
}

.card[data-state="#about"] {
  height: 350px;
  .card-main {
    padding-top: 0;
  }
}

.card[data-state="#contact"] {
  height: 350px;
}

.card[data-state="#experience"] {
  height: 550px;
}

.card.is-active {
  .card-header {
    height: 80px;
  }

  .card-cover {
    height: 100px;
    top: -50px;
  }

  .card-avatar {
    transform: none;
    left: 20px;
    width: 50px;
    height: 50px;
    bottom: 10px;
  }

  .card-fullname,
  .card-jobtitle {
    left: 86px;
    transform: none;
  }

  .card-fullname {
    bottom: 18px;
    font-size: 19px;
  }

  .card-jobtitle {
    bottom: 16px;
    letter-spacing: 1px;
    font-size: 10px;
  }
}

.card-header {
  position: relative;
  display: flex;
  height: 200px;
  flex-shrink: 0;
  width: 100%;
  transition: 0.3s;

  * {
    transition: 0.3s;
  }
}

.card-cover {
  width: 100%;
  height: 100%;
  position: absolute;
  height: 160px;
  top: -20%;
  left: 0;
  will-change: top;
  background-size: cover;
  background-position: center;
  filter: blur(30px);
  transform: scale(1.2);
  transition: 0.5s;
}

.card-avatar {
  width: 100px;
  height: 100px;
  box-shadow: 0 8px 8px rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  object-position: center;
  object-fit: cover;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-64px);
}

.card-fullname {
  position: absolute;
  bottom: 0;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  transform: translateY(-10px) translateX(-50%);
  left: 50%;
}

.card-jobtitle {
  position: absolute;
  bottom: 0;
  font-size: 11px;
  white-space: nowrap;
  font-weight: 500;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-7px);
}

.card-main {
  position: relative;
  flex: 1;
  display: flex;
  padding-top: 10px;
  flex-direction: column;
}

.card-subtitle {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 8px;
}

.card-content {
  padding: 20px;
}

.card-desc {
  line-height: 1.6;
  color: #636b6f;
  font-size: 14px;
  margin: 0;
  font-weight: 400;
  font-family: "DM Sans", sans-serif;
}

.card-social {
  display: flex;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 30px;
  svg {
    fill: rgb(165, 181, 206);
    width: 16px;
    display: block;
    transition: 0.3s;
  }
  a {
    color: #8797a1;
    height: 32px;
    width: 32px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: 0.3s;
    background-color: rgba(93, 133, 193, 0.05);
    border-radius: 50%;
    margin-right: 10px;

    &:hover {
      svg {
        fill: darken(rgb(165, 181, 206), 20%);
      }
    }

    &:last-child {
      margin-right: 0;
    }
  }
}

.card-buttons {
  display: flex;
  background-color: #fff;
  margin-top: auto;
  position: sticky;
  bottom: 0;
  left: 0;

  button {
    flex: 1 1 auto;
    user-select: none;
    background: 0;
    font-size: 13px;
    border: 0;
    padding: 15px 5px;
    cursor: pointer;
    color: #5c5c6d;
    transition: 0.3s;
    font-family: "Jost", sans-serif;
    font-weight: 500;
    outline: 0;
    border-bottom: 3px solid transparent;

    &.is-active,
    &:hover {
      color: #2b2c48;
      border-bottom: 3px solid #2d7e63;
      background: linear-gradient(
        to bottom,
        rgba(127, 199, 231, 0) 100%,
        rgba(207, 204, 255, 0.2) 100%,
        rgba(211, 226, 255, 0.4) 100%
      );
    }
  }
}

.card-section {
  display: none;
  &.is-active {
    display: block;
    animation: fadeIn 0.6s both;
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translatey(40px);
  }
  100% {
    opacity: 1;
  }
}

.card-timeline {
  margin-top: 30px;
  position: relative;
  &:after {
    background: linear-gradient(
      to top,
      rgba(134, 214, 243, 0) 0%,
      rgba(81, 106, 204, 1) 100%
    );
    content: "";
    left: 42px;
    width: 2px;
    top: 0;
    height: 100%;
    position: absolute;
    content: "";
  }
}

.card-item {
  position: relative;
  padding-left: 60px;
  padding-right: 20px;
  padding-bottom: 30px;
  z-index: 1;
  &:last-child {
    padding-bottom: 5px;
  }

  &:after {
    content: attr(data-year);
    width: 10px;
    position: absolute;
    top: 0;
    left: 37px;
    width: 8px;
    height: 8px;
    line-height: 0.6;
    border: 2px solid #fff;
    font-size: 11px;
    text-indent: -35px;
    border-radius: 50%;
    color: rgba(#868686, 0.7);
    background: linear-gradient(
      to bottom,
      lighten(#516acc, 20%) 0%,
      #516acc 100%
    );
  }
}

.card-item-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 5px;
}

.card-item-desc {
  font-size: 13px;
  color: #6f6f7b;
  line-height: 1.5;
  font-family: "DM Sans", sans-serif;
}

.card-contact-wrapper {
  margin-top: 20px;
}

.card-contact {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #6f6f7b;
  font-family: "DM Sans", sans-serif;
  line-height: 1.6;
  cursor: pointer;

  & + & {
    margin-top: 16px;
  }

  svg {
    flex-shrink: 0;
    width: 30px;
    min-height: 34px;
    margin-right: 12px;
    transition: 0.3s;
    padding-right: 12px;
    border-right: 1px solid #dfe2ec;
  }
}

.contact-me {
  border: 0;
  outline: none;
  background: linear-gradient(
    to right,
    var(--el-color-primary-light-7) 0%,
    var(--el-color-primary-dark-2) 96%
  );
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  color: #fff;
  padding: 12px 16px;
  width: 100%;
  border-radius: 5px;
  margin-top: 25px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: "Jost", sans-serif;
  transition: 0.3s;
}

.delete-btn {
  border: 0;
  outline: none;
  background: linear-gradient(
    to right,
    var(--primary-error) 0%,
    var(--global-error-color) 96%
  );
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  color: #fff;
  padding: 12px 16px;
  width: 45%;
  border-radius: 5px;
  margin-top: 25px;
  margin-left: 10%;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: "Jost", sans-serif;
  transition: 0.3s;
}

.edit-btn{
  border: 0;
  outline: none;
  background: linear-gradient(
    to right,
    var(--el-color-primary-light-7) 0%,
    var(--el-color-primary-dark-2) 96%
  );
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  color: #fff;
  padding: 12px 16px;
  width: 45%;
  border-radius: 5px;
  margin-top: 25px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: "Jost", sans-serif;
  transition: 0.3s;
}

</style>