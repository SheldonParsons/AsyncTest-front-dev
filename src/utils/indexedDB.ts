export default class DB {
  private dbName: string // 数据库名称
  private db: any // 数据库对象
  constructor(dbName: string) {
    this.dbName = dbName
  }

  // 打开数据库
  public openStore(stores:any) {
    const request = window.indexedDB.open(this.dbName, 2)
    return new Promise((resolve, reject) => {
      request.onsuccess = (event:any) => {
        console.log('数据库打开成功')
        this.db = event.target.result
        resolve(event)
      }
      request.onerror = (event) => {
        console.log('数据库打开失败')
        reject(event)
      }
      request.onupgradeneeded = (event) => {
        console.log('数据库升级成功')
        const { result }: any = event.target
        for (const storeName in stores) {
          console.log(storeName)
          const { keyPath, indexs } = stores[storeName]
          if (!result.objectStoreNames.contains(storeName)) {
            const store = result.createObjectStore(storeName, { autoIncrement: true, keyPath })
            if (indexs && indexs.length > 0) {
              indexs.map((v: string) => {
                store.createIndex(v, v, { unique: false })
              })
            }
            store.transaction.oncomplete = (event: any) => {
              console.log('创建对象仓库成功')
            }
          }
        }
      }
    })
  }

  // 新增
  updateItem(storeName: string, data: any) {
    const store = this.db.transaction([storeName], 'readwrite').objectStore(storeName)
    const request = store.put({
      ...data,
      updateTIme: new Date().getTime()
    })
    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        console.log('数据写入成功')
        resolve(event)
      }
      request.onerror = (event: any) => {
        console.log('数据写入失败')
        reject(event)
      }
    })
  }

  deleteItem(storeName: string, key: number | string) {
    const store = this.db.transaction([storeName], 'readwrite').objectStore(storeName)
    const request = store.delete(key)
    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        console.log('数据删除成功')
        resolve(event)
      }
      request.onerror = (event: any) => {
        console.log('数据删除失败')
        reject(event)
      }
    })
  }

  // 查询所有数据
  getList(storeName: string) {
    const store = this.db.transaction(storeName).objectStore(storeName)
    const request = store.getAll()
    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        console.log('查询所有数据成功')
        resolve(event.target.result)
      }
      request.onerror = (event: any) => {
        console.log('查询所有数据失败')
        reject(event)
      }
    })
  }

  getItem(storeName: string, key: number | string) {
    const store = this.db.transaction([storeName], 'readwrite').objectStore(storeName)
    const request = store.get(key)
    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        console.log('查询某一条数据成功')
        resolve(event.target.result)
      }
      request.onerror = (event: any) => {
        console.log('查询某一条数据失败')
        reject(event)
      }
    })
  }
}
