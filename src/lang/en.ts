export default {
  language: {
    current: 'en'
  },
  global: {
    open: 'Open Soon',
    empty: 'Empty Data',
    emptyDesc: 'Empty Desc info',
    confirm: 'Confirm',
    cancel: 'Cancel',
    questionSure: 'Are you sure to ',
    questionSure2: ' it?'
  },
  message: {
    home: 'home',
    mine: 'mine'
  },
  header: {
    language: 'Language'
  },
  main: {
    name: 'AsyncTest',
    editor: 'AsyncEditor(Monaco Base)'
  },
  datePicker: {
    lm10: 'Last 10 mins',
    lh: 'Last hour',
    ld: 'Last day'
  },
  menu: {
    news: 'New Functions',
    level1: {
      father: 'DataCenter',
      child: {
        a: 'DataManagement'
      }
    },
    level2: {
      father: 'Mock',
      child: {
        a: 'MockManagement',
        b: 'MockRecord'
      }
    },
    level3: {
      father: 'ApiServer',
      child: {
        a: 'Authorization',
        b: 'DataServer',
        c: 'MockServer'
      }
    },
    level4: {
      father: 'Controller',
      child: {
        a: 'Tools Box',
        b: 'DataBase',
        c: 'Reporting'
      }
    },
    level5: {
      father: 'About AsyncTest',
      child: {
        a: 'Feature'
      }
    }
  },
  form: {
    push: 'OK',
    cancel: 'No, Thanks!'
  },
  button: {
    create: 'Create',
    cancel: 'Cancel',
    edit: 'Edit'
  },
  input: {
    search: {
      placeholder: 'Searching By:ID、Name、Desc、Creator、Data Content'
    },
    mock: {
      placeholder: 'Searching By:Path、Method、Name、Creator'
    },
    mockRecord: {
      placeholder: 'Searching By:Method、Path、IP、Time Format'
    },
    transferBar: {
      placeholder: "Input Chrome devTools Network Header's info or json."
    },
    check: {
      empty: 'Cannot be empty',
      status: 'Only positive integers between 200 and 599 can be entered',
      delay: 'Only positive integers between 0 and 60000 can be entered'
    }
  },
  debug: {
    save: 'You has been save the interface info to you Clipboard and LocalStorage of Chrome.'
  },
  login: {
    username: 'Username',
    password: 'Password',
    submit: 'Continue',
    remember: 'Remember Me',
    prompt: 'Sign In With ZenTao Account',
    title: 'Log in using your ZenTao account',
    subTitle: 'You can directly log in using the ZenTao account. Turn to the ZenTao page?',
    zentao: 'ZenTao HomePage',
    placeholderU: 'Your Zen Username',
    placeholderP: 'Your Zen Password'
  },
  noticeError: {
    username: 'Please Enter Username.',
    password: 'Please Enter Password.',
    clickAllowed: 'Click too soon.'
  },
  notice: {
    successLogin: 'Success!',
    usingSystem: 'You Are Logging In Using ZenTao User System.',
    clipboard: 'It has been copied to your clipboard.',
    delete: 'It has been deleted.',
    sorted: 'Sorted',
    disabled: 'Disabled',
    enabled: 'Enabled',
    flush: 'Refreshed',
    check: 'Please enter the correct format and range of status codes and delay responses'
  },
  asking: {
    delete: 'Are you sure to delete this?'
  },
  tooltip: {
    cleanForm: 'Reset all filters data',
    dateFilter: 'Filter with date picker',
    center: 'Working Center',
    logout: 'Logout',
    debugPanel: 'DebugTools',
    saveInter: 'Save Interface Info',
    getInter: 'Paste Interface Info from your clipboard',
    favorite: 'Favorite/unFavorite',
    default: 'Default/unDefault',
    buildInMethod: 'Build-in Method arguments',
    task: 'Task View'
  },
  response: {
    lessData: 'No data anymore.'
  },
  project: {
    all: 'All Project',
    public: 'Public',
    favorite: 'Favorite Project',
    cancelFavorite: 'Has been cancel your favorite project.',
    addFavorite: 'Added your favorite project.',
    cancelDefault: 'Has been cancel your default project.',
    addDefault: 'Added your default project.',
    search: {
      placeholder: 'Searching By: Project name'
    },
    approve: {
      abandonApplySystem: 'Sorry,System could not support the apply for project at current.',
      requestDesc: 'Apply to join the project',
      requestDescPlaceHolder: 'Please fill in the reason for applying to join the project',
      confirmDesc: 'Apply',
      cancelDesc: 'Cancel',
      emptyApproveReason: 'The application reason cannot be empty',
      dupApprove: 'Please do not repeat the application',
      node: 'Application Node',
      successApply: 'Successfully Applied',
      event: {
        type: 'EventType',
        status: 'TaskStatus',
        promoter: 'Promoter',
        time: 'Initiation time',
        project: 'Join Project',
        applyProject: 'Apply Project',
        approveStatus: 'Approve Status',
        es: 'Unapproved,Approving,Approval Failed,Approval Success,Other'
      },
      task: {
        record: 'Record',
        ApproveBy: 'By',
        reason: 'Reason',
        project: 'Join Project',
        type: 'TaskType',
        promoter: 'Promoter',
        promoRemark: 'Remark',
        applyProject: 'Apply Project',
        time: 'Initiation time',
        taskStatus: 'Task Status',
        st: 'Unapproved,Approved,Approval Failed,Summary Passed,Summary failed,Other',
        placeholder: 'Please fill in the reason for approve',
        dialog: {
          header: 'Approval Task',
          confirmFooter: 'Agree',
          rejectFooter: 'Reject'
        }
      },
      menu: {
        task: 'My Task',
        node: 'Initiation Task'
      }
    },
    mock: {
      checking: {
        expectName: 'Please fill in the expected name'
      },
      tips: {
        tips: 'Change Reminder',
        content: 'The current response content has been modified. Do you need to save the current response content?'
      },
      desc: {
        continue: 'Continue',
        save: 'Save',
        create: 'Create',
        expectName: 'Expect Name',
        presetsName: 'Presets Name',
        moreSetting: 'More Setting',
        millisecond: 'Millisecond',
        expectSetting: 'Expect Response Setting',
        publicResSetting: 'Public Setting',
        privateResSetting: 'Private Setting',
        expectResponse: 'Expectation',
        presetsResponse: 'Presetting',
        passAll: 'All items passed',
        passOne: 'Only passed one of the them',
        byCondition: 'By Condition',
        createExpect: 'Create Expect',
        createCondition: 'Create Condition',
        createNewExpect: 'Create New Expectation',
        createNewPresets: 'Create New Presetting',
        createNewCondition: 'Create New Condition',
        totalCall:'Total Call',
        lastCallTime: 'Last Call Time',
        lastCallPersonnel: 'Last covered personnel',
        emptyCall: 'Not yet called',
        emptyPersonCall: 'Not yet called',
        coverResList:'Cover Response List',
        public: 'Public',
        private: 'Private',
        defaultRes: 'Default Response',
        expectRes:'Expectation Response',
        nowBindPresets: 'Binding Presets：',
        emptyPreset:'No Binding Presets',
        coverRecord: 'Cover Record',
        makeCoverTo: 'Cover To',
        response:'Response',
        default: 'Default',
        expect: 'Expectation',
        expectTableField: {
          enabled: 'Enabled',
          condition: 'Condition',
          necessary: 'Necessary',
          position: 'Position',
          paramName: 'Name',
          compare: 'Compare',
          value: 'Value'
        }
      }
    },
    dataCol: {
      id: 'ID',
      name: 'Name',
      desc: 'Desc',
      creator: 'Creator',
      action: 'Action',
      data: 'Data'
    },
    MockRecord: {
      dialogHeader: 'Mock Record with Interface',
      reqTime: 'Request Time',
      ip: 'IP',
      dialog: {
        method: 'Method',
        title: "Mock Interface's Record of Detail Info",
        domain: 'Mock Server Domain',
        ip: 'Origin Ip',
        status: 'Status',
        size: 'Size',
        path: 'Mock Path',
        url: 'Complete Url'
      }
    },
    MockCol: {
      url: 'URL',
      name: 'Name',
      desc: 'Desc',
      action: 'Action',
      method: 'Method',
      creator: 'Creator',
      status: 'Status',
      delay: 'Delay',
      dialogHeader: 'Build-in Method Arguments',
      path: 'Path',
      divider: {
        baseInfo: 'Mock Base Info',
        responseInfo: 'Mock Response Info Setting For Public',
        responsePrivate: 'Mock Response Info Setting For Private'
      },
      check: {
        empty: 'URL、description cannot be empty',
        unique: 'Method and Url must be jointly unique'
      },
      detail: {
        divider: 'Default Response'
      }
    },
    buildInCol: {
      name: 'Name',
      buildIn: 'Build-in Sign',
      desc: 'Desc',
      demo: 'Demo(Click to Copy)'
    }
  },
  component: {
    editor: {
      language: 'Lang',
      formatted: 'Formatted.',
      changeLanguage: 'Switch language to:',
      unique: 'Name field must be unique in project scope.',
      empty: 'Variable Name、Desc Info、Data Body could not be empty.',
      nameReg: 'Variable names can only be combinations of uppercase and lowercase letters and underscores.'
    }
  },
  log: {
    title: 'ChangeLog',
    latest: 'Latest'
  },
  apiServer: {
    tips: 'Tips',
    example: 'Interface info & Example'
  },
  about: {
    contact: 'Contact Tel:',
    source: 'Source Code',
    contributor: 'Contributor',
    front: 'Font-end'
  },
  tool: {
    more: 'More Tools Coming Soon!',
    mocking: 'Hope Mocking Detail Doc',
    baseJavaScript: 'Base JavaScript',
    x2e: {
      title: 'XMind To Excel',
      dialogHeader: 'Upload Xmind file',
      guideHeader: 'Xmind To Excel Tools Guide',
      guideTooltip: 'XMind Writing Guide',
      cancel: 'Cancel',
      preview: 'Preview',
      format: 'Only support .xmind suffix be converted files to upload.',
      uploadTips: 'Dragging file to here, or',
      clickUpload: 'Click to Upload',
      otherTips: 'Only one file is supported for conversion at a time.',
      next2: {
        title: 'Converted file preview',
        reUpload: 'Reupload',
        download: 'Download'
      }
    }
  }
}
