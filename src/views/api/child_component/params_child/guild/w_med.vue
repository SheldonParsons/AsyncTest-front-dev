<template>
  <div class="grid-item">
    <div class="read-dynamic-value w-med">
      <el-row style="width: 100%">
        <el-col :span="5"><h1>Med</h1></el-col>
        <el-col
          :span="17"
          style="display: flex; flex-direction: column; justify-content: center"
        >
          <el-row style="width: 100%">
            <el-col :span="24"
              ><span style="font-weight: 500; color: black"
                >数据生成器</span
              ></el-col
            >
          </el-row>
          <el-row style="width: 100%">
            <el-col :span="24"
              ><span style="color: #667085; font-size: 12px; font-weight: 400"
                >读取环境变量/全局变量/临时变量</span
              ></el-col
            >
          </el-row>
        </el-col>
        <el-col
          :span="2"
          style="display: flex; justify-content: center; align-items: center"
        >
          <el-icon><ArrowRightBold /></el-icon>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped lang="scss">
.grid-item {
  .read-dynamic-value {
    border-radius: 10px;
    border-style: solid;
    border-width: 1px;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    transition: all 0.1s;
    display: flex;
    cursor: pointer;
    height: 50px;
    h1 {
      display: flex;
      align-items: center;
      font-family: "Playball", cursive;
      font-size: 2em;
      font-weight: 700;
      text-align: center;
      margin: 0.25em 0; // Cosmetic value
    }
  }
  .w-var {
    background-color: rgba(3, 158, 116, 0.04);
    border-color: rgba(3, 158, 116, 0.04);
    h1 {
      color: #2ecc71;
    }
  }
  .w-med {
    background-color: rgba(3, 13, 158, 0.04);
    border-color: rgba(3, 21, 158, 0.04);
    h1 {
      color: #2e3bcc;
    }
  }
  .w-equal {
    background-color: white;
    border-color: #f2f4f7;
  }
  .w-equal:hover {
    background-color: rgba(87, 87, 87, 0.08);
  }
  .w-med:hover {
    background-color: rgba(3, 24, 158, 0.08);
  }
  .w-var:hover {
    background-color: rgba(3, 158, 116, 0.08);
  }
}
</style>