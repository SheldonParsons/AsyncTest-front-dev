<template>
  <el-row>
    <el-col>
      <div class="new-conversation-btn">
        <el-popover
          placement="right"
          width="50"
          trigger="hover"
          content="开启新对话"
          effect="dark"
        >
          <template #reference>
            <div @click="new_conversation" class="g-flex"><Edit></Edit></div>
          </template>
        </el-popover>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 20px" v-if="pinned_list.length > 0">
    <el-col :span="24"
      ><span style="font-size: 12px; font-weight: 600">置顶聊天</span></el-col
    >
  </el-row>
  <el-row
    class="conversation-div"
    v-for="(item, index) in pinned_list"
    :key="index"
  >
    <el-col :span="20" @click="getConversation(item)"
      ><div>{{ item.description }}</div></el-col
    >
    <el-col :span="4" class="hidden-more"
      ><el-dropdown>
        <el-icon class="more-icon"><MoreFilled /></el-icon>
        <template #dropdown>
          <el-dropdown-menu class="more-menu">
            <el-dropdown-item @click="delete_pinned_conversation(item)"
              ><span style="color: brown">删除</span></el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown></el-col>
  </el-row>
  <el-row style="margin-top: 20px">
    <el-col :span="24"
      ><span style="font-size: 12px; font-weight: 600">历史</span></el-col
    >
  </el-row>
  <el-row
    class="conversation-div"
    v-for="(item, index) in history_list"
    :key="index"
  >
    <el-col :span="20" @click="getConversation(item)"
      ><div>{{ item.description }}</div></el-col
    >
    <el-col :span="4" class="hidden-more"
      ><el-dropdown>
        <el-icon class="more-icon"><MoreFilled /></el-icon>
        <template #dropdown>
          <el-dropdown-menu class="more-menu">
            <el-dropdown-item @click="top_conversation(item)"
              ><span>置顶聊天</span></el-dropdown-item
            >
            <el-dropdown-item @click="delete_history_conversation(item)"
              ><span style="color: brown">删除</span></el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown></el-col
    >
  </el-row>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getConversationList, editConversation,deleteConversation,createBlankConversation } from "@/api/ai/conversation";
import { state } from "@/state";
import Edit from "@/assets/svg/common/edit.vue";
import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();
const pinned_list: any = ref([]);
const history_list: any = ref([]);
onMounted(() => {
  getConversationList({}).then((res: any) => {
    for (let i = 0; i < res.results.length; i++) {
      if (res.results[i].is_pinned) {
        pinned_list.value.push(res.results[i]);
      } else {
        history_list.value.push(res.results[i]);
      }
    }
    if (pinned_list.value.length > 0) {
      getConversation(pinned_list.value[0]);
    } else if (history_list.value.length > 0) {
      getConversation(history_list.value[0]);
    }
  });
});

function new_conversation() {
  const data = {
    new_conversation: true,
    project_id: route.params.project
  }
  createBlankConversation(data).then(res => {
    console.log(res);
    history_list.value.unshift(res);
    getConversation(res);
  })
}

async function delete_history_conversation(item: any) {
  await drop_conversation(item.id)
  for (let i = 0; i < history_list.value.length; i++) {
    if (history_list.value[i].id == item.id) {
      history_list.value.splice(i, 1);
      break;
    }
  }
}

async function delete_pinned_conversation(item: any) {
  await drop_conversation(item.id)
  for (let i = 0; i < pinned_list.value.length; i++) {
    if (pinned_list.value[i].id == item.id) {
      pinned_list.value.splice(i, 1);
      break;
    }
  }
}

async function drop_conversation(id:any) {
  await deleteConversation(id, {})
}

function top_conversation(item: any) {
  const data = {
    is_pinned: true,
  };
  editConversation(item.id, data).then((res) => {
    for (let i = 0; i < history_list.value.length; i++) {
      if (history_list.value[i].id == item.id) {
        history_list.value.splice(i, 1);
        pinned_list.value.unshift(item);
        break;
      }
    }
  });
}

function getConversation(item: any, index = null) {
  const data = {
    id: item.id,
    index: index,
  };
  state.setMessage("showConversation" + Math.random().toString(), data);
}
</script>

<style lang="scss" scoped>
.new-conversation-btn {
  height: 30px;
  display: flex;
  justify-content: end;
  div {
    padding: 5px;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    cursor: pointer;
  }
}
.conversation-div {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  margin-top: 10px;
  height: 40px;
  cursor: pointer;
  background-color: #f9f9f9;
  border-radius: 10px;
  padding-left: 10px;
}
.more-icon {
  all: unset;
  svg {
    outline: none;
  }
  svg:focus {
    outline: none !important;
  }
}
</style>
