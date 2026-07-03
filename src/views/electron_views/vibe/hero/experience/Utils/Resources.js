import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import EventEmitter from './EventEmitter.js'

export default class Resources extends EventEmitter
{
    constructor(sources)
    {
        super()

        this.sources = sources

        this.items = {}
        this.toLoad = this.sources.length
        this.loaded = 0
        this.loadedAll = false

        this.setLoaders()
        this.startLoading()
    }

    setLoaders()
    {
        this.loaders = {}
        this.loaders.gltfLoader = new GLTFLoader()
        this.loaders.objLoader = new OBJLoader()
        this.loaders.stlLoader = new STLLoader()
        this.loaders.textureLoader = new THREE.TextureLoader()
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
        this.loaders.RGBELoader = new RGBELoader()
        this.loaders.fontLoader = new FontLoader()
        this.loaders.AudioLoader = new THREE.AudioLoader()
    }

    startLoading()
    {
        // Load each source
        for(const source of this.sources)
        {
            if(source.type === 'gltfModel')
            {
                this.loaders.gltfLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if(source.type === 'objModel')
            {
                this.loaders.objLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if(source.type === 'stlModel')
            {
                // STLLoader resolves with a plain BufferGeometry (no scene
                // graph, no node transforms) — different shape than
                // gltfModel/objModel results, handled in Page.js.
                this.loaders.stlLoader.load(
                    source.path,
                    (geometry) =>
                    {
                        this.sourceLoaded(source, geometry)
                    }
                )
            }
            else if(source.type === 'positionBin')
            {
                // 预烘焙的粒子位置（Float32 xyz，见 scripts/bake-particles.mjs）。
                // 建成 BufferGeometry（isBufferGeometry=true）→ 走 Page.js
                // getModelMeshData 的 BufferGeometry 分支（与 STL 同路），
                // 之后 normalizeGeometry / 旋转 / makeColoredTexture / 256×256 全不变。
                fetch(source.path)
                    .then((res) =>
                    {
                        if(!res.ok) throw new Error(`HTTP ${res.status} @ ${source.path}`)
                        return res.arrayBuffer()
                    })
                    .then((buf) =>
                    {
                        const geometry = new THREE.BufferGeometry()
                        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf), 3))
                        this.sourceLoaded(source, geometry)
                    })
                    .catch((err) => console.error('[Resources] positionBin 加载失败', source.path, err))
            }
            else if(source.type === 'texture')
            {
                this.loaders.textureLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if(source.type === 'cubeTexture')
            {
                this.loaders.cubeTextureLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if(source.type === 'rgbeTexture')
            {
                this.loaders.RGBELoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if(source.type === 'font')
            {
                this.loaders.fontLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if(source.type === 'audio')
            {
                this.loaders.AudioLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
        }

        if(this.sources.length === 0) {
            setTimeout(() => {
                this.loadedAll = true
                this.trigger('ready')
            });
        }
    }

    sourceLoaded(source, file)
    {
        this.items[source.name] = file

        this.loaded++

        if(this.loaded === this.toLoad)
        {
            this.loadedAll = true
            this.trigger('ready')
        }
    }
}
