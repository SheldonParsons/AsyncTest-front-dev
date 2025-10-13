/**
 * @description 一个通用的轮询请求工具类
 * @template T - 轮询回调函数 Promise resolve 的数据类型
 */
export class PollingUtil<T> {
    // 轮询需要执行的回调函数，必须返回一个 Promise
    private callback: () => Promise<T>;
    // 间歇时间 (ms)
    private interval: number;
    // 最大轮询次数
    private maxRetries: number;

    // 当前已轮询次数
    private currentRetries = 0;
    // 定时器 ID，用于清除定时器
    private timerId: ReturnType<typeof setTimeout> | null = null;
    // 标志位，表示当前是否正在轮询
    private isRunning = false;

    /**
     * 构造函数 - 初始化轮询器
     * @param callback 一个返回 Promise 的函数，轮询的核心逻辑
     * @param interval 轮询的间歇时间（毫秒）
     * @param maxRetries 最大轮询次数
     */
    constructor(callback: () => Promise<T>, interval: number, maxRetries: number) {
        if (interval <= 0) {
            throw new Error('Interval must be a positive number.');
        }
        if (maxRetries <= 0) {
            throw new Error('Max retries must be a positive number.');
        }

        this.callback = callback;
        this.interval = interval;
        this.maxRetries = maxRetries;
    }

    /**
     * @description 重置、清空状态
     */

    public clear(): void {
        this.currentRetries = 0
    }

    /**
     * @description 开始轮询
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Polling is already running.');
            return;
        }

        console.log('Polling started.');
        this.isRunning = true;
        this.currentRetries = 0;
        this.poll();
    }

    /**
     * @description 停止轮询
     */
    public stop(): void {
        if (!this.isRunning) {
            return;
        }

        console.log('Polling stopped.');
        this.isRunning = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * @description 随时设置或更新最大轮询次数
     * @param newMaxRetries 新的最大轮询次数
     */
    public setMaxRetries(newMaxRetries: number): void {
        if (newMaxRetries <= 0) {
            console.error('New max retries must be a positive number.');
            return;
        }
        console.log(`Max retries updated from ${this.maxRetries} to ${newMaxRetries}`);
        this.maxRetries = newMaxRetries;
    }

    /**
     * @description 随时设置或更新间歇时间
     * @param newInterval 新的间歇时间（毫秒）
     */
    public setInterval(newInterval: number): void {
        if (newInterval <= 0) {
            console.error('New interval must be a positive number.');
            return;
        }
        console.log(`Interval updated from ${this.interval}ms to ${newInterval}ms`);
        this.interval = newInterval;
    }

    /**
     * @description 核心轮询逻辑（私有方法）
     */
    private async poll(): Promise<void> {
        // 检查停止条件
        if (!this.isRunning) {
            return;
        }

        if (this.currentRetries >= this.maxRetries) {
            console.warn('Max retries reached. Stopping poll.');
            this.stop();
            return;
        }

        this.currentRetries++;
        console.log(`Polling attempt #${this.currentRetries}...`);

        try {
            // 执行回调，并等待其完成 (resolve 或 reject)
            await this.callback();
        } catch (error) {
            console.error('Polling callback rejected with error:', error);
        } finally {
            // 无论成功或失败，只要还在运行状态，就安排下一次轮询
            if (this.isRunning) {
                this.timerId = setTimeout(() => this.poll(), this.interval);
            }
        }
    }
}