class Vector2D {
    constructor(x = 0, z = 0) {
        this.x = x;
        this.z = z;
    }

    add(other) {
        this.x += other.x;
        this.z += other.z;
        return this;
    }

    scale(factor) {
        this.x *= factor;
        this.z *= factor;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.z * this.z);
    }

    normalize() {
        const len = this.length();
        if (len > 0) {
            this.x /= len;
            this.z /= len;
        }
        return this;
    }

    clone() {
        return new Vector2D(this.x, this.z);
    }
}

class Listener {
    constructor() {
        this.position = new Vector2D();
        this.velocity = new Vector2D();
        this.rotation = 0;
        this.rotationVelocity = 0;
    }

    update(bounds) {
        // Update velocities with random accelerations
        this.velocity.add(new Vector2D(
            (Math.random() - 0.5) * 0.005,
            (Math.random() - 0.5) * 0.005
        ));
        this.rotationVelocity += (Math.random() - 0.5) * 0.005;

        // Apply damping
        this.velocity.scale(0.97);
        this.rotationVelocity *= 0.97;

        // Update position and rotation
        this.position.add(this.velocity);
        this.rotation += this.rotationVelocity;

        // Keep within bounds
        const distanceFromCenter = this.position.length();
        if (distanceFromCenter > bounds) {
            const angle = Math.atan2(this.position.z, this.position.x);
            this.position.x = bounds * Math.cos(angle);
            this.position.z = bounds * Math.sin(angle);
            this.velocity.scale(-0.5);
        }
    }

    getForwardVector() {
        return new Vector2D(Math.sin(this.rotation), Math.cos(this.rotation));
    }
}

class AudioManager {
    constructor(context, discs) {
        this.context = context;
        this.discs = discs;
        this.currentTrack = 0;
        this.setupPanners();
        this.currentSources = this.setupSources();
        this.nextSources = [];
        this.setup();
    }
    setupPanners() {
        this.discs.forEach(disc => {
            disc.panner = new PannerNode(this.context, {
                positionX: disc.point.x,
                positionY: 0,
                positionZ: disc.point.z,
                refDistance: 1,
                maxDistance: 15,
                rolloffFactor: 1,
                distanceModel: 'inverse',
                panningModel: 'HRTF'
            });
        });
    }
    setupSources(track = this.currentTrack) {
        return this.discs.map(disc => {
            const audioFile = new Audio(disc.tracks[track].file);
            return this.context.createMediaElementSource(audioFile);
        });
    }
    setup(sources = this.currentSources) {
        this.discs.forEach((disc, index) => {
            // If there is already a source connected to the panner, disconnect it
            if (disc.panner.numberOfInputs > 0) {
                disc.panner.disconnect();
            }
            sources[index].connect(disc.panner).connect(this.context.destination);
        });
    }
    play() {
        this.currentSources.forEach(source => {
            source.mediaElement.play().catch(console.error);
        });
        // Every track is exactly the same length, so we can use the first one to determine when to switch tracks
        this.currentSources[0].mediaElement.addEventListener('timeupdate', () => {
            if (this.currentSources[0].mediaElement.currentTime >= this.currentSources[0].mediaElement.duration - 12) {
                this.nextSources = this.setupSources((this.currentTrack + 1) % 4);
            }
        });
        this.currentSources[0].mediaElement.addEventListener('ended', () => {
            this.setup(this.nextSources);
            this.currentSources = this.nextSources;
            this.currentTrack = (this.currentTrack + 1) % 4;
            this.nextSources = [];
            this.play();
        });
    }
    pause() {
        this.currentSources.forEach(source => {
            source.mediaElement.pause();
        });
    }
}

class Visualizer {
    constructor(canvasId, scale = 40) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = scale;
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    draw(discs, listener) {
        this.resize();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Draw pentagon
        this.ctx.beginPath();
        this.ctx.moveTo(discs[0].point.x * this.scale, discs[0].point.z * this.scale);
        for (let i = 1; i < discs.length; i++) {
            this.ctx.lineTo(discs[i].point.x * this.scale, discs[i].point.z * this.scale);
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = '#666';
        this.ctx.stroke();

        // Draw sound sources
        discs.forEach(disc => {
            this.ctx.fillStyle = '#f00';
            this.ctx.beginPath();
            this.ctx.arc(disc.point.x * this.scale, disc.point.z * this.scale, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(disc.discName, disc.point.x * this.scale, disc.point.z * this.scale + 20);
        });

        // Draw listener
        this.ctx.fillStyle = '#00f';
        this.ctx.beginPath();
        this.ctx.arc(
            listener.position.x * this.scale,
            listener.position.z * this.scale,
            8, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Draw listener direction
        const forward = listener.getForwardVector();
        this.ctx.beginPath();
        this.ctx.moveTo(listener.position.x * this.scale, listener.position.z * this.scale);
        this.ctx.lineTo(
            (listener.position.x + forward.x) * this.scale,
            (listener.position.z + forward.z) * this.scale
        );
        this.ctx.strokeStyle = '#00f';
        this.ctx.stroke();

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

class NatureDenaturedAndFoundAgain {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        this.discs = [
            {
                "discName": "Fissures in Green (2011)",
                "tracks": [
                    { "trackTitle": "Rain at the Station", file: null },
                    { "trackTitle": "Still Life with Cicadas, Waterfall and Radu", file: null },
                    { "trackTitle": "Silent Prayer", file: null },
                    { "trackTitle": "Langhalsen", file: null },
                ],
                "point": null,
                "panner": null,
            },
            {
                "discName": "Pathsplitter (Yellow-Red) (2012)",
                "tracks": [
                    { "trackTitle": "Canon a2", file: null },
                    { "trackTitle": "Canon a3", file: null },
                    { "trackTitle": "Canon a4", file: null },
                    { "trackTitle": "Canon a5", file: null },
                ],
                "point": null,
                "panner": null,
            },
            {
                "discName": "Landscape in Black and Grey (2013)",
                "tracks": [
                    { "trackTitle": "The Chords of the Grosse Mühl", file: null },
                    { "trackTitle": "Six-Part Panorama", file: null },
                    { "trackTitle": "Building a World", file: null },
                    { "trackTitle": "The Disappearance of a World", file: null },
                ],
                "point": null,
                "panner": null,
            },
            {
                "discName": "White Light Under the Door (2014)",
                "tracks": [
                    { "trackTitle": "Electricity", file: null },
                    { "trackTitle": "Heat", file: null },
                    { "trackTitle": "Light", file: null },
                    { "trackTitle": "Gas", file: null },
                ],
                "point": null,
                "panner": null,
            },
            {
                "discName": "Hellgrün (Small New World) (2015)",
                "tracks": [
                    { "trackTitle": "Malachite", file: null },
                    { "trackTitle": "Bird Warnings", file: null },
                    { "trackTitle": "The River is a Green-Brown God", file: null },
                    { "trackTitle": "Emerald Twilight", file: null },
                ],
                "point": null,
                "panner": null,
            }
        ];

        this.radius = 5;
        this.boundaryRadius = this.radius * 0.6667;
        this.calculatePentagonPoints();

        this.audioManager = null;
        this.listener = new Listener();
        this.visualizer = new Visualizer('visualizer');

        this.animationFrameId = null;
        this.isPlaying = false;

        this.setupEventListeners();

        this.visualizer.draw(this.discs, this.listener);
    }

    calculatePentagonPoints() {
        for (let i = 0; i < 5; i++) {
            const angle = ((i * 2 * Math.PI) / 5 - Math.PI / 4) * 2;
            this.discs[i].point = new Vector2D(
                this.radius * Math.cos(angle),
                this.radius * Math.sin(angle)
            );
        }
    }

    createAudioSources(files) {
        for (let file of files) {
            const match = /^([1-5])\.0?([1-4])/.exec(file.name);
            if (match) {
                const discIndex = +(parseInt(match[1]) - 1);
                const trackIndex = +(parseInt(match[2]) - 1);
                this.discs[discIndex].tracks[trackIndex].file = URL.createObjectURL(file);
            }
        }
        return this.discs;
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', () => {
            this.discs = this.createAudioSources(fileInput.files);
            this.audioManager = new AudioManager(this.audioContext, this.discs);
            document.getElementById('startButton').disabled = false;
        });
        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('stopButton').addEventListener('click', () => this.stop());
        window.addEventListener('load', () => {
            this.visualizer.resize();
            this.visualizer.draw(this.discs, this.listener);
        });
    }

    updateAudioListener() {
        const listener = this.audioContext.listener;
        const currentTime = this.audioContext.currentTime;
        const forward = this.listener.getForwardVector();

        listener.positionX.setValueAtTime(this.listener.position.x, currentTime);
        listener.positionY.setValueAtTime(0, currentTime);
        listener.positionZ.setValueAtTime(this.listener.position.z, currentTime);

        listener.forwardX.setValueAtTime(forward.x, currentTime);
        listener.forwardY.setValueAtTime(0, currentTime);
        listener.forwardZ.setValueAtTime(forward.z, currentTime);

        listener.upX.setValueAtTime(0, currentTime);
        listener.upY.setValueAtTime(1, currentTime);
        listener.upZ.setValueAtTime(0, currentTime);
    }

    update() {
        this.listener.update(this.boundaryRadius);
        this.updateAudioListener();
        this.visualizer.draw(this.discs, this.listener);

        if (this.isPlaying) {
            this.animationFrameId = requestAnimationFrame(() => this.update());
        }
    }

    async start() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        if (!this.isPlaying) {
            this.audioManager.play();
            this.isPlaying = true;
            this.update();
            document.getElementById('startButton').disabled = true;
            document.getElementById('stopButton').disabled = false;
        }
    }

    stop() {
        if (this.isPlaying) {
            this.audioManager.stop();
            this.isPlaying = false;
            cancelAnimationFrame(this.animationFrameId);
            document.getElementById('startButton').disabled = false;
            document.getElementById('stopButton').disabled = true;
        }
    }
}

// Initialize the experience
const app = new NatureDenaturedAndFoundAgain();
