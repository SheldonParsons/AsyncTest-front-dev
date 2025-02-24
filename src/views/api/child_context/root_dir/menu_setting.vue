<template>
  <el-row style="margin-top: 10px">
    <el-col :offset="1" :span="14">
      <div class="function-container">
        <div class="function-content">
          <div class="function-message">功能说明</div>
          <div class="function-desc">
            “根目录”主要用来对项目内的所有接口进行全局设置，如：Auth、前后置操作、唯一标识等。
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 10px">
    <el-col :offset="1" :span="12">
      <div class="function-visible">
        <div class="function-content">
          <div class="function-message">可见性</div>
          <div
            style="
              color: #667085;
              font-weight: 400;
              font-size: 12px;
              margin-bottom: 0;
            "
          >
            “可见性”主要用来设置文档是否可以对外分享或发布，根目录仅可设置为【共享】
          </div>
        </div>
      </div>
    </el-col>
    <el-col :span="2">
      <el-select disabled style="margin-top: 26px" v-model="visibel">
        <template #label="{ label, value }">
          <span
            ><el-icon><Share /></el-icon
          ></span>
          <span style="font-weight: bold; margin-left: 5px">共享</span>
        </template>
        <el-option :key="0" />
      </el-select>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-divider">
        <el-divider />
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-visible">
        <span style="font-size: 16px; font-weight: 500">高级设置</span>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-visible">
        <div style="font-size: 14px; font-weight: 400">服务 (前置URL)</div>
        <div
          style="
            color: #667085;
            font-weight: 400;
            font-size: 12px;
            margin-bottom: 0;
          "
        >
          指定服务后，该目录下的所有接口，运行时都会使用该服务对应的 “前置
          URL”（在环境里设置）。
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-url">
        <div style="font-weight: 500; padding-left: 0.5rem">
          {{ serverDesc }}
        </div>
        <div style="width: 200px">
          <el-select
            v-model="serverValue"
            @change="changeUrl"
            placeholder="服务 (前置URL)"
          >
            <el-option-group
              v-for="group in serverOptions"
              :key="group.label"
              :label="group.label"
            >
              <el-option
                class="doc-base-option-mul"
                v-for="item in group.options"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                <div class="flex items-center">
                  <span>{{ item.label }}</span>
                  <span
                    style="
                      margin-left: 5px;
                      float: right;
                      color: var(--el-text-color-secondary);
                      font-size: 13px;
                    "
                  >
                    {{ item.desc }}
                  </span>
                </div>
              </el-option>
            </el-option-group>
          </el-select>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-divider">
        <el-divider />
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 10px">
    <el-col :offset="1" :span="11">
      <div class="function-visible">
        <div class="function-content">
          <div class="function-message">目录下的接口唯一标识</div>
          <div
            style="
              color: #667085;
              font-weight: 400;
              font-size: 12px;
              margin-bottom: 0;
            "
          >
            导入数据的时候用来匹配对应的接口
          </div>
        </div>
      </div>
    </el-col>
    <el-col :span="3">
      <el-select disabled style="margin-top: 26px" v-model="visibel">
        <template #label="{ label, value }">
          <span style="font-weight: 400; margin-left: 5px">Method & Path</span>
        </template>
        <el-option :key="0" />
      </el-select>
    </el-col>
  </el-row>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
const visibel = ref(0);
const serverValue = ref("Test");
const serverDesc = ref("设置的默认服务");
const serverOptions = [
  {
    label: "默认设置",
    options: [
      {
        value: "default",
        label: "使用默认设置",
        desc: "设置的默认服务",
      },
    ],
  },
  {
    label: "手动指定",
    options: [
      {
        value: "Test",
        label: "Test",
        desc: "http://127.0.0.1:4523/m1/2273535-0-target1",
      },
      {
        value: "UAT",
        label: "UAT",
        desc: "http://127.0.0.1:4523/m1/2273535-0-target2",
      },
    ],
  },
];

onMounted(() => {
  changeUrl(serverValue.value);
});

function changeUrl(value: any) {
  if (value == "default") {
    serverDesc.value = "设置的默认服务";
  } else {
    for (let i = 0; i < serverOptions[1].options.length; i++) {
      if (value === serverOptions[1].options[i].value) {
        serverDesc.value = serverOptions[1].options[i].desc;
        break;
      }
    }
  }
}
</script>

<style scoped lang="scss">
.function-url {
  border: 1px solid #eaecf0;
  border-radius: 14px;
  display: flex;
  color: #344054;
  font-size: 14px;
  font-weight: 400;
  padding: 6px;
  margin-top: 8px;
  justify-content: space-between;
  align-items: center;
  background-color: #f2f4f7;
}
.function-container {
  background-image: url(https://asynctest.oss-cn-shenzhen.aliyuncs.com/static/bg_01.svg);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  border: 1px solid #eaecf0;
  margin-top: 30px;
  padding: 16px 20px 20px;
  border-radius: 8px;
}
.function-visible {
  margin-top: 10px;
  padding: 16px 20px 20px;
}
.function-content {
  flex: 1;
  min-width: 0;
  border: 0 solid;
  color: #344054;
  .function-message {
    color: #344054;
    font-weight: 500;
    font-size: 14px;
  }
  .function-desc {
    font-size: 14px;
    line-height: calc(14px + 8px);
  }
}
</style>
