import * as THREE from 'three'
import Experience from '../Experience.js'

export default class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.time = this.experience.time

        this.scene.colorSpace = THREE.SRGBColorSpace
        //this.scene.background = new THREE.Color('#ffffff')

        this.setAmbientLight()
        this.setDirectionalLight()
        this.setStarfield()

        this.setDebug()
    }

    // Decorative background dust scattered across the whole viewport at
    // varying depths and sizes — purely atmospheric, not tied to scroll or
    // the morph sequence. Three size tiers (small/medium/large point
    // counts skew small so it doesn't read as "one size = monotonous").
    //
    // IMPORTANT: uses NormalBlending, not Additive. Renderer.js runs
    // UnrealBloomPass with threshold=0 (everything blooms) and a high
    // strength (2.2) — additive-blended points stack brightness on top of
    // each other and on top of that bloom, and a few hundred of them
    // spread across the whole frustum was enough to blow the entire frame
    // out to solid white. NormalBlending + modest opacity keeps them
    // visible without wrecking the overall exposure.
    //
    // Sprite shape: a bare THREE.PointsMaterial with no `map` renders each
    // point as a hard-edged SQUARE, which reads as noticeably "bigger" and
    // chunkier on screen than a soft dot of the same nominal size — a live
    // screenshot showed them as scattered white squares even after two
    // rounds of size cuts. Generating a small radial-gradient canvas
    // texture and using it as the sprite makes them read as fine soft
    // dust instead, so they can shrink further without just disappearing.
    setStarfield() {
        this.starTiers = []

        // Sized down again (third round of feedback) — if still too big,
        // these are the first numbers to shrink further.
        const tiers = [
            { count: 220, size: 0.035, opacity: 0.4 },
            { count: 90,  size: 0.06,  opacity: 0.5 },
            { count: 25,  size: 0.1,   opacity: 0.6 },
        ]

        const dotTexture = this.makeSoftDotTexture()

        // Scattered in a big box around the origin/camera — camera sits
        // near (0,0,-4) looking toward +Z, main particle content lives
        // roughly within [-1.5, 1.5] on each axis, so this box is
        // deliberately much larger to cover the full screen at varying
        // depth without clumping only around the model.
        const boxX = 8, boxY = 4.5, boxZ = 10

        for (const tier of tiers) {
            const positions = new Float32Array(tier.count * 3)

            for (let i = 0; i < tier.count; i++) {
                positions[i * 3 + 0] = (Math.random() - 0.5) * boxX * 2
                positions[i * 3 + 1] = (Math.random() - 0.5) * boxY * 2
                positions[i * 3 + 2] = (Math.random() - 0.5) * boxZ * 2 - 1
            }

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

            const material = new THREE.PointsMaterial({
                color: '#ffffff',
                map: dotTexture,
                alphaMap: dotTexture,
                size: tier.size,
                sizeAttenuation: true,
                transparent: true,
                opacity: tier.opacity,
                depthWrite: false,
                blending: THREE.NormalBlending,
            })

            const points = new THREE.Points(geometry, material)
            this.scene.add(points)

            this.starTiers.push({ points, material, baseOpacity: tier.opacity, phase: Math.random() * Math.PI * 2 })
        }
    }

    // Small (32x32) radial-gradient canvas texture: opaque white center
    // fading to transparent at the edge. Used as both `map` and `alphaMap`
    // on the starfield PointsMaterial so points render as soft dots
    // instead of PointsMaterial's default hard-edged square sprite.
    makeSoftDotTexture() {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
        gradient.addColorStop(0, 'rgba(255,255,255,1)')
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.6)')
        gradient.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, size, size)
        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
    }

    update() {
        if (!this.starTiers || !this.time) return

        // Gentle whole-field twinkle — cheap (one sine per tier, not per
        // point) but still gives the starfield a bit of life.
        for (const tier of this.starTiers) {
            const flicker = 0.85 + 0.15 * Math.sin(this.time.elapsed * 0.6 + tier.phase)
            tier.material.opacity = tier.baseOpacity * flicker
        }
    }

    setAmbientLight() {
        this.ambientLight = new THREE.AmbientLight('#ffffff', 0.05)
        this.scene.add(this.ambientLight)
    }

    setDirectionalLight() {
        this.directionalLight = new THREE.DirectionalLight('#ffffff', .1)
        this.directionalLight.position.set(0.25, 0.25, 0.25)
        this.scene.add(this.directionalLight)
    }

    setEnvironmentMap()
    {

    }

    setDebug() {
        if(this.debug.active) {

        }
    }
}
