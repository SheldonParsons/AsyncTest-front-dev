<template>
    <div class="importer-container" v-if="previewPage === null">
        <div class="outer-select">
            <div v-for="(item, index) in outerPlatfrom" :key="item.key" class="item"
                @click="choiceImporterAction(item)">
                <img class='img' :src="item.img" alt="">
                <div class="name">{{ item.name }}</div>
            </div>
        </div>
        <div class="import-container" v-if="choiceImporter === 'postman' && !loading">
            <el-upload class="upload-demo" drag :http-request="fileHandleChange" :show-file-list="false">
                <ImportIcon style="width: 3rem;height: 3rem;"></ImportIcon>
                <div class="el-upload__text">
                    拖拽文件至此 或者 <em>点击 以导入</em>
                </div>
                <template #tip>
                    <div class="el-upload__tip">
                        最多可上传{{ FILE_MAX_COUNT }}个文件
                    </div>
                </template>
            </el-upload>
        </div>
        <div class="import-container" v-if="!choiceImporter && !loading">
            <Empty></Empty>
        </div>
        <div class="import-container" v-if="loading">
            <div style="height: 180px;display: flex;justify-content: center;align-items: center;">
                <LoadingMini :height="'50px'" :width="'50px'"></LoadingMini>
            </div>
        </div>
    </div>
    <div class="preview" v-if="previewPage === 'postman'">
        <InterfacePreview :data="previewData"></InterfacePreview>
    </div>
    <div class="preview" v-if="previewPage === 'idea'">
        <IdeaPreview @close="close"></IdeaPreview>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { outerPlatfrom } from '@/components/layout/menus/comps/importer/constants'
import Empty from "@/views/api/child_component/params_child/comp/empty.vue";
import ImportIcon from '@/assets/svg/common/import_icon.vue'
import LoadingMini from '@/assets/motion/loading_mini.vue'
import { PostmanParser } from '@/components/layout/menus/comps/importer/resolve_postman'
import InterfacePreview from '@/components/layout/menus/comps/importer/interface_preview.vue'
import IdeaPreview from '@/components/layout/menus/comps/importer/idea_preview.vue'
import tools from "@/utils/tools";

const FILE_MAX_COUNT = 1;
const choiceImporter = ref(null)
const previewPage = ref(null)
const loading = ref(false)
const previewData: any = ref(null)

const emit = defineEmits(['close'])

function close() {
    emit("close")
}

const postman_mapping: any = {
    json: "json"
};

function choiceImporterAction(importer: any) {
    console.log(importer);

    loading.value = true
    if (importer.key === 'idea') {
        setTimeout(() => {
            previewPage.value = importer.key
            loading.value = false
        }, 500)
    } else {
        setTimeout(() => {
            choiceImporter.value = importer.key
            loading.value = false
        }, 500)
    }
}

function fileHandleChange(options: any) {
    console.log(options);
    const { file, onProgress, onSuccess, onError } = options;
    if (!postman_mapping[file.name.split(".").pop()]) {
        tools.message("不支持该文件类型");
        return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
        // 文件内容
        const postmanParser = new PostmanParser()
        loading.value = true
        try {
            previewData.value = postmanParser.parse(e.target.result)
        } catch (error) {
            loading.value = false
            tools.message("解析文件失败，请检查您上传的文件格式。")
            return
        }

        console.log(previewData.value);
        setTimeout(() => {
            loading.value = false
            previewPage.value = choiceImporter.value
        }, 500)
    };
    reader.readAsText(file);
}

</script>

<style lang="scss" scoped>
.preview {
    // max-height: 500px;
    overflow: hidden;
    width: 1400px;
    height: 600px;
}

.importer-container {
    .import-container {
        // min-height: 300px;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 0px;

        .upload-demo {
            width: 100%;
        }
    }

    .outer-select {
        min-width: 900px;
        display: flex;
        justify-content: start;
        align-items: center;
        // border-bottom: 1px solid #f0f0f0;
        padding: 5px;
        gap: 5px;

        .item {
            // height: 50px;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 4px 8px;
            border: 2px solid #f0f0f0;
            border-radius: 8px;
            gap: 8px;

            .img {
                width: 35px;
                height: 35px;
                border-radius: 4px;
                object-fit: fill;
            }

            .name {
                font-size: 1rem;
                font-weight: 500;
                font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
            }
        }

        .item:hover {
            border: 2px solid #000000;
        }

        .choice {
            border: 1px solid #006e54;
        }
    }
}
</style>