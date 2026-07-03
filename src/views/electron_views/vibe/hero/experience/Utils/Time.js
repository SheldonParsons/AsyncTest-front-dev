import EventEmitter from './EventEmitter.js'

export default class Time extends EventEmitter
{
    constructor()
    {
        super()

        // Setup
        this.start = Date.now()
        this.current = this.start
        this.playing = true
        this.elapsed = 0
        this.delta = 0.016

        this._raf = window.requestAnimationFrame(() =>
        {
            this.tick()
        })
    }

    // 卸载时停掉 RAF 循环（否则渲染循环永远跑、烧 CPU/GPU）
    stop()
    {
        this.playing = false
        if (this._raf) cancelAnimationFrame(this._raf)
    }

    tick()
    {
        if (!this.playing) return
        const currentTime = Date.now()
        this.delta = Math.min( (currentTime - this.current) * 0.001, 0.016)
        this.current = currentTime
        this.elapsed = (this.current - this.start) * 0.001

        if(this.delta > 0.06)
        {
            this.delta = 0.06
        }

        this.trigger('tick')

        window.requestAnimationFrame(() =>
        {
            this.tick()
        })
    }
}
