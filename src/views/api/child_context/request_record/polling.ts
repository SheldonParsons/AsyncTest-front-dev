/**
 * 轮询工具类
 * 用于定时轮询请求，支持自动停止条件和超时控制
 */

export interface PollingOptions<T> {
  /** 轮询函数，返回 Promise */
  pollFn: () => Promise<T>;
  /** 检查是否应该停止轮询的函数 */
  shouldStop: (data: T) => boolean;
  /** 每次轮询间隔时间（毫秒），默认 500ms */
  interval?: number;
  /** 最大轮询时长（毫秒），默认 60000ms (60秒) */
  maxDuration?: number;
  /** 轮询成功回调 */
  onSuccess?: (data: T) => void;
  /** 轮询错误回调 */
  onError?: (error: any) => void;
  /** 轮询停止回调 */
  onStop?: () => void;
}

export class Polling<T = any> {
  private timerId: number | null = null;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private options: Required<PollingOptions<T>>;

  constructor(options: PollingOptions<T>) {
    this.options = {
      interval: 500,
      maxDuration: 60000,
      onSuccess: () => {},
      onError: () => {},
      onStop: () => {},
      ...options,
    };
  }

  /**
   * 开始轮询
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.poll();
  }

  /**
   * 停止轮询
   */
  stop() {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.options.onStop();
  }

  /**
   * 重置并重新开始轮询
   */
  reset() {
    this.stop();
    this.start();
  }

  /**
   * 检查是否正在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 执行一次轮询
   */
  private async poll() {
    if (!this.isRunning) {
      return;
    }

    // 检查是否超时
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= this.options.maxDuration) {
      this.stop();
      return;
    }

    try {
      const data = await this.options.pollFn();
      this.options.onSuccess(data);

      // 检查是否应该停止
      if (this.options.shouldStop(data)) {
        this.stop();
        return;
      }

      // 继续下一次轮询
      if (this.isRunning) {
        this.timerId = window.setTimeout(() => {
          this.poll();
        }, this.options.interval);
      }
    } catch (error) {
      this.options.onError(error);

      // 出错后继续轮询
      if (this.isRunning) {
        this.timerId = window.setTimeout(() => {
          this.poll();
        }, this.options.interval);
      }
    }
  }
}

/**
 * 创建轮询实例的便捷函数
 */
export function createPolling<T>(options: PollingOptions<T>): Polling<T> {
  return new Polling(options);
}
