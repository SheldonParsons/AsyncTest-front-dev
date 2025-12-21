import { http } from "@/utils/http";

// 获取状态列表
export function ApiGetInterfaceTestStatus(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_test_status", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取当前用户可选责任人列表
export function ApiGetInterfaceResponsors(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_responsors", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取标签列表
export function ApiGetInterfaceMarkers(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_markers", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取当前环境服务列表
export function ApiGetInterfaceServers(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_servers", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取响应列表
export function ApiGetInterfaceResponses(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_responses", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取接口信息
export function ApiGetInterfaceData(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_interface_data_real", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取接口信息
export function ApiGetInterfaceFiles(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_files", params).then((res: any) => {
      resolve(res);
    });
  });
}

export function ApiGetInterfaceDatabases(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_databases", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取单条数据
export function ApiGetInterfaceDatabase(
  id: Number,
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`mock/get_database/${id}`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取环境信息，精简版
export function ApiGetInterfaceEnvSimple(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_env_simple", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取Mock列表
export function ApiGetInterfaceMocks(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_mock_list", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取期望列表
export function ApiGetInterfaceExpects(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("mock/get_expect_list", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取期望列表
export function ApiGetInterfaceSingleExpects(id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`mock/get_expect/${id}`, {}).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取api配置信息
export function ApiGetSummarySource(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/source/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 更新接口
export function ApiUpdateInterface(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/interface/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 获取单接口
export function ApiGetSingleInterface(
  id: Number,
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/api/interface/${id}/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

export function ApiGetSingleInterfaceList(
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/api/interface/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建接口响应
export function ApiPostResponse(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/response/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 获取期望列表
export function ApiGetResponse(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/response/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除响应
export function ApiDeleteResponse(id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/api/response/${id}/`).then((res: any) => {
      resolve(res);
    });
  });
}

// 批量更新响应
export function ApiUpdateResponse(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPut(`/api/response/bulk_update/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取临时变量列表
export function ApiGetTempVariable(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/temp_variable/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取项目数据库信息
export function ApiGetTempVariableCancel(config: any): Promise<String> {
  return new Promise((resolve) => {
    http.cancelHttpGet("/api/temp_variable/", config).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建临时变量
export function ApiPostTempVariable(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/temp_variable/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 更新临时变量
export function ApiUpdateTempVariable(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPut(`/api/temp_variable/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除临时变量
export function ApiDeleteTempVariable(id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/api/temp_variable/${id}/`).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取mock列表
export function ApiGetMock(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/mock/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建Mock
export function ApiPostMock(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/mock/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 更新Mock
export function ApiUpdateMock(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPut(`/api/mock/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除Mock
export function ApiDeleteMock(id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/api/mock/${id}/`).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取mock期望列表
export function ApiGetMockExpect(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/mock_expect/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取单个期望
export function ApiGetMockExpectSingle(id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/api/mock_expect/${id}/`, {}).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建Mock期望
export function ApiPostMockExpect(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/mock_expect/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 更新Mock期望
export function ApiUpdateMockExpect(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPut(`/api/mock_expect/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 更新Mock期望优先级
export function ApiUpdateMockExpectPriority(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPut(`/api/mock_expect/update_priority/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除Mock期望
export function ApiDeleteMockExpect(id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/api/mock_expect/${id}/`).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取系统资源
export function ApiPostStaticInfo(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/static_info/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 获取单目录
export function ApiGetSingleDir(id: Number, params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/api/dir/${id}/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 目录相关操作
export function ApiUpdateDir(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/dir/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 创建标签
export function ApiPostTag(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/tag/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 运行单接口
export function ApiRunInterface(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/interface/run/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}
