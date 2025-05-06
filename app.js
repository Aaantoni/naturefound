const GOLDEN_SCALE = (25 / 720); // Scale for the canvas size
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2; // Golden ratio for the pentagon
const RADIUS = 10;
const DIAGONAL = 2 * RADIUS * Math.sin((2 * Math.PI) / 5); // Diagonal length of the pentagon
const LONGER_SEGMENT = DIAGONAL / GOLDEN_RATIO;
const SHORTER_SEGMENT = LONGER_SEGMENT / GOLDEN_RATIO;
const SHORTEST_SEGMENT = SHORTER_SEGMENT / GOLDEN_RATIO;
const TRIANGLE_HEIGHT = Math.sqrt(Math.pow(SHORTER_SEGMENT, 2) - Math.pow((SHORTEST_SEGMENT / 2), 2));
console.log(SHORTER_SEGMENT, TRIANGLE_HEIGHT);

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
}

class Visualizer {
    constructor(canvasId, audioManager, boundaries, scale = 25) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audioManager = audioManager;
        this.boundaries = boundaries;
        this.scale = scale;
        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth - 2; // 1px border on each side
        this.canvas.height = this.canvas.offsetHeight - 2; // 1px border on each side
        this.scale = Math.min(this.canvas.width, this.canvas.height) * GOLDEN_SCALE;
    }

    draw(discs, appListener) {
        // Clear canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Set canvas size and scale
        this.ctx.setTransform(1, 0, 0, 1, this.canvas.width / 2, this.canvas.height / 2);

        // Draw boundaries
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.scale * this.boundaries.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#666';
        this.ctx.stroke();

        // Draw soft boundary
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.scale * this.boundaries.softBoundary, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#888';
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw hard boundary
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.scale * this.boundaries.hardBoundary, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#444';
        this.ctx.stroke();

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
            this.ctx.fillText(disc.tracks[this.audioManager.currentTrack].trackTitle, disc.point.x * this.scale, disc.point.z * this.scale + 35);
        });

        // Draw listener
        this.ctx.fillStyle = '#00f';
        this.ctx.beginPath();
        this.ctx.arc(
            appListener.position.x * this.scale,
            appListener.position.z * this.scale,
            8, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Draw listener direction
        const forward = appListener.getForwardVector();
        this.ctx.beginPath();
        this.ctx.moveTo(appListener.position.x * this.scale, appListener.position.z * this.scale);
        this.ctx.lineTo(
            (appListener.position.x + forward.x) * this.scale,
            (appListener.position.z + forward.z) * this.scale
        );
        this.ctx.strokeStyle = '#00f';
        this.ctx.stroke();
    }
}

class Listener {
    constructor() {
        this.position = new Vector2D();
        this.velocity = new Vector2D();
        this.rotation = 0;
        this.rotationVelocity = 0;
        this.hitBounds = false;
    }

    update(bounds, hardBounds, keys) {
        const distanceFromCenter = this.position.length();
        const angle = Math.atan2(this.position.z, this.position.x);
        // Update velocities with random accelerations
        if (!(keys["ArrowUp"] || keys["w"] || keys["ArrowDown"] || keys["s"] ||
            keys["ArrowRight"] || keys["a"] || keys["ArrowLeft"] || keys["d"])) {
            this.velocity.add(new Vector2D(
                (Math.random() - 0.5) * 0.005,
                (Math.random() - 0.5) * 0.005
            ));
            this.rotationVelocity += (Math.random() - 0.5) * 0.005;

            if (distanceFromCenter > bounds) {
                this.position.add(this.getCenterVector().scale(-0.01));
                this.hitBounds = true;
            } else if (this.hitBounds) {
                this.position.add(this.getCenterVector().scale(-0.01));
            }

            if (distanceFromCenter <= 1) {
                this.hitBounds = false;
            }

            // Apply damping
            this.velocity.scale(0.97);
            this.rotationVelocity *= 0.97;

            // Update position and rotation
            this.position.add(this.velocity);
            this.rotation += this.rotationVelocity;
        } else {
            // Update velocities based on key presses
            if (keys["ArrowUp"] || keys["w"]) {
                this.position.add(this.getForwardVector().scale(0.01));
            }
            if (keys["ArrowDown"] || keys["s"]) {
                this.position.add(this.getForwardVector().scale(-0.01));
            }
            if (keys["ArrowLeft"] || keys["a"]) {
                this.rotation += 0.01;
            }
            if (keys["ArrowRight"] || keys["d"]) {
                this.rotation -= 0.01;
            }
        }

        // Keep within bounds
        if (distanceFromCenter > hardBounds) {
            this.position = this.getCenterVector().scale(hardBounds);
            this.velocity.scale(-0.5);
        }
    }

    getForwardVector() {
        return new Vector2D(Math.sin(this.rotation), Math.cos(this.rotation));
    }

    getCenterVector() {
        const angle = Math.atan2(this.position.z, this.position.x);
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }
}

class AudioManager {
    constructor(context, discs) {
        this.context = context;
        this.discs = discs;
        this.currentTrack = 0;
        this.timeUpdateListener = null;
        this.endedListener = null;
        this.setupPanners();
        this.currentSources = [];
        this.nextSources = [];
        // this.ready = this.init();
        this.nextPrepared = false;
    }

    async init() {
        this.currentSources = await this.setupSources();
        this.setup();
    }

    setupPanners() {
        this.discs.forEach(disc => {
            disc.panner = new PannerNode(this.context, {
                positionX: disc.point.x,
                positionY: 0,
                positionZ: disc.point.z,
                refDistance: SHORTER_SEGMENT,
                maxDistance: 2 * SHORTER_SEGMENT,
                rolloffFactor: 1,
                distanceModel: 'linear',
                panningModel: 'HRTF'
            });
        });
    }

    async setupSources(track = this.currentTrack) {
        const sources = await Promise.all(this.discs.map(async disc => {
            const blobUrl = URL.createObjectURL(disc.tracks[track].file);
            const audioFile = new Audio();
            audioFile.src = blobUrl;

            try {
                await new Promise((resolve, reject) => {
                    const onError = () => {
                        URL.revokeObjectURL(blobUrl);
                        reject(new Error(`Failed to load audio track ${track}`));
                    };

                    audioFile.addEventListener('canplaythrough', () => {
                        URL.revokeObjectURL(blobUrl);
                        resolve();
                    }, { once: true });

                    audioFile.addEventListener('error', onError, { once: true });
                    audioFile.crossOrigin = 'anonymous';
                    audioFile.preload = 'auto';
                });

                const source = this.context.createMediaElementSource(audioFile);
                return source;
            } catch (error) {
                console.error(error);
                // Clean up on error
                audioFile.src = '';
                audioFile.load();
                throw error;
            }
        }));
        return sources;
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

    async prepareNextSources(track = (this.currentTrack + 1) % 4) {
        this.nextSources = await this.setupSources(track);
    }

    async playNextSources(sources = this.nextSources, ended = false) {
        this.setup(sources);
        this.cleanupAudio(ended);
        this.currentSources = sources;
        this.currentTrack = (this.currentTrack + 1) % 4;
        this.nextSources = [];
        await this.play();
    }

    async play() {
        await Promise.all(this.currentSources.map(source => {
            return source.mediaElement.play().catch(console.error);
        }));
        this.nextPrepared = false;
        if (this.timeUpdateListener) {
            this.currentSources.forEach(source => {
                source.mediaElement.removeEventListener('timeupdate', this.timeUpdateListener);
            });
        }
        this.timeUpdateListener = async () => {
            const media = this.currentSources[0].mediaElement;
            if (!this.nextPrepared && media.currentTime >= media.duration - 12) {
                this.nextPrepared = true;
                await this.prepareNextSources();
            }
        };
        this.endedListener = async () => {
            if (!this.nextPrepared) {
                await this.prepareNextSources();
            }
            await this.playNextSources(this.nextSources, true);
        };
        this.currentSources.forEach(source => {
            source.mediaElement.addEventListener('timeupdate', this.timeUpdateListener);
            source.mediaElement.addEventListener('ended', this.endedListener, { once: true});
        });
    }

    async pause() {
        await Promise.all(this.currentSources.map(source => {
            return source.mediaElement.pause();
        }));
    }

    async next() {
        await this.prepareNextSources();
        await this.playNextSources();
    }

    cleanupAudio(ended = false, all = false) {
        if (this.timeUpdateListener) {
            this.currentSources.forEach(source => {
                source.mediaElement.removeEventListener('timeupdate', this.timeUpdateListener);
            });
        }
        this.currentSources.forEach(source => {
            if (!ended) {
                source.mediaElement.pause();
            }
            source.disconnect();
            source.mediaElement.src = '';
            source.mediaElement.load(); // Load the empty source to force reset the audio element and free up memory
        });
        if (all) {
            this.nextSources.forEach(source => {
                source.mediaElement.src = '';
                source.mediaElement.load();
            });
        }
    }

    cleanupPanners() {
        this.discs.forEach(disc => {
            disc.panner.disconnect();
        });
    }

    destroy() {
        this.cleanupAudio(false, true);
        this.cleanupPanners();
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

        this.radius = RADIUS;
        this.boundaryRadius = this.radius / (GOLDEN_RATIO * GOLDEN_RATIO);
        this.hardBoundaryRadius = this.boundaryRadius * 4;
        this.calculatePentagonPoints();

        this.boundaries = {
            "radius": this.radius,
            "softBoundary": this.boundaryRadius,
            "hardBoundary": this.hardBoundaryRadius
        };

        this.audioManager = new AudioManager(this.audioContext, this.discs);
        this.appListener = new Listener();
        this.visualizer = new Visualizer('visualizer', this.audioManager, this.boundaries);

        this.animationFrameId = null;
        this.isPlaying = false;

        this.keys = [];
        this.setupKeys();

        this.setupEventListeners();

        this.visualizer.draw(this.discs, this.appListener);
    }

    calculatePentagonPoints() {
        for (let i = 0; i < 5; i++) {
            const angle = (((i * 2 * Math.PI) + Math.PI) / 5 + Math.PI / 4) * 2;
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
                this.discs[discIndex].tracks[trackIndex].file = file;
            }
        }
        return this.discs;
    }

    setupEventListeners() {
        window.addEventListener('load', () => {
            this.visualizer.resize();
            this.visualizer.draw(this.discs, this.appListener);
        });
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', async () => {
            this.discs = this.createAudioSources(fileInput.files);
            await this.audioManager.init();
            document.getElementById('startButton').disabled = false;
            document.getElementById('nextButton').disabled = false;
        });
        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('stopButton').addEventListener('click', () => this.stop());
        document.getElementById('nextButton').addEventListener('click', () => this.next());
        window.addEventListener('beforeunload', () => {
            if (this.audioManager) {
                this.audioManager.destroy();
            }
        });
    }

    setupKeys() {
        window.addEventListener('keydown', (event) => {
            this.keys[event.key] = true;
        });
        window.addEventListener('keyup', (event) => {
            this.keys[event.key] = false;
        });
    }

    updateAudioListener() {
        const audioListener = this.audioContext.listener;
        const currentTime = this.audioContext.currentTime;
        const forward = this.appListener.getForwardVector();

        audioListener.positionX.setValueAtTime(this.appListener.position.x, currentTime);
        audioListener.positionY.setValueAtTime(0, currentTime);
        audioListener.positionZ.setValueAtTime(this.appListener.position.z, currentTime);

        audioListener.forwardX.setValueAtTime(forward.x, currentTime);
        audioListener.forwardY.setValueAtTime(0, currentTime);
        audioListener.forwardZ.setValueAtTime(forward.z, currentTime);

        audioListener.upX.setValueAtTime(0, currentTime);
        audioListener.upY.setValueAtTime(1, currentTime);
        audioListener.upZ.setValueAtTime(0, currentTime);
    }

    update() {
        this.appListener.update(this.boundaryRadius, this.hardBoundaryRadius, this.keys);
        this.updateAudioListener();
        this.visualizer.resize();
        this.visualizer.draw(this.discs, this.appListener);

        if (this.isPlaying) {
            this.animationFrameId = requestAnimationFrame(() => this.update());
        }
    }

    async start() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        if (!this.isPlaying) {
            await this.audioManager.play();
            this.isPlaying = true;
            this.update();
            document.getElementById('startButton').disabled = true;
            document.getElementById('stopButton').disabled = false;
        }
    }

    async stop() {
        if (this.isPlaying) {
            await this.audioManager.pause();
            this.isPlaying = false;
            cancelAnimationFrame(this.animationFrameId);
            document.getElementById('startButton').disabled = false;
            document.getElementById('stopButton').disabled = true;
        }
    }

    async next() {
        if (this.isPlaying) {
            await this.audioManager.next();
        }
    }

    async destroy() {
        if (this.audioManager) {
            this.audioManager.destroy();
        }
        if (this.audioContext) {
            await this.audioContext.close();
        }
    }
}

// Initialize the experience
const app = new NatureDenaturedAndFoundAgain();
