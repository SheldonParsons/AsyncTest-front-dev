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
        this.db = event.target.result
        resolve(event)
      }
      request.onerror = (event) => {
        reject(event)
      }
      request.onupgradeneeded = (event) => {
        const { result }: any = event.target
        for (const storeName in stores) {
          const { keyPath, indexs } = stores[storeName]
          if (!result.objectStoreNames.contains(storeName)) {
            const store = result.createObjectStore(storeName, { autoIncrement: true, keyPath })
            if (indexs && indexs.length > 0) {
              indexs.map((v: string) => {
                store.createIndex(v, v, { unique: false })
              })
            }
            store.transaction.oncomplete = (event: any) => {
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
        resolve(event)
      }
      request.onerror = (event: any) => {
        reject(event)
      }
    })
  }

  deleteItem(storeName: string, key: number | string) {
    const store = this.db.transaction([storeName], 'readwrite').objectStore(storeName)
    const request = store.delete(key)
    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        resolve(event)
      }
      request.onerror = (event: any) => {
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
        resolve(event.target.result)
      }
      request.onerror = (event: any) => {
        reject(event)
      }
    })
  }

  getItem(storeName: string, key: number | string) {
    const store = this.db.transaction([storeName], 'readwrite').objectStore(storeName)
    const request = store.get(key)
    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        resolve(event.target.result)
      }
      request.onerror = (event: any) => {
        reject(event)
      }
    })
  }
}
