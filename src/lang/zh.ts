export default {
  language: {
    current: 'zh'
  },
  global: {
    open: '敬请期待，暂未开放！',
    empty: '暂无数据',
    emptyDesc: '暂无描述信息',
    confirm: '确认',
    cancel: '取消',
    questionSure: '您确定要 ',
    questionSure2: ' 吗？'
  },
  message: {
    home: '首页',
    mine: '个人中心'
  },
  header: {
    language: '国际化切换'
  },
  main: {
    name: 'AsyncTest',
    editor: 'AsyncEditor(Monaco Base)'
  },
  datePicker: {
    lm10: '过去 10 分钟',
    lh: '过去 1 小时',
    ld: '过去 1 天'
  },
  menu: {
    news: '最近上新',
    level1: {
      father: '数据中心',
      child: {
        a: '数据管理'
      }
    },
    level2: {
      father: 'Mock服务',
      child: {
        a: 'Mock管理',
        b: 'Mock记录'
      }
    },
    level3: {
      father: 'API开放服务',
      child: {
        a: '鉴权服务',
        b: '数据服务',
        c: 'Mock服务'
      }
    },
    level4: {
      father: '其他',
      child: {
        a: '工具箱',
        b: '数据库管理',
        c: '测试报告'
      }
    },
    level5: {
      father: '关于AsyncTest',
      child: {
        a: '更新日志'
      }
    }
  },
  form: {
    push: '确定',
    cancel: '取消'
  },
  button: {
    create: '创建',
    cancel: '取消',
    edit: '修改'
  },
  input: {
    search: {
      placeholder: '搜索数据 范围：ID、变量名称、描述信息、创建者、数据内容'
    },
    mock: {
      placeholder: '搜索数据 范围：路径、请求方法、Mock描述、创建者'
    },
    mockRecord: {
      placeholder: '搜索数据 范围：请求方法、路径、发起端IP、格式化时间'
    },
    transferBar: {
      placeholder: '复制Chrome浏览器DevTools Network的Headers信息或Json格式的Headers信息.'
    },
    check: {
      empty: '输入内容不能为空',
      status: '仅能输入200到599之间的正整数',
      delay: '仅能输入1到60000之间的正整数'
    }
  },
  debug: {
    save: '您已将接口请求和响应信息保存至粘贴板以及Chrome浏览器的缓存中，下次打开依旧能够被看到。'
  },
  login: {
    username: '用户名',
    password: '密码',
    submit: '登录',
    remember: '记住我',
    prompt: '请使用禅道账号进行登陆',
    title: '使用您的 禅道 账号登陆AsyncTest',
    subTitle: '我们不会保留您禅道的鉴权信息，请放心使用。没有账号，立即跳转至禅道？',
    zentao: '禅道首页',
    placeholderU: '禅道账号',
    placeholderP: '禅道密码'
  },
  noticeError: {
    username: '请输入用户名。',
    password: '请输入密码。',
    clickAllowed: '点击太快了！'
  },
  notice: {
    successLogin: '登录成功！',
    usingSystem: '您正在使用禅道用户系统进行登陆。',
    clipboard: '已成功复制到剪贴板。',
    delete: '该数据已被删除。',
    sorted: '完成排序',
    disabled: '已禁用',
    enabled: '已启用',
    flush: '数据已刷新',
    check: '请输入正确格式和范围内的状态码、延迟响应'
  },
  asking: {
    delete: '您确定要删除它吗？'
  },
  tooltip: {
    cleanForm: '重置所有筛选数据',
    dateFilter: '通过时间区间筛选',
    center: '工作中心',
    logout: '退出登录',
    debugPanel: '调试看板',
    saveInter: '保存接口信息',
    getInter: '粘贴接口信息',
    favorite: '添加/取消收藏 项目',
    default: '添加/取消默认 项目',
    buildInMethod: '内置函数信息',
    task: '任务中心'
  },
  response: {
    lessData: '没有更多数据了。'
  },
  project: {
    all: '所有项目',
    public: '公开项目',
    favorite: '收藏项目',
    cancelFavorite: '取消收藏项目成功',
    addFavorite: '添加收藏项目成功。',
    cancelDefault: '取消默认项目成功',
    addDefault: '添加默认项目成功。',
    defaultProject: '默认项目',
    enterProject: '进入项目',
    search: {
      placeholder: '搜索数据 范围：项目名称'
    },
    approve: {
      abandonApplySystem: '很抱歉，系统目前无法支持申请项目，请稍后再试。',
      requestDesc: '申请加入项目',
      requestDescPlaceHolder: '请填写加入项目的理由',
      confirmDesc: '申请入项',
      cancelDesc: '取消',
      emptyApproveReason: '理由不能为空',
      dupApprove: '请勿重复申请',
      node: '审批节点',
      successApply: '成功申请',
      event: {
        type: '事件类型',
        status: '任务进度',
        promoter: '发起人',
        time: '发起时间',
        project: '申请入项',
        applyProject: '所属项目',
        approveStatus: '审批状态',
        es: '未审批,审批中,审批不通过,审批通过,其他'
      },
      task: {
        record: '审批记录',
        ApproveBy: '审批人',
        reason: '原由',
        project: '审批入项',
        type: '任务类型',
        promoter: '发起人',
        promoRemark: '备注信息',
        applyProject: '所属项目',
        time: '发起时间',
        taskStatus: '任务状态',
        st: '未审批,审批通过,审批不通过,汇总通过,汇总不通过,其他',
        placeholder: '请填写审批理由',
        dialog: {
          header: '审批任务',
          confirmFooter: '同意',
          rejectFooter: '拒绝'
        }
      },
      menu: {
        task: '我的任务',
        node: '发起任务进度'
      }
    },
    mock: {
      checking: {
        expectName: '请填写期望名称'
      },
      tips: {
        tips: '改动提醒',
        content: '当前响应内容已经被修改，您是否需要将当前的响应内容进行保存？'
      },
      desc: {
        continue: '继续',
        save: '保存',
        create: '创建',
        expectName: '期望名称',
        presetsName: '预置名称',
        moreSetting: '更多设置',
        millisecond: '毫秒',
        expectSetting: '期望类型响应设置',
        publicResSetting: '公共响应内容设置',
        privateResSetting: '个人响应内容设置',
        expectResponse: '预期响应',
        presetsResponse: '预置响应',
        passAll: '通过所有断言',
        passOne: '通过其中一项断言',
        byCondition: '由断言决定是否通过',
        createExpect: '创建期望响应',
        createCondition: '创建条件判断',
        createNewExpect: '创建新期望',
        createNewPresets: '创建新预置响应',
        createNewCondition: '创建新条件判断',
        callTimes: '调用次数',
        totalCall:'总调用次数',
        lastCallTime: '最近调用时间',
        lastCallPersonnel: '最近覆盖人员',
        emptyCall: '暂未调用',
        emptyPersonCall: '暂无人调用',
        coverResList:'覆盖响应列表',
        public: '公共',
        private: '私人',
        defaultRes: '默认响应',
        expectRes:'期望响应',
        nowBindPresets: '现绑定预置：',
        emptyPreset:'暂无绑定预置',
        coverRecord: '覆盖记录',
        makeCoverTo: '将 预置响应覆盖到',
        response:'响应',
        default: '默认',
        expect: '期望',
        expectTableField: {
          enabled: '是否启用',
          condition: '条件',
          necessary: '是否必要',
          position: '参数位置',
          paramName: '参数名',
          compare: '比较',
          value: '参数值'
        }
      }
    },
    dataCol: {
      id: 'ID',
      name: '变量名',
      desc: '描述信息',
      creator: '创建者',
      action: '操作',
      data: '数据内容'
    },
    MockRecord: {
      dialogHeader: '接口Mock记录',
      reqTime: '请求时间',
      ip: 'IP',
      dialog: {
        method: '请求方法',
        title: 'Mock接口记录详细信息',
        domain: 'Mock服务域名',
        ip: '来源Ip',
        status: '响应状态',
        size: '响应大小',
        path: 'Mock路径',
        url: '完整 Url'
      }
    },
    MockCol: {
      url: 'URL',
      name: '名称',
      desc: '描述信息',
      action: '操作',
      method: '请求方法',
      creator: '创建者',
      status: '状态码',
      delay: '延迟响应',
      dialogHeader: '内置函数参数列表',
      path: '路径',
      divider: {
        baseInfo: 'Mock 基础信息',
        responseInfo: '公共响应 Mock 内容设置',
        responsePrivate: '个人响应 Mock 内容设置'
      },
      check: {
        empty: 'URL、描述信息不能为空',
        unique: '请求方法和URL必须联合唯一'
      },
      detail: {
        divider: '默认响应'
      }
    },
    buildInCol: {
      name: '函数名',
      buildIn: '函数签名',
      desc: '描述信息',
      demo: '使用示例（点击复制）'
    }
  },
  component: {
    editor: {
      language: '语言',
      formatted: '格式化完成。',
      changeLanguage: '切换语言至：',
      unique: '变量名必须在当前项目下唯一。',
      empty: '变量名、描述信息、数据体不能为空。',
      nameReg: '变量名仅允许为大小写字母与下划线的组合'
    }
  },
  log: {
    title: '更新日志',
    latest: '最新'
  },
  apiServer: {
    tips: '提示',
    example: '接口信息示例'
  },
  about: {
    contact: '联系电话:',
    source: '源代码',
    contributor: '贡献者',
    front: '前端'
  },
  tool: {
    more: '更多工具，敬请期待',
    mocking: 'Expect Mock文档教程',
    baseJavaScript: '基于 JavaScript',
    x2e: {
      title: 'XMind 转 Excel工具',
      dialogHeader: '上传待解析Xmind文件',
      guideHeader: 'Xmind 转 Excel工具指南',
      guideTooltip: '编写指南',
      cancel: '取消',
      preview: '预览',
      format: '仅限.xmind 格式文件上传',
      uploadTips: '将文件拖拽于此，或者',
      clickUpload: '点击上传',
      otherTips: '单次仅限一个文件进行转换',
      next2: {
        title: '解析Xmind文件预览',
        reUpload: '重新上传',
        download: '下载'
      }
    }
  }
}
