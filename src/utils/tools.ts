interface iTools {
  [propName: string]: any;
}

const tools: iTools = {};
tools.message = (
  text: String,
  proxy: any,
  level: String = "success",
  delay: Number = 3000
) => {
  proxy.$message({
    message: text,
    duration: delay,
    type: level,
  });
};

tools.getLocaleDateTime = (utc: string, dateOnly: boolean = true) => {
  const date = new Date(utc);
  if (dateOnly) {
    return date.toLocaleDateString().split("/").join("-");
  } else {
    return date.toLocaleString().split("/").join("-");
  }
};

tools.getStartAndEndDateTime = (privateFormatString: string) => {
  if (privateFormatString.indexOf("T:") !== -1) {
    // 拆解时间区间
    const startTime = privateFormatString.split("]:[")[0].split("T:[")[1];
    const endTime = privateFormatString.split("]:[")[1].split("]")[0];
    return { startTime, endTime };
  } else {
    return false;
  }
};

export default tools;
