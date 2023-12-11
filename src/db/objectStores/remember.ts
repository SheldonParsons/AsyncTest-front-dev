import TypeObjectStore from '../type' // 引入类型别名

const webRemember: TypeObjectStore =
{
  keyPath: 'id',
  indexs: ['remember']
}

const rememberObjectStore = {
  remember: webRemember
}

export default rememberObjectStore
