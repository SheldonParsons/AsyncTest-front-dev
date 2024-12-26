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

export const webApp = (
  url: string,
  query: string,
  app_id: any,
  conversation_id: any,
  project_id:any,
  onData: (event_response: { [key: string]: any }) => void
) => {
  return ssePost(
    url,
    {
      body: { query: query, app_id: app_id, conversation_id: conversation_id, project_id: project_id },
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
      ? GlobalStatus.localhost + "/server"
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
  // 1.检测网络请求是否正常
  if (!response.ok) throw new Error("网络请求失败");

  // 2.构建reader以及deocder
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  // 3.构建read函数用于去读取数据
  const read = () => {
    let hasError = false;
    reader?.read().then((result: any) => {
      if (result.done) return;

      buffer += decoder.decode(result.value, { stream: true });
      const lines = buffer.split("\n");

      let event = "";
      let data = "";

      try {
        lines.forEach((line) => {
          line = line.trim();
          if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            data = line.slice(5).trim();
          }

          // 每个事件以空行结束，只有event和data同时存在，才表示一次流式事件的数据完整获取到了
          if (line === "") {
            if (event !== "" && data !== "") {
              onData({
                event: event,
                data: JSON.parse(data),
              });
              event = "";
              data = "";
            }
          }
        });
        buffer = lines.pop() || "";
      } catch (e) {
        hasError = true;
      }

      if (!hasError) read();
    });
  };

  // 4.调用read函数去执行获取对应的数据
  read();
};
