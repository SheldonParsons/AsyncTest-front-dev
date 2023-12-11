<template>
  <div class="main">
    <div class="title">
      <h1>Xmind 转 Excel工具介绍</h1>
    </div>
    <div>
      <p style="font-size: 16px; font-weight: 400; line-height: 1.7rem">
        该工具可以将特定格式的Xmind文件转换为符合禅道系统测试用例规范的Excel文件，帮助您在Xmind上编写完成测试用例后以正确的形式快速上传至禅道。
      </p>
    </div>
    <div class="title second">
      <h2>1、编写Xmind文件前的准备工作</h2>
    </div>
    <div>
      <div class="server-tips">
        <pre><div
                v-html="'1、确定您待书写的模块、需求信息</br>2、在禅道系统测试->用例->导出->导出模板->选择研发需求 页面中选择您的模块以及需求，并将其导出。这里包含了您后续上传至禅道时绑定的模块以及需求信息。在书写Xmind文件时也需要您完整的填写模块和需求名称，特别是它包含的ID信息，以（#1234）这种形式予以表达。'"
                style="white-space: pre-wrap;line-height: 1.7rem;font-size: 14px;"
                class="content tips-text"
              /></pre>
      </div>
    </div>
    <div class="title second">
      <h2>2、编写Xmind文件时一些书写格式的规定</h2>
    </div>
    <div>
      <p style="font-size: 16px; font-weight: 400; line-height: 1.7rem">
        Xmind文件转为Excel文件的功能核心在于保留编写Xmind文件时的逻辑上下文的合理性推导，但是为了转换成符合禅道标准的Excel格式测试用例文件，您需要遵守以下的一些编写规范。
      </p>
    </div>
    <div>
      <div class="server-tips">
        <pre><div
                v-html="'1、第一个节点为模块的名称，以及它的编号，您可以从刚才下载的禅道模板中获得它完整的名称信息</br>2、第二个节点为需求的名称，禅道模板文件中也有它的信息</br>3、从第三个节点开始，至倒数第三个节点为用例名称，工具将以【_】符号进行拼接</br>4、倒数第二个节点为用例的步骤，如果有多个步骤同属于同一个上级标签，工具将会把他们合并</br>5、最后一个节点为结果，它的数量一定是和步骤相等的，意味着您需要为您每一个步骤编写一个结果节点，来适配一一对应的这种逻辑关系'"
                style="white-space: pre-wrap;line-height: 1.7rem;font-size: 14px;"
                class="content tips-text"
              /></pre>
      </div>
    </div>
    <div>
      <p style="font-size: 16px; font-weight: 400; line-height: 1.7rem">
        这里是一个Xmind文件的示例图片，您可以参考它，希望对您有所帮助。
      </p>
    </div>
    <div>
      <el-image
        style="width: 500px; height: 300px"
        :src="X2EImage"
        :zoom-rate="1.2"
        :preview-src-list="srcList"
        :initial-index="1"
        fit="cover"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import X2EImage from '@/assets/img/guide/X2EGuide.png'
const srcList = [X2EImage]
</script>

<style lang="scss" scoped>
.main {
  margin: 25px;
  .server-tips {
    width: 95%;
    border-left: 4px solid transparent;
    // border-radius: 0px;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    background-clip: padding-box, border-box;
    background-origin: padding-box, border-box;
    background-image: linear-gradient(
        to right,
        var(--el-color-primary-light-9),
        var(--el-color-primary-light-8)
      ),
      linear-gradient(
        90deg,
        var(--global-theme-light-color),
        var(--global-theme-color)
      );
    margin: 20px 0px;
    padding: 8px 0px 8px 16px;
    .title {
      font-size: 16px;
      font-weight: 700;
    }
    .content {
      // padding-top: 20px;
      padding-right: 20px;
      line-height: 25px;
    }
  }
}
</style>
