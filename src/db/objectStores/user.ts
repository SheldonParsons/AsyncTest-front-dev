import TypeObjectStore from '../type' // 引入类型别名

const webUser: TypeObjectStore =
{
  keyPath: 'id',
  indexs: ['userId', 'username', 'password', 'role', 'nickName', 'email', 'mobile', 'sex']
}

const userObjectStore = {
  user: webUser
}

export default userObjectStore
