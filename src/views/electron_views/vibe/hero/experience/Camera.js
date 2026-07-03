import * as THREE from 'three'
import Experience from './Experience.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from "gsap";

export default class Camera
{
    constructor()
    {
        this.experience = new Experience()
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.time = this.experience.time
        this.canvas = this.experience.canvas
        this.timeline = this.experience.timeline
        this.cursorEnabled = false

        this.lerpVector = new THREE.Vector3();

        this.setInstance()
        this.setControls()
    }

    setInstance()
    {
        this.instance = new THREE.PerspectiveCamera(45, this.sizes.width / this.sizes.height, 0.1, 10000)
        this.defaultCameraPosition = new THREE.Vector3(0, 0, -4);

        this.instance.position.copy(this.defaultCameraPosition)
        this.instance.lookAt(new THREE.Vector3(0, 0, 0));

        this.lerpVector.copy(this.instance.position);

        this.scene.add(this.instance)
    }

    setControls()
    {
        this.controls = new OrbitControls(this.instance, this.canvas)
        this.controls.enableDamping = true
        this.controls.minDistance = 0;
        this.controls.maxDistance = 2000;
        this.controls.target = new THREE.Vector3(0, 0, 0);

        // Disabled: this site's camera is fully scripted (scroll-driven
        // morph + cursor-sway dolly in Page.js update()), there's no
        // legitimate user-driven orbit/pan/zoom here. Leaving OrbitControls
        // *enabled* was a real bug — it attaches its own left-drag-rotate
        // and wheel-zoom listeners to the same canvas that Page.js
        // independently drives with pointerdown/pointermove (click-wave,
        // hover glow) and wheel (paginated scroll) listeners.
        this.controls.enabled = false;
    }

    resize()
    {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    update()
    {
        // NOT calling this.controls.update() anymore — this was the actual
        // bug behind "cameraOffsetX has zero visible effect" in Page.js.
        // `enabled = false` only gates OrbitControls' mouse/wheel input
        // handlers; its update() method has NO such check and unconditionally
        // ends with `scope.object.lookAt(scope.target)` every single call
        // (see node_modules/three/examples/jsm/controls/OrbitControls.js,
        // inside the closure returned by `this.update = function () {...}`).
        // That means every frame was re-aiming the camera dead-center at
        // the origin regardless of how far Page.js moved camera.position.x
        // — completely overriding the scripted dolly, every frame, with no
        // trace of it in Page.js itself. Since OrbitControls is fully
        // disabled and unused for interaction, its update() serves no
        // purpose here and is simply skipped.
        this.instance.updateMatrixWorld() // To be used in projection
    }

    animateCameraPosition() {

    }
}
