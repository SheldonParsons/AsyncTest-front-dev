<template>
  <el-row class="top-menu">
    <el-col :span="24">
      <div class="title-main">
        <el-page-header class="back-icon-requirement" @back="onBack" title="需求列表">
          <template #content style="width: 60%">
            <el-row justify="start">
              <el-col :span="10" style="display: flex; justify-content: start">
                <div class="title-div">
                  <span
                    style="font-size: 16px; font-weight: 500; margin-left: 10px"
                  >
                    部门监管规则需求（{{ d.obj.version || "暂无设置" }}）
                  </span>
                </div>
              </el-col>
            </el-row>
          </template>
          <template #extra>
            <div class="flex items-center">
              <el-button
                style="
                  font-size: 14px;
                  background-color: black;
                  border-color: black;
                  border-left-color: white;
                  border-right-color: white;
                  margin-right: 10px;
                  border: 0px;
                "
                type="primary"
                @click="generation_case"
                >生成用例</el-button
              >
              <el-button-group class="ml-4">
                <el-button
                  type="primary"
                  @click="openVersionDrawer"
                  style="
                    font-size: 16px;
                    background-color: black;
                    border-color: black;
                    border-right-color: white;
                  "
                  :icon="Timer"
                />
                <el-button
                  style="
                    font-size: 14px;
                    background-color: black;
                    border-color: black;
                    border-left-color: white;
                    border-right-color: white;
                  "
                  type="primary"
                  @click="published"
                  >发布版本</el-button
                >
                <el-button
                  style="
                    font-size: 14px;
                    background-color: black;
                    border-color: black;
                    border-left-color: white;
                  "
                  type="primary"
                  @click="save"
                  >保存</el-button
                >
              </el-button-group>
            </div>
          </template>
        </el-page-header>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 20px">
    <el-col :span="22" :offset="1">
      <el-descriptions class="margin-top" :column="3" :size="size" border>
        <el-descriptions-item>
          <template #label>
            <div class="cell-item">
              <el-icon :style="iconStyle">
                <user />
              </el-icon>
              需求系统
            </div>
          </template>
          <span
            style="width: 100%; cursor: pointer"
            v-if="req_system_name_show === false"
            @dblclick="req_system_name_show = true"
            >{{ d.obj.system_name || "暂未设置" }}</span
          >
          <input
            v-else
            placeholder="需求系统"
            v-model="d.obj.system_name"
            class="private-input"
            @blur="req_system_name_show = false"
          />
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>
            <div class="cell-item">
              <el-icon :style="iconStyle">
                <iphone />
              </el-icon>
              版本名称
            </div>
          </template>
          <span
            style="width: 100%; cursor: pointer"
            v-if="req_version_show === false"
            @dblclick="req_version_show = true"
            >{{ d.obj.version || "暂未设置" }}</span
          >
          <input
            v-else
            placeholder="版本名称"
            v-model="d.obj.version"
            class="private-input"
            @blur="req_version_show = false"
          />
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>
            <div class="cell-item">
              <el-icon :style="iconStyle">
                <location />
              </el-icon>
              需求人员
            </div>
          </template>
          <span
            style="width: 100%; cursor: pointer"
            v-if="req_requirement_person_show === false"
            @dblclick="req_requirement_person_show = true"
            >{{ d.obj.requirement_person || "暂未设置" }}</span
          >
          <input
            v-else
            placeholder="需求人员名称"
            v-model="d.obj.requirement_person"
            class="private-input"
            @blur="req_requirement_person_show = false"
          />
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>
            <div class="cell-item">
              <el-icon :style="iconStyle">
                <tickets />
              </el-icon>
              更新时间
            </div>
          </template>
          <el-tag color="black" style="color: white; border-color: black">{{
            d.obj.update_time === ""
              ? "暂未更新"
              : new Date(d.obj.update_time).toLocaleString()
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>
            <div class="cell-item">
              <el-icon :style="iconStyle">
                <office-building />
              </el-icon>
              需求简述
            </div>
          </template>
          <span
            style="width: 100%; cursor: pointer"
            v-if="req_deac_show === false"
            @dblclick="req_deac_show = true"
            >{{ d.obj.description || "暂未设置" }}</span
          >
          <input
            v-else
            placeholder="需求简述"
            v-model="d.obj.description"
            class="private-input"
            @blur="req_deac_show = false"
          />
        </el-descriptions-item>
      </el-descriptions>
    </el-col>
  </el-row>
  <el-row style="margin-top: 20px; margin-bottom: 100px; width: 100%">
    <el-col :offset="1" :span="20">
      <el-timeline>
        <el-timeline-item v-for="(item, index) in d.obj.structure" :key="index">
          <div v-if="item.type === 'menu'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-input v-model="item.content"></el-input>
              </el-col>
            </el-row>
          </div>
          <div v-if="item.type === 'menu_auth'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-input
                  autosize
                  type="textarea"
                  v-model="item.content"
                ></el-input>
              </el-col>
            </el-row>
            <div style="font-size: 16px; font-weight: 600; margin-top: 10px">
              特别说明
            </div>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-input
                  autosize
                  type="textarea"
                  v-model="item.special_content"
                ></el-input>
              </el-col>
            </el-row>
          </div>
          <div v-if="item.type === 'data_range'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-input
                  autosize
                  type="textarea"
                  v-model="item.content"
                ></el-input>
              </el-col>
            </el-row>
          </div>
          <div v-if="item.type === 'search'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-button
              style="
                margin-left: 10px;
                font-size: 14px;
                background-color: black;
                border-color: black;
                border-left-color: white;
                border-right-color: white;
                padding: 8px;
                border: 0px;
              "
              type="primary"
              @click="add_search_default_field(item)"
              ><el-icon><Plus /></el-icon
            ></el-button>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-row
                  style="margin-top: 10px"
                  v-for="(rule, rule_index) in item.field"
                  :key="rule_index"
                >
                  <el-col :span="5"
                    ><el-input
                      placeholder="搜索字段名称"
                      v-model="rule.name"
                    ></el-input
                  ></el-col>
                  <el-col :offset="1" :span="5"
                    ><el-select
                      v-model="rule.type"
                      placeholder="Select"
                      style="width: 240px"
                    >
                      <el-option
                        v-for="item in search_field_type"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      /> </el-select
                  ></el-col>
                  <el-col :offset="1" :span="5" v-if="rule.type === 'text'"
                    ><el-input
                      placeholder="长度控制"
                      v-model="rule.length"
                    ></el-input
                  ></el-col>
                  <el-col :offset="1" :span="5" v-if="rule.type === 'enum'"
                    ><el-select
                      v-model="rule.enum"
                      multiple
                      filterable
                      allow-create
                      default-first-option
                      :reserve-keyword="false"
                      placeholder="添加枚举内容"
                    ></el-select
                  ></el-col>
                  <el-col :offset="1" :span="5"
                    ><el-input
                      placeholder="字段描述"
                      v-model="rule.content"
                    ></el-input
                  ></el-col>
                  <el-col :span="1">
                    <el-button
                      style="
                        margin-left: 10px;
                        font-size: 14px;
                        background-color: black;
                        border-color: black;
                        border-left-color: white;
                        border-right-color: white;
                        padding: 8px;
                        border: 0px;
                      "
                      type="primary"
                      @click="delete_search_field(item, rule_index)"
                      ><el-icon><Minus /></el-icon
                    ></el-button>
                  </el-col>
                </el-row>
                <div style="margin-top: 10px">
                  <span style="font-size: 16px; font-weight: 600">
                    交互按钮
                  </span>
                  <el-button
                    style="
                      margin-left: 10px;
                      font-size: 14px;
                      background-color: black;
                      border-color: black;
                      border-left-color: white;
                      border-right-color: white;
                      padding: 8px;
                      border: 0px;
                    "
                    type="primary"
                    @click="add_search_default_btn(item)"
                    ><el-icon><Plus /></el-icon
                  ></el-button>
                </div>
                <el-row
                  style="margin-top: 10px"
                  v-for="(search_btn, search_btn_index) in item.btn"
                  :key="search_btn_index"
                >
                  <el-col :span="5"
                    ><el-input
                      placeholder="按钮名称"
                      v-model="search_btn.name"
                    ></el-input
                  ></el-col>
                  <el-col :offset="1" :span="12"
                    ><el-input
                      autosize
                      placeholder="按钮功能描述"
                      type="textarea"
                      v-model="search_btn.content"
                    ></el-input
                  ></el-col>
                  <el-col :span="1">
                    <el-button
                      style="
                        margin-left: 10px;
                        font-size: 14px;
                        background-color: black;
                        border-color: black;
                        border-left-color: white;
                        border-right-color: white;
                        padding: 8px;
                        border: 0px;
                      "
                      type="primary"
                      @click="delete_search_btn_field(item, search_btn_index)"
                      ><el-icon><Minus /></el-icon
                    ></el-button>
                  </el-col>
                </el-row>
              </el-col>
            </el-row>
          </div>
          <div v-if="item.type === 'list'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-button
              style="
                margin-left: 10px;
                font-size: 14px;
                background-color: black;
                border-color: black;
                border-left-color: white;
                border-right-color: white;
                padding: 8px;
                border: 0px;
              "
              type="primary"
              @click="add_list_default(item)"
              ><el-icon><Plus /></el-icon
            ></el-button>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-row
                  style="margin-top: 10px"
                  v-for="(list_item, list_item_index) in item.field"
                  :key="list_item_index"
                >
                  <el-col :span="5"
                    ><el-input
                      v-model="list_item.name"
                      placeholder="字段名称"
                    ></el-input>
                  </el-col>
                  <el-col :offset="1" :span="5"
                    ><el-select v-model="list_item.type" placeholder="Select">
                      <el-option
                        v-for="item in search_field_type"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      /> </el-select
                  ></el-col>
                  <el-col :offset="1" :span="5" v-if="list_item.type === 'enum'"
                    ><el-select
                      v-model="list_item.enum"
                      multiple
                      filterable
                      allow-create
                      default-first-option
                      :reserve-keyword="false"
                      placeholder="添加枚举内容"
                    ></el-select
                  ></el-col>
                  <el-col :offset="1" :span="list_item.type === 'enum' ? 5 : 11"
                    ><el-input
                      autosize
                      type="textarea"
                      v-model="list_item.content"
                    ></el-input
                  ></el-col>
                  <el-col :span="1">
                    <el-button
                      style="
                        margin-left: 10px;
                        font-size: 14px;
                        background-color: black;
                        border-color: black;
                        border-left-color: white;
                        border-right-color: white;
                        padding: 8px;
                        border: 0px;
                      "
                      type="primary"
                      @click="delete_list_field(item, list_item_index)"
                      ><el-icon><Minus /></el-icon
                    ></el-button>
                  </el-col>
                </el-row>
                <div style="margin-top: 10px">
                  <span style="font-size: 16px; font-weight: 600">
                    交互按钮
                  </span>
                  <el-button
                    style="
                      margin-left: 10px;
                      font-size: 14px;
                      background-color: black;
                      border-color: black;
                      border-left-color: white;
                      border-right-color: white;
                      padding: 8px;
                      border: 0px;
                    "
                    type="primary"
                    @click="add_list_default_btn(item)"
                    ><el-icon><Plus /></el-icon
                  ></el-button>
                </div>
                <el-row
                  style="margin-top: 10px"
                  v-for="(field_btn_item, field_btn_index) in item.btn"
                  :key="field_btn_index"
                >
                  <el-col :span="5"
                    ><el-input
                      v-model="field_btn_item.name"
                      placeholder="按钮名称"
                    ></el-input
                  ></el-col>
                  <el-col :offset="1" :span="12"
                    ><el-input
                      autosize
                      type="textarea"
                      placeholder="按钮功能描述"
                      v-model="field_btn_item.content"
                    ></el-input
                  ></el-col>
                  <el-button
                    style="
                      margin-left: 10px;
                      font-size: 14px;
                      background-color: black;
                      border-color: black;
                      border-left-color: white;
                      border-right-color: white;
                      padding: 8px;
                      border: 0px;
                    "
                    type="primary"
                    @click="delete_list_btn_field(item, field_btn_index)"
                    ><el-icon><Minus /></el-icon
                  ></el-button>
                </el-row>
              </el-col>
            </el-row>
          </div>
          <div v-if="item.type === 'page'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-input
                  autosize
                  type="textarea"
                  v-model="item.content"
                ></el-input>
              </el-col>
            </el-row>
          </div>
          <div v-if="item.type === 'list_btn'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-button
              style="
                margin-left: 10px;
                font-size: 14px;
                background-color: black;
                border-color: black;
                border-left-color: white;
                border-right-color: white;
                padding: 8px;
                border: 0px;
              "
              type="primary"
              @click="add_list_btn_field(item)"
              ><el-icon><Plus /></el-icon
            ></el-button>
            <el-row
              style="margin-top: 10px"
              v-for="(list_btn_item, list_btn_item_index) in item.field"
              :key="list_btn_item_index"
            >
              <el-col>
                <el-row style="margin-top: 10px">
                  <el-col :span="5"
                    ><el-input v-model="list_btn_item.name"></el-input
                  ></el-col>
                  <el-col :offset="1" :span="12"
                    ><el-input
                      autosize
                      type="textarea"
                      v-model="list_btn_item.content"
                    ></el-input
                  ></el-col>
                  <el-col :span="1">
                    <el-button
                      style="
                        margin-left: 10px;
                        font-size: 14px;
                        background-color: black;
                        border-color: black;
                        border-left-color: white;
                        border-right-color: white;
                        padding: 8px;
                        border: 0px;
                      "
                      type="primary"
                      @click="
                        delete_list_btn_page_field(item, list_btn_item_index)
                      "
                      ><el-icon><Minus /></el-icon
                    ></el-button>
                  </el-col>
                </el-row>
              </el-col>
            </el-row>
          </div>
          <div v-if="item.type === 'special_content'">
            <span style="font-size: 16px; font-weight: 600">{{
              page_mapping[item.type]
            }}</span>
            <el-row style="margin-top: 10px">
              <el-col>
                <el-input
                  autosize
                  type="textarea"
                  v-model="item.content"
                ></el-input>
              </el-col>
            </el-row>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-col>
  </el-row>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="showGenerationDialog"
    width="800"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>构建测试用例过程</span>
      </div>
    </template>
    <div
      v-for="(value, key) in generation_process.value"
      :key="key"
      style="width: 100%; padding: 10px"
    >
      <el-row
        style="
          width: inherit;
          display: flex;
          justify-content: start;
          align-items: center;
          height: 50px;
          overflow: hidden;
        "
      >
        <el-col :offset="1" :span="4"
          ><span style="font-size: 16px; font-weight: 600">{{
            page_mapping[key]
          }}</span></el-col
        >
        <el-col
          :span="14"
          style="
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
            justify-content: start;
          "
          ><span
            :class="{ 'blinking-text': value.blink }"
            style="
              white-space: nowrap;
              font-size: 15px;
              font-weight: 600;
              color: black;
            "
            >{{ value.content }}</span
          ></el-col
        >
        <el-col :offset="1" :span="4"><Right v-if="value.pedding === false"></Right><Loading v-if="value.pedding"></Loading></el-col>
      </el-row>
    </div>
    <template #footer>
      <el-divider style="margin: 0px"></el-divider>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="showGenerationDialog = false">取消</el-button>
        <el-button type="primary" @click="download_case_file">下载用例</el-button>
      </div>
    </template>
  </el-dialog>
  <el-drawer
    v-model="showVersionPlatform"
    title="版本信息"
    :direction="direction"
  >
  <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
    <el-tab-pane label="生成用例历史" name="first">
      <el-row style="width: 100%">
      <el-col :span="24">
        <div
          style="
            width: 100%;
            border: 1px solid #dcdfe6;
            border-radius: 5px;
            padding: 5px;
            background-color: #f5f5f5;
          "
        >
          <span style="font-size: 14px; font-weight: 500"
            >当前tab展示了您当前版本下生成的所有用例列表</span
          >
        </div>
      </el-col>
    </el-row>
    <el-row class="no-scoll">
      <el-timeline style="margin-top: 20px; padding-left: 0px; width: 100%">
        <el-timeline-item
          v-for="(item, index) in history"
          :key="index"
        >
          <el-row
            style="display: flex; justify-content: start; align-items: center"
          >
            <el-col :span="18">
              <el-row>
                <el-col :span="5"
                  ><span
                    style="
                      font-size: 16px;
                      font-weight: 600;
                      display: flex;
                      align-items: center;
                    "
                    >用例</span
                  ></el-col
                >
                <el-col :span="5" style="display: flex; align-items: center"
                  ><div
                    style="
                      border: 1px solid #f5f5f5;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                      background-color: #f5f5f5;
                      border-radius: 5px;
                    "
                  >
                    #{{ item.id }}
                  </div></el-col
                >
                <el-col v-if="item.status !== 'generated'" :span="5" :offset="1" style="display: flex; align-items: center"
                  ><div
                    style="
                      border: 1px solid #f5f5f5;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                      background-color: #ff9966;
                      border-radius: 5px;
                      color: white;
                    "
                  >
                    {{ generation_statue[item.status] }}
                  </div></el-col
                > 
                <el-col v-if="item.status === 'generated'" :span="5" :offset="1" style="display: flex; align-items: center"
                  ><div
                    style="
                      border: 1px solid #f5f5f5;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                      background-color: #99cc33;
                      border-radius: 5px;
                      color: white;
                    "
                  >
                    {{ generation_statue[item.status] }}
                  </div></el-col
                > 
              </el-row>
              <el-row>
                <el-col :span="24">
                  <span style="font-size: 14px">生成时间：</span
                  >{{ new Date(item.add_time).toLocaleString() }}
                </el-col>
              </el-row>
            </el-col>
            <el-col :span="6"
              ><el-button type="primary" @click="download_case(item)">
                下载用例
              </el-button></el-col
            >
          </el-row>
        </el-timeline-item>
      </el-timeline>
    </el-row>
    </el-tab-pane>
    <el-tab-pane label="版本列表" name="second">
      <el-row style="width: 100%">
      <el-col :span="24">
        <div
          style="
            width: 100%;
            border: 1px solid #dcdfe6;
            border-radius: 5px;
            padding: 5px;
            background-color: #f5f5f5;
          "
        >
          <span style="font-size: 14px; font-weight: 500"
            >当前tab展示了您发布的所有版本</span
          >
        </div>
      </el-col>
    </el-row>
    <el-row class="no-scoll">
      <el-timeline style="margin-top: 20px; padding-left: 0px; width: 100%">
        <el-timeline-item
          v-for="(item, index) in versions"
          :key="index"
        >
          <el-row
            style="display: flex; justify-content: start; align-items: center"
          >
            <el-col :span="18">
              <el-row>
                <el-col :span="5"
                  ><span
                    style="
                      font-size: 16px;
                      font-weight: 600;
                      display: flex;
                      align-items: center;
                    "
                    >版本</span
                  ></el-col
                >
                <el-col :span="8" style="display: flex; align-items: center"
                  ><div
                    style="
                      border: 1px solid #f5f5f5;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                      background-color: #f5f5f5;
                      border-radius: 5px;
                      padding: 2px;
                    "
                  >
                    #{{ item.version }}
                  </div></el-col
                >
                <el-col v-if="item.current_version === true"  :span="6" :offset="1" style="display: flex; align-items: center"
                  ><div
                    style="
                      border: 1px solid #f5f5f5;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                      background-color: #99cc33;
                      border-radius: 5px;
                      color: white;
                    "
                  >
                    当前版本
                  </div></el-col
                > 
              </el-row>
              <el-row>
                <el-col :span="24">
                  <span style="font-size: 14px">生成时间：</span
                  >{{ new Date(item.add_time).toLocaleString() }}
                </el-col>
              </el-row>
            </el-col>
            <el-col :span="6"
              ><el-button type="primary" @click="switch_version(item)">
                切换版本
              </el-button></el-col
            >
          </el-row>
        </el-timeline-item>
      </el-timeline>
    </el-row>
    </el-tab-pane>
  </el-tabs>
  </el-drawer>
</template>
<script setup lang="ts">
import {
  computed,
  ref,
  onMounted,
  reactive,
  onBeforeUnmount,
  getCurrentInstance,
} from "vue";
import { Timer } from "@element-plus/icons-vue";
import { useRouter, useRoute } from "vue-router";
import type { ComponentSize } from "element-plus";
import { streamApi } from "@/api/sse/index";
import Loading from "@/components/layout/menus/child/icon/loading.vue";
import Right from "@/assets/svg/common/right.vue"
import type { DrawerProps } from 'element-plus'
import {
  getRequirementCase,
  createRequirementCase,
  updateRequirementCase,
  getRequirementCaseHistory
} from "@/api/ai/requirement";
import tools from "@/utils/tools";
const direction = ref<DrawerProps['direction']>('rtl')
const downloadCaseFile = ref(false)
const { proxy }: any = getCurrentInstance();
const router = useRouter();
const route = useRoute();
const size = ref<ComponentSize>("default");
const current_case = ref(-1);
// 数据主体！！！
const d = reactive({
  obj: {} as any,
});
const generation_process = reactive({
  value: {} as any,
});
const activeName = ref('first')

const handleClick = (tab:any, event: Event) => {
  console.log(tab, event)
}
const history = ref([])
const versions = ref([])
const showVersionPlatform = ref(false)
const showGenerationDialog = ref(false);
const req_system_name_show = ref(false);
const req_version_show = ref(false);
const req_requirement_person_show = ref(false);
const req_deac_show = ref(false);
const page_mapping: any = {
  menu: "菜单路径",
  menu_auth: "菜单权限",
  data_range: "数据范围",
  search: "查询功能",
  list: "列表字段",
  page: "分页功能",
  list_btn: "列表交互按钮",
  special_content: "特别交代",
};
const search_field_type: any = [
  {
    value: "text",
    label: "文本",
  },
  {
    value: "enum",
    label: "枚举",
  },
];
const options: any = [
  {
    value: "use",
    label: "启用",
  },
  {
    value: "unuse",
    label: "禁用",
  },
];
const generation_statue = {
  "generated": "已生成",
  "generating": "生成中",
  "un_generation": "未生成",
}
onMounted(() => {
  // 添加全局事件监听
  window.addEventListener("keydown", addAltS);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", addAltS);
});

function switch_version(item:any) {
  current_case.value = item.id
  const data = {
    current_version: true
  }
  updateRequirementCase(current_case.value, data).then((res: any) => {
      tools.message("已保存", proxy);
      d.obj.update_time = res.update_time;
      showVersionPlatform.value = false;
      getData()
    });
}

function openVersionDrawer() {
  const data = {
    case_generation: current_case.value
  }
  getRequirementCaseHistory(data).then((res:any) => {
    console.log(res);
    history.value = res.results
  })
  const version_data = {
    group: Number(route.params.group)
  };
  getRequirementCase(data).then((res:any) => {
    versions.value = res.results
  })
  showVersionPlatform.value = true
}

function download_case_file() {
  if (downloadCaseFile.value === false) {
    tools.message("别急，等用例构建完成再下载吧！", proxy);
  } else {
    // 使用a标签下载文件
    const link = document.createElement("a");
    link.href = `https://asynctest.oss-cn-shenzhen.aliyuncs.com/${downloadCaseFile.value}`;
    link.download = `case_${current_case.value}.json`;
    link.click();
  }
}
function download_case(item: any) {
  if (item.status !== "generated") {
    tools.message("别急，等用例构建完成再下载吧！", proxy);
  } else {
    // 使用a标签下载文件
    const link = document.createElement("a");
    link.href = `https://asynctest.oss-cn-shenzhen.aliyuncs.com/${item.path}`;
    link.download = `case_${current_case.value}.json`;
    link.click();
  }
}
function addAltS(event: any) {
  if (
    (event.metaKey || event.ctrlKey) &&
    (event.key === "s" || event.code === "KeyS")
  ) {
    event.preventDefault(); // 阻止浏览器默认行为
    save();
    // 在这里执行你想要的逻辑
  }
}
function generation_case() {
  downloadCaseFile.value = false
  streamApi(
    "/llm/requirement/group/conversation/generation/",
    {
      case_id: current_case.value,
    },
    (event_response) => {
      const event = event_response?.event;
      const data = event_response?.data;
      console.log(event);
      console.log(data);
      if (event === "error") {
        tools.message(data.error, proxy);
      }
      console.log(event === "start");
      try {
        if (event === "agent_thought") {
          generation_process.value[data.answer]["content"] =
            "智能体Thoughting...";
          generation_process.value[data.answer].blink = true;
          setTimeout(() => {
            generation_process.value[data.answer].blink = false;
          }, 1000);
        }
        if (event === "qestion_and_step") {
          generation_process.value[data.answer]["content"] =
            "用例步骤构建 (" + data.tool_input.question + ")";
          generation_process.value[data.answer].blink = true;
          setTimeout(() => {
            generation_process.value[data.answer].blink = false;
          }, 500);
        }
        if (event === "dataset_retrieval") {
          generation_process.value[data.answer]["content"] = "知识库检索中...";
          generation_process.value[data.answer].blink = true;
          setTimeout(() => {
            generation_process.value[data.answer].blink = false;
          }, 1000);
        }
        if (event === "agent_response") {
          generation_process.value[data.thought]["content"] =
            "智能体阶段响应（" + data.answer + "）";
          generation_process.value[data.thought].blink = true;
          setTimeout(() => {
            generation_process.value[data.thought].blink = false;
          }, 1000);
        }
        if (event === "agent_reply") {
          generation_process.value[data.answer]["content"] =
            "当前模块用例构建完成。";
          generation_process.value[data.answer].blink = true;
          setTimeout(() => {
            generation_process.value[data.answer].blink = false;
          }, 1000);
          generation_process.value[data.answer].pedding = false
        }
        if (event === "agent_end") {
          downloadCaseFile.value = data.answer
        }
      } catch (error) {
        console.log(error);
      }
      if (event === "start") {
        for (
          let i = 0;
          i < JSON.parse(JSON.parse(data.answer).structure).length;
          i++
        ) {
          if (
            JSON.parse(JSON.parse(data.answer).structure)[i].type === "search"
          ) {
            generation_process.value[
              JSON.parse(JSON.parse(data.answer).structure)[i].type
            ] = {
              content: "搜索功能构建中",
              blink: false,
              pedding: true
            };
          } else if (
            JSON.parse(JSON.parse(data.answer).structure)[i].type === "list"
          ) {
            generation_process.value[
              JSON.parse(JSON.parse(data.answer).structure)[i].type
            ] = {
              content: "列表内容构建中",
              blink: false,
              pedding: true,
            };
          } else if (
            JSON.parse(JSON.parse(data.answer).structure)[i].type === "list_btn"
          ) {
            generation_process.value[
              JSON.parse(JSON.parse(data.answer).structure)[i].type
            ] = {
              content: "页面按钮构建中",
              blink: false,
              pedding: true,
            };
          } else {
            generation_process.value[
              JSON.parse(JSON.parse(data.answer).structure)[i].type
            ] = {
              content: JSON.parse(JSON.parse(data.answer).structure)[i].content,
              blink: false,
              pedding: true,
            };
          }
        }
        console.log(generation_process.value);
        showGenerationDialog.value = true;
      }
    }
  );
}
function published() {
  const copy = JSON.parse(JSON.stringify(d.obj));
  copy.structure = JSON.stringify(d.obj.structure);
  copy["current_version"] = true;
  delete copy["update_time"];
  delete copy["create_by"];
  copy["group"] = Number(route.params.group);
  createRequirementCase(copy).then((res) => {
    tools.message("已发布", proxy);
  });
}
function save() {
  if (current_case.value === -1) {
    tools.message("当前不存在任何已发布需求，请先【发布版本】", proxy);
  } else {
    const copy = JSON.parse(JSON.stringify(d.obj));
    copy.structure = JSON.stringify(d.obj.structure);
    copy["current_version"] = true;
    delete copy["update_time"];
    delete copy["create_by"];
    updateRequirementCase(current_case.value, copy).then((res: any) => {
      tools.message("已保存", proxy);
      d.obj.update_time = res.update_time;
    });
  }
  console.log(d.obj);
}
function delete_list_btn_page_field(item: any, index: number) {
  item.field.splice(index, 1);
}
function delete_search_field(item: any, index: number) {
  item.field.splice(index, 1);
}
function delete_search_btn_field(item: any, index: number) {
  item.btn.splice(index, 1);
}
function delete_list_field(item: any, index: number) {
  item.field.splice(index, 1);
}
function delete_list_btn_field(item: any, index: number) {
  item.btn.splice(index, 1);
}
function add_list_default(item: any) {
  item.field.push({
    name: "",
    type: "text",
    enum: [],
    content: "",
  });
}
function add_list_default_btn(item: any) {
  item.btn.push({
    name: "",
    content: "",
  });
}
function add_search_default_field(item: any) {
  item.field.push({
    name: "",
    type: "text",
    enum: [],
    length: "",
    content: "",
  });
}

function add_list_btn_field(item: any) {
  item.field.push({
    name: "",
    content: "",
  });
}

function add_search_default_btn(item: any) {
  item.btn.push({
    name: "",
    content: "",
  });
}

function getData() {
  const data = {
    group: Number(route.params.group),
    current_version: true,
  };
  getRequirementCase(data).then((res: any) => {
    if (res.results.length === 0) {
      current_case.value = -1;
      d.obj = {
        version: "",
        system_name: "",
        requirement_person: "",
        update_time: "",
        structure: [
          {
            type: "menu",
            content: "",
          },
          {
            type: "menu_auth",
            content: "",
            special_content: "",
          },
          {
            type: "data_range",
            content: "",
          },
          {
            type: "search",
            field: [
              {
                name: "",
                type: "text",
                enum: [],
                length: "",
                content: "",
              },
            ],
            btn: [
              {
                name: "",
                content: "",
              },
            ],
          },
          {
            type: "list",
            field: [
              {
                name: "",
                type: "text",
                enum: [],
                content: "",
              },
            ],
            btn: [
              {
                name: "",
                content: "",
              },
            ],
          },
          {
            type: "page",
            content: "",
          },
          {
            type: "list_btn",
            field: [
              {
                name: "",
                content: "",
              },
            ],
          },
          {
            type: "special_content",
            content: "",
          },
        ],
      };
    } else {
      current_case.value = res.results[0].id;
      d.obj = res.results[0];
      d.obj.structure = JSON.parse(res.results[0].structure);
    }
  });
}
onMounted(() => {
  getData()
});
const enum_options = ref(["use", "unuse"]);
function onBack() {
  const params = {
    project: Number(route.params.project),
  };
  router.push({ name: "ai_requirement_group", params });
}
const iconStyle = computed(() => {
  const marginMap: any = {
    large: "8px",
    default: "6px",
    small: "4px",
  };
  return {
    marginRight: marginMap[size.value] || marginMap.default,
  };
});
</script>
<style lang="scss" scoped>
.private-input {
  margin: 0;
  padding: 0;
  border: none;
  border-bottom: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 14px;
  width: 100%;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.private-input:hover {
  color: black;
  border-bottom: 1px solid black !important;
}
.model-setting {
  min-width: 500px;
}
.top-content {
  height: calc(-295px + 100vh);
}
.talking {
  // height: 100%;
  .sending {
    //   height: 20%;
    display: flex;
    justify-content: center;
    align-items: baseline;
  }
}
.content-div {
  overflow-y: scroll;
}
.content-div::-webkit-scrollbar {
  display: none; /* 隐藏滚动条 */
}
.ai-content-span {
  // margin-left: 20px;
  max-width: 90%;
  display: flex;
  align-items: center;
  justify-content: start;
}
.gpt-logo {
  color: #0d0d0d;
  padding: 0.25rem;
  background-color: #fff;
  border-radius: 0.125rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: 1px solid #e3e3e3;
  box-sizing: border-box;
  margin-left: 20px;
}
.content-row {
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 20px;
}
.user-content {
  display: flex;
  justify-content: end;
  align-items: center;
  div {
    padding-bottom: 0.625rem;
    padding-top: 0.625rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    --tw-bg-opacity: 1;
    background-color: rgb(244 244 244 / var(--tw-bg-opacity));
    border-radius: 1.5rem;
    max-width: 70%;
  }
}
.has-content {
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity));
  --tw-bg-opacity: 1;
  background-color: rgb(0 0 0 / var(--tw-bg-opacity));
}
.not-has-content {
  --tw-text-opacity: 1;
  color: rgb(244 244 244 / var(--tw-text-opacity));
  --tw-bg-opacity: 1;
  background-color: rgb(215 215 215 / var(--tw-bg-opacity));
}
.send-main-btn {
  border-radius: 9999px;
  width: 2rem;
  height: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}
.input-input {
  background: none; /* 移除背景 */
  border: none; /* 移除边框 */
  outline: none; /* 移除焦点时的轮廓线 */
  box-shadow: none; /* 移除阴影 */
  appearance: none; /* 移除特定于浏览器的默认样式 */
  -moz-appearance: none; /* Firefox的特定样式清除 */
  -webkit-appearance: none; /* Chrome和Safari的特定样式清除 */
  width: 80%;
  background-color: transparent;
  height: 40px;
  font-size: 1rem;
}
.input-main {
  height: 52px;
  width: 100%;
  background-color: #f4f4f4;
  border-radius: 26px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cursor-core {
  cursor: pointer;
}
.flex-core {
  display: flex;
  justify-content: center;
  align-items: center;
}
.top-menu {
  height: 70px;
  display: flex;
  justify-content: center;
  align-items: center;
  align-content: center;
  border-bottom: 1px solid #e0e0e0;
}
.title-main {
  // height: 100%;
  //   margin-left: 20px;
  .el-page-header__left {
    width: 100% !important;
  }
}
.title-div {
  display: flex;
  justify-content: center;
  align-items: center;
}
.main-menu {
  margin: 5px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}
.choice {
  color: var(--el-color-primary);
}

.model-select {
  height: 40px;
}
.cursor {
  align-items: center;
  display: inline-block;
  width: 14px;
  height: 14px;
  background-color: #444444;
  border-radius: 9999px;
  animation: blink 1s step-end infinite;
  vertical-align: middle;
}
.my-header {
  padding: 20px;
  padding-bottom: 0px;
  span {
    font-size: 16px;
    font-weight: 600;
  }
}
@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.blinking-text {
  animation: blink 0.5s infinite;
}
</style>
<style lang="scss">
.el-dialog__header {
  padding-bottom: 0px;
}
.code-header {
  display: flex;
  justify-content: start;
  align-items: center;
  .copy-btn {
    height: 20px;
  }
}
.title-main {
  .el-page-header__left {
    width: 100% !important;
    .el-page-header__content {
      width: 80%;
    }
  }
  .el-collapse-item__wrap,
  .el-collapse-item__header {
    background-color: #f9fafb;
  }
}
.el-dropdown-link:hover {
  border: none !important; /* 使用 !important 确保覆盖组件的默认样式 */
  outline: none !important;
}
.el-dropdown-link:focus-visible {
  outline: none !important;
}
.el-popper {
  width: auto !important;
}
.model-select {
  .el-select__wrapper {
    height: inherit;
  }
}
.back-icon-requirement {
  .el-page-header__back {
    margin-left: 10px;
  }
  .el-page-header__extra {
    width: 30%;
  }
}
.hljs {
  max-width: 100%;
}
</style>

<style lang="scss">
.core-content {
  margin-left: 10px;
  margin-top: 7px;
  max-width: 100%;
  p {
    margin: 0px !important;
  }
  pre {
    max-width: 95%;
  }
}
</style>
