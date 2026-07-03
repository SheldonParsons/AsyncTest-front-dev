import * as THREE from 'three'

import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import World from './World/World.js'
import Resources from './Utils/Resources.js'
import Sound from "./Utils/Sound.js";

import sources from './sources.js'
import gsap from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";

let instance = null

export default class Experience
{
    constructor(_canvas)
    {
        // Singleton
        if(instance)
        {
            return instance
        }
        instance = this

        // Options
        this.targetElement = _canvas

        if(!this.targetElement)
        {
            console.warn('Missing \'targetElement\' property')
            return
        }


        /**
         * Default code to prevent double click to select text
         */
        this.setDefaultCode();
        this.setConfig()

        this.isMobile = isMobile.any()

        // Global access
        window.experience = this

        // Html Elements
        this.html = {}

        // Resources
        this.resources = new Resources(sources)

        // Options
        THREE.ColorManagement.enabled = false
        this.canvas = _canvas

        // Setup
        this.timeline = gsap.timeline({
            paused: true,
        });
        this.debug = new Debug()
        this.sizes = new Sizes()
        this.time = new Time()
        this.cursor = { x: 0, y: 0 }
        this.scene = new THREE.Scene()
        this.camera = new Camera()
        this.renderer = new Renderer()
        this.sound = new Sound()
        this.world = new World()




        // Resize event
        this.sizes.on('resize', () =>
        {
            this.resize()
        })

        // Time tick event
        this.time.on('tick', () =>
        {
            this.update()
            this.debug.stats && this.debug.stats.update();
        })

        // 自身挂在 window 上的监听也走 AbortController，destroy 时统一移除。
        this._ac = new AbortController()
        const _signal = this._ac.signal

        // Mouse move event
        window.addEventListener('mousemove', (event) =>
        {
            this.cursor.x = event.clientX / this.sizes.width * 2 - 1
            this.cursor.y = - (event.clientY / this.sizes.height) * 2 + 1
        }, { signal: _signal })

        // Scroll
        window.addEventListener('scroll', () =>
        {
            this.scroll()
        }, { signal: _signal })

    }

    resize()
    {
        this.camera.resize()
        this.world.resize()
        this.renderer.resize()
        //this.sound.resize()
    }

    scroll()
    {
        this.world.scroll()
    }

    update()
    {
        if ( this.debug.active )
            this.debug.panel.refresh()
        this.timeline.time(this.time.elapsed);
        this.world.update()
        this.camera.update()

        this.renderer.update()
    }

    setDefaultCode(){
        window.isMobile = {
            Android: function() {
                return navigator.userAgent.match(/Android/i);
            },
            BlackBerry: function() {
                return navigator.userAgent.match(/BlackBerry/i);
            },
            iOS: function() {
                return navigator.userAgent.match(/iPhone|iPad|iPod/i);
            },
            Opera: function() {
                return navigator.userAgent.match(/Opera Mini/i);
            },
            Windows: function() {
                return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
            },
            any: function() {
                return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
            }
        };


        document.ondblclick = function (e) {
            e.preventDefault()
        }

        gsap.registerPlugin(MotionPathPlugin);
    }

    setConfig()
    {
        this.config = {}

        // Debug
        this.config.debug = window.location.hash === '#debug'

        // Pixel ratio
        this.config.pixelRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2)

        // Width and height
        const boundings = this.targetElement.getBoundingClientRect()
        this.config.width = boundings.width
        this.config.height = boundings.height || window.innerHeight
    }

    destroy()
    {
        // 1) 停 RAF + 移除全部全局监听（自身 / Sizes / Page 三处）
        this.time && this.time.stop()
        this._ac && this._ac.abort()
        this.sizes && this.sizes.off('resize')
        this.sizes && this.sizes.destroy && this.sizes.destroy()
        this.time && this.time.off('tick')
        this.world && this.world.page && this.world.page.destroy && this.world.page.destroy()

        // 2) dispose 场景资源
        this.scene && this.scene.traverse((child) =>
        {
            if(child instanceof THREE.Mesh)
            {
                child.geometry && child.geometry.dispose()
                for(const key in child.material)
                {
                    const value = child.material[key]
                    if(value && typeof value.dispose === 'function')
                    {
                        value.dispose()
                    }
                }
            }
        })

        this.camera && this.camera.controls && this.camera.controls.dispose && this.camera.controls.dispose()
        this.renderer && this.renderer.instance && this.renderer.instance.dispose()

        if(this.debug && this.debug.active && this.debug.ui)
            this.debug.ui.destroy()

        // 3) 置空单例 + 全局引用，让下次挂载能重新 new（否则返回已销毁的旧实例）
        instance = null
        try { delete window.experience } catch (e) { window.experience = null }
    }
}
