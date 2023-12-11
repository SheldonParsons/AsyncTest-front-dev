import TypeObjectStore from '../type' // 引入类型别名

const globalHeader: TypeObjectStore =
{
  keyPath: 'id',
  indexs: ['style']
}

const headerObjectStore = {
  header: globalHeader
}

export default headerObjectStore
