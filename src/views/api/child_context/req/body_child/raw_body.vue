<template>
  <div class="process-dialog-content">
    <div style="width: 100%; border: 1px solid #f3f5f6; border-radius: 10px">
      <div class="editor-header">
        <Params
          :showVariable="showVariable"
          @insert_action="insert_params"
          :interface="interface"
        ></Params>
        <div class="tools" v-if="showPreView">
          <div @click="open_review_dialog"><PreView />预览</div>
        </div>
      </div>
      <NewJsonEditor ref="ediorText2" v-model="current_code"></NewJsonEditor>
    </div>
  </div>
  <UnEditValue ref="unEditValueDialog"></UnEditValue>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import Params from "@/views/api/child_component/params.vue";
import PreView from "@/assets/svg/common/preview.vue";
import NewJsonEditor from "@/components/common/editor/NewJsonEditor.vue";
import UnEditValue from "@/views/api/child_component/un_edit_value.vue";
import { convertSchemaToObject } from "../object_to_string";
import { ApiGetSummarySource } from "@/api/interface/index";
const route = useRoute();
const controlText = ref(true);
const ediorText2: any = ref(null);
const unEditValueDialog: any = ref(null);
const emit = defineEmits(["update"]);

const props = defineProps({
  code: {
    type: String,
    default: "",
  },
  showPreView: {
    type: Boolean,
    default: true,
  },
  showVariable: {
    type: Boolean,
    default: true,
  },
  interface: {
    type: Number,
    default: -1,
  },
});
function insert_params(text: string) {
  insert_code(text);
}
const current_code = computed({
  get: () => {
    return props.code;
  },
  set: (val: string) => {
    emit("update", val);
  },
});

function open_review_dialog() {
  unEditValueDialog.value.open_dialog();
  const _data = {
    project: route.params.project,
    interface: props.interface,
    check_target: "get_variables",
  };
  ApiGetSummarySource(_data).then((res: any) => {
    unEditValueDialog.value.set_code(convertSchemaToObject(props.code, res));
  });
}

function insert_code(text: string) {
  ediorText2.value?.insertText(text);
}
async function code_change(value: string) {
  emit("update", value);
}
</script>

<style lang="scss" scoped>
.tools {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;

  div {
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 4px 10px;
    gap: 4px;
    border-radius: 5px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    transition: all 0.15s ease;
    font-weight: 500;
    color: #374151;

    &:hover {
      background: #f9fafb;
      border-color: #10b981;
      color: #10b981;
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

.process-dialog-content {
  font-size: 14px;

  > div {
    background: #ffffff;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px !important;
    overflow: hidden;
  }

  .editor-header {
    height: 42px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    padding-left: 12px;
    padding-right: 12px;
    flex-flow: wrap;
    min-width: 0;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: nowrap;
    border-bottom: 1px solid #e5e7eb !important;
    justify-content: space-between;
    background: #ffffff;
  }
}
</style>
