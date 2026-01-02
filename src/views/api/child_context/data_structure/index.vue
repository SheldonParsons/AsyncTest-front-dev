<template>
    <div class="ds-container">
        <SplitterGroup direction="vertical">
            <SplitterPanel 
                :default-size="10" 
                :min-size="5"
                style="display:flex; flex-direction:column; height:100%;overflow: scroll;"
                class="caseContentRef no-scroll">
                <div class="header">
                   <div class="info">
                        <InputAnimation style="flex: 9;margin-top: 1px;" v-model="name" :placeholder="'名称'"
                            :maxLength="50">
                        </InputAnimation>
                        <MotionButton @click="save" style="flex: 1;">
                            <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
                                <div style="font-size: 14px;">保存</div>
                                <div
                                    style="font-size: 0.7rem;background-color: black;color: white;padding: 1px 2px;border-radius: 4px;">
                                    {{ get_system_save() }}</div>
                            </div>
                        </MotionButton>
                    </div>
                </div>
            </SplitterPanel>

            <SplitterPanel class="animated-panel" style="
            display:flex; flex-direction:column; height:100%; overflow-y: auto;
          " :default-size="10" :min-size="10" :max-size="10">
                <div class="desc no-scroll" style="white-space: pre-line">
                    {{ dsData[0]?.statement.length === 0 ? "暂无描述" : dsData[0]?.statement }} </div>
            </SplitterPanel>

            <SplitterPanel class="animated-panel no-scroll" style="
            display:flex; flex-direction:column; height:100%; overflow-y: auto;
          " :default-size="75" :min-size="20"> 
                <ObjectTable :tableData="dsData" :canRootDs="false" :excluded_ids="[page_target.target_id]"
                    :inOuter="inOuter">
                </ObjectTable>
            </SplitterPanel>

            <SplitterPanel class="animated-panel" style="
            display:flex; flex-direction:column; height:100%; overflow-y: auto;
          " :default-size="5" :min-size="5" :max-size="5"></SplitterPanel>
        </SplitterGroup>
    </div>
</template>


<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import { useRoute } from "vue-router";
import InputAnimation from '@/components/common/general/input.vue'
import MotionButton from '@/assets/motion/button.vue'
import ObjectTable from '@/views/api/child_context/req/body_child/json_body.vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { ApiDsMixin, ApiGetDsingle, ApiGetDsingleList } from '@/api/ds/index'

const props: any = defineProps({
    page_target: {
        default: null
    }
})

const route = useRoute();

const dsData = ref([])

const name = ref("")

const inOuter = ref(false)

onMounted(() => {
    name.value = props.page_target.title
    window.addEventListener("keydown", addAltS);
    get_data()
})


function get_data() {
    if (typeof props.page_target.target_id === 'string') {
        inOuter.value = true
        const _data = {
            ds_key: props.page_target.target_id,
            project: route.params.project
        }
        ApiGetDsingleList(_data).then((res: any) => {
            dsData.value = res.data
            name.value = res.name
        })
    } else {
        ApiGetDsingle(props.page_target.target_id, {}).then((res: any) => {
            dsData.value = res.data
            name.value = res.name
        })
    }
}

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltS);
});

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

async function save() {
    console.log(props.page_target);

    console.log(dsData.value);
    const _data = {
        type: 0,
        child_action_type: "update_ds",
        content: {
            id: props.page_target.target_id,
            data: dsData.value,
            name: name.value
        }
    }
    ApiDsMixin(_data).then(res => {
        window.$toast({ title: '更新成功', type: "success" })
    })

}

function get_system_save() {
    if (isMacOS()) {
        return '⌘+S'
    }
    return 'Ctrl+S'
}

function isMacOS(): boolean {
    const nav = navigator as Navigator & {
        userAgentData?: { platform?: string }
    }

    if (nav.userAgentData?.platform) {
        return nav.userAgentData.platform === 'macOS'
    }

    return /Macintosh|Mac OS X/i.test(navigator.userAgent)
}

</script>

<style lang="scss" scoped>
.ds-container {
    width: 100%;
    height: 100%;
    display: flex;
    padding: 20px;
    box-sizing: border-box;

    .header {
        width: 100%;
        height: 40px;
        box-sizing: border-box;

        .info {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            height: 100%;
        }
    }
    .desc {
        border-left: 3px solid #f0f0f0;
        padding-left: 10px;
        font-size: 1rem;
        font-weight: 500;
        height: 90%;
    }
}
</style>