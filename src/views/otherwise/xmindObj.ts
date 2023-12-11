class RootTopic {
  id = ''
  title = ''
  children:any = null

  constructor(data:any) {
    this.id = data.id
    this.title = data.title
    this.children = data.children
  }

  generate(data:Xmind) {

  }
}

class Xmind {
  sheetIndex:number = 0
  model = ''
  id = ''
  originData:any = {}
  topic:any = null
  caseList:Array<any> = []
  stage = ''
  typeString = ''
  columnsTitle = ['所属模块', '相关研发需求', '用例标题', '步骤', '预期', '优先级', '用例类型', '适用阶段']
  columns:any = null

  constructor(sheetIndex:number = 0, stage = '功能测试阶段', typeString = '功能用例') {
    this.sheetIndex = sheetIndex
    this.stage = stage
    this.typeString = typeString
  }

  generate(data:any) {
    this.originData = data[this.sheetIndex]
    this.id = this.originData.id
    this.model = this.originData.title
    this.topic = new RootTopic(this.originData.rootTopic)
    this.topic.generate(this)
    console.log(this.topic)
    for (let i = 0; i < this.topic.children.attached.length; i++) {
      this.flattenTree(this.topic.children.attached[i].children.attached, null, this.topic.children.attached[i].title)
    }
    console.log(this.caseList)
    return this
  }

  generateColumns() {
    function inner(index:Number) {
      if (index === 5) return 80
      if (index === 2) return 450
      return 150
    }
    this.columns = Array.from(this.columnsTitle).map((item, columnIndex) => ({
      key: 'column-' + columnIndex,
      dataKey: 'column-' + columnIndex,
      title: item,
      width: inner(columnIndex)
    }))
    return this.columns
  }

  generateData() {
    return Array.from(this.caseList).map((item, rowIndex) => {
      return this.columns.reduce(
        (rowData:any, column:any, columnIndex:any) => {
          rowData[String(column.dataKey)] = item[columnIndex]
          return rowData
        },
        {
          id: 'row-' + rowIndex,
          parentId: null
        }
      )
    })
  }

  isBackSecond(node:any) {
    return (node.children && node.children.attached.length > 0 && node.children.attached[0].children && node.children.attached[0].children.attached)
  }

  flattenTree(o:any[], fatherNode:any, demand:any) {
    let hasPush = false
    for (let i = 0; i < o.length; i++) {
      o[i].father = fatherNode
      console.log(o[i])
      if (this.isBackSecond(o[i])) {
        this.flattenTree(o[i].children.attached, o[i], demand)
      } else {
        if (!hasPush) {
          console.log(o[i])
          const { name, priority } = this.getAllFather(o[i])
          const father = o[i].father
          const { steps, hopes } = this.getStepsAndHope(father)
          const res = [
            this.topic.title,
            demand,
            name,
            steps,
            hopes,
            priority,
            this.typeString,
            this.stage
          ]
          this.caseList.push(res)
          hasPush = true
        }
      }
    }
  }

  getStepsAndHope(node:any) {
    let steps = ''
    let hopes = ''
    for (let i = 0; i < node.children.attached.length; i++) {
      try {
        if (node.children.attached[i].children.attached[0].children.attached[0]) {
          continue
        }
      } catch (error) {
        steps = steps + String(i + 1) + '.' + node.children.attached[i].title
        for (let j = 0; j < node.children.attached[i].children.attached.length; j++) {
          hopes = hopes + String(i + 1) + '.' + node.children.attached[i].children.attached[j].title
        }
      }
    }
    return { steps, hopes }
  }

  getAllFather(node:any) {
    const result = [node.title]
    let priority:number = 3
    let hasFindPriority = false
    while (true) {
      if (node.father !== null) {
        result.unshift(node.father.title)
        if (!hasFindPriority) {
          if (node.markers && node.markers.length > 0) {
            if (node.markers[0].markerId) {
              hasFindPriority = true
              // eslint-disable-next-line no-unused-vars
              priority = Number(node.markers[0].markerId.split('-')[1])
            }
          }
        }
        node = node.father
      } else {
        break
      }
    }
    result[0] = '【' + result[0] + '】'
    result.pop()
    return { name: result.join('_'), priority }
  }
}

export default Xmind
