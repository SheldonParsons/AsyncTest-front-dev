import GlobalStatus from "@/global";
import asyncTest from "@/db";
// 2.基础的配置
const baseFetchOptions = {
  method: "GET",
  mode: "cors",
  credentials: "include",
  headers: {},
  redirect: "follow",
};

// 3.fetch参数类型
type FetchOptionType = Omit<RequestInit, "body"> & {
  params?: Record<string, any>;
  body?: BodyInit | Record<string, any> | null;
};

export const StreamPostApi = (
  url: string,
  data: any,
  stream_callback: (event_repsonse: { [key: string]: any }) => void
) => {
  return ssePost(url, { body: data }, stream_callback);
};

export const webApp = (
  url: string,
  query: string,
  app_id: any,
  conversation_id: any,
  project_id: any,
  onData: (event_response: { [key: string]: any }) => void
) => {
  return ssePost(
    url,
    {
      body: {
        query: query,
        app_id: app_id,
        conversation_id: conversation_id,
        project_id: project_id,
      },
    },
    onData
  );
};

export const debugApp = (
  url: string,
  query: string,
  app_id: number,
  onData: (event_response: { [key: string]: any }) => void
) => {
  return ssePost(
    url,
    {
      body: { query: query, app_id: app_id },
    },
    onData
  );
};

export const streamApi = (
  url: string,
  data: any,
  onData: (event_response: { [key: string]: any }) => void
) => {
  return ssePost(
    url,
    {
      body: data,
    },
    onData
  );
};

// 5.封装基于post的sse(流式事件响应)请求
export const ssePost = async (
  url: string,
  fetchOptions: FetchOptionType,
  onData: (data: { [key: string]: any }) => void
) => {
  const auth = asyncTest.cookies.getCookie(GlobalStatus.cookieTag);
  if (auth === false) {
    asyncTest.router.router.push({ name: GlobalStatus.anonymousPage });
  } else {
    baseFetchOptions["headers"] = new Headers({
      "Content-Type": "application/json",
      Authorization: `token=${auth}`,
    });
  }

  // 5.1 组装基础的fetch请求配置
  const options = Object.assign(
    {},
    baseFetchOptions,
    { method: "POST" },
    fetchOptions
  );
  
  // 5.2 组装请求URL
  const urlWithPrefix = `${
    import.meta.env.PROD
      ? GlobalStatus.get_product_host() + "/server"
      : GlobalStatus.localhost + "/api"
  }${url.startsWith("/") ? url : `/${url}`}`;
  
  // 5.3 结构body参数，并处理body对应的数据
  const { body } = fetchOptions;
  if (body) options.body = JSON.stringify(body);

  // 5.4 发起fetch请求并处理流式事件响应
  const response = await globalThis.fetch(
    urlWithPrefix,
    options as RequestInit
  );
  return handleStream(response, onData);
};

const handleStream = (
  response: Response,
  onData: (data: { [key: string]: any }) => void
) => {
  if (!response.ok) throw new Error("网络请求失败");

  const reader = response.body?.getReader();
  if (!reader) throw new Error("无法获取可读流");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let isClosed = false; // 跟踪流是否已关闭

  const read = async () => {
    try {
      while (!isClosed) {
        const { value, done } = await reader.read();

        if (done) {
          isClosed = true;
          processRemainingData();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }
    } catch (error) {
      console.error("流读取错误:", error);
      cancelStream();
    }
  };

  const processBuffer = () => {
    // 使用自定义分隔符分割完整事件
    while (buffer.includes("%datatag%\n\n")) {
      const endIndex = buffer.indexOf("%datatag%\n\n");
      const eventChunk = buffer.substring(0, endIndex);
      buffer = buffer.substring(endIndex + "%datatag%\n\n".length);

      parseEventChunk(eventChunk);
    }
  };

  const parseEventChunk = (chunk: string) => {
    const parts = chunk.split("%eventtag%\n");
    if (parts.length !== 2) {
      console.warn("无效的事件格式:", chunk);
      return;
    }

    let [eventPart, dataPart] = parts;
    eventPart = eventPart.trim();
    dataPart = dataPart.trim();

    // 提取事件名
    if (eventPart.startsWith("event:")) {
      eventPart = eventPart.slice(6).trim();
    }

    // 提取数据
    if (dataPart.startsWith("data:")) {
      dataPart = dataPart.slice(5).trim();
    }

    try {
      const data = dataPart ? JSON.parse(dataPart) : {};
      onData({ event: eventPart, data });
    } catch (error) {
      console.error("JSON 解析错误:", error, "原始数据:", dataPart);
    }
    // 处理特殊事件
    if (eventPart === "end") {
      cancelStream();
      return;
    }
  };

  const processRemainingData = () => {
    if (buffer.trim()) {
      console.warn("流结束时有未处理数据:", buffer);
      // 尝试处理剩余数据
      parseEventChunk(buffer);
    }
  };

  const cancelStream = () => {
    if (!isClosed) {
      isClosed = true;
      reader.cancel().catch((e) => console.warn("流关闭错误:", e));
    }
  };

  // 开始读取
  read();

  // 返回取消函数供外部调用
  return cancelStream;
};
