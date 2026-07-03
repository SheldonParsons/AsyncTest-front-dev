import Experience from '../Experience.js'
import Environment from './Environment.js'
import Page from './Page.js'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.camera = this.experience.camera;
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.html = this.experience.html
        this.sound = this.experience.sound
        this.debug = this.experience.debug.panel

        // Wait for resources
        this.resources.on('ready', () =>
        {
            this.experience.time.start = Date.now()
            this.experience.time.elapsed = 0

            // Setup
            this.page = new Page()
            this.environment = new Environment()

            // Animation timeline
            this.animationPipeline();
        })
    }

    animationPipeline() {
        // if ( this.text )
        //     this.text.animateTextShow()

        if ( this.camera )
            this.camera.animateCameraPosition()
    }

    resize() {
        this.page.resize()
    }

    scroll()
    {
        if ( this.page )
            this.page.scroll()
    }

    update()
    {
        if(this.page)
            this.page.update()

        if(this.environment)
            this.environment.update()
    }
}
