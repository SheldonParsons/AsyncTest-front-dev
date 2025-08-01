export class IntervalMap {
  private intervals: Array<{
    start: number
    end: number
    htmlObject: HTMLElement
    status: 'before' | 'after'
  }> = []

  constructor() {
    this.intervals = []
  }

  // 插入区间和对应的 HTML 对象及状态
  addInterval(start: number, end: number, htmlObject: HTMLElement, status: 'before' | 'after') {
    this.intervals.push({ start, end, htmlObject, status })
    this.intervals.sort((a, b) => a.start - b.start) // 保证区间按开始值排序
  }

  // 查询数值对应的区间，并返回 HTML 对象和状态
  query(value: number) {
    if (this.intervals.length === 0) return null

    // 如果值小于最小的 start，返回第一个区间
    if (value < this.intervals[0].start) {
      return {
        htmlObject: this.intervals[0].htmlObject,
        status: this.intervals[0].status
      }
    }

    // 如果值大于最大的 end，返回最后一个区间
    if (value > this.intervals[this.intervals.length - 1].end) {
      const lastInterval = this.intervals[this.intervals.length - 1]
      return {
        htmlObject: lastInterval.htmlObject,
        status: lastInterval.status
      }
    }

    let left = 0
    let right = this.intervals.length - 1

    // 二分查找来查找最匹配的区间
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const interval = this.intervals[mid]

      if (value >= interval.start && value <= interval.end) {
        return {
          htmlObject: interval.htmlObject,
          status: interval.status
        }
      } else if (value < interval.start) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    return null // 没有找到对应的区间
  }

  get_data() {
    return this.intervals
  }
}