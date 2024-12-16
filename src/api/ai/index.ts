import { http } from "@/utils/http";

// openai对话测试
export function openaiTeting(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/stream/openai", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建Provider
export function createProvider(data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/llm/plugin/provider/",
        data,
        {},
        {
          "Content-Type": "multipart/form-data",
        }
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 修改单条数据
export function updateProvider(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(
        `/llm/plugin/provider/${id}/`,
        data,
        {},
        {
          "Content-Type": "multipart/form-data",
        }
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 创建插件
export function createProviderTool(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/llm/plugin/provider/tool/", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 修改插件
export function editProviderTool(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/llm/plugin/provider/tool/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 删除插件
export function deleteProviderTool(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpDelete(`/llm/plugin/provider/tool/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 获取提供商列表
export function getProviderList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/plugin/provider/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除单条提供商
export function deleteProvider(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/llm/plugin/provider/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取知识库列表
export function getKnowleageList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/knowledge/base/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取应用列表
export function getAppList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/app/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取文档列表
export function getDocumentList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/knowledge/document/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取片段列表
export function getSegmentList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/knowledge/segment/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 修改单条知识库
export function updateKnowledge(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(
        `/llm/knowledge/base/${id}/`,
        data,
        {},
        {
          "Content-Type": "multipart/form-data",
        }
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 修改单条知识库
export function updateApp(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(
        `/llm/app/${id}/`,
        data,
        {},
        {
          "Content-Type": "multipart/form-data",
        }
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 创建Knowledge
export function createKnowledge(data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/llm/knowledge/base/",
        data,
        {},
        {
          "Content-Type": "multipart/form-data",
        }
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 创建应用
export function createApp(data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/llm/app/",
        data,
        {},
        {
          "Content-Type": "multipart/form-data",
        }
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 删除单条提供商
export function deleteKnowledge(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/llm/knowledge/base/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除单条应用
export function deleteApp(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/llm/app/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}



// 获取单条知识库
export function getSingleKnowleageList(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/llm/knowledge/base/${id}/`, params).then((res: any) => {
      resolve(res)
    })
  })
}

// 获取单条文档
export function getSingleDocumentList(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/llm/knowledge/document/${id}/`, params).then((res: any) => {
      resolve(res)
    })
  })
}


// 上传文件
export function uploadFiles(data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/llm/upload/file/",
        data,
        {},
        {
          "Content-Type": "multipart/form-data",
        }
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 创建Document
export function createDocument(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/llm/knowledge/document/", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建Document
export function createSegmentApi(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/llm/knowledge/segment/", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 召回测试
export function callbackTesting(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/llm/knowledge/hit/", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 知识库最近查询列表
export function getRecentChekingList(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/llm/knowledge/query/`, params).then((res: any) => {
      resolve(res)
    })
  })
}

// 文档启用状态更新
export function editDocumentStatus(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/llm/knowledge/document/enabled/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 文档启用状态更新
export function editSegmentStatus(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/llm/knowledge/segment/enabled/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 修改文档
export function editDocument(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/llm/knowledge/document/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 修改片段
export function editSegmentApi(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/llm/knowledge/segment/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 删除单条文档
export function deleteDocumentApi(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/llm/knowledge/document/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除单条文档片段
export function deleteSegmentApi(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/llm/knowledge/segment/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}