const GOLDEN_SCALE = (20 / 720); // 20 at 720 canvas width
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2; // Golden ratio for the pentagon
const RADIUS = 10;
const DIAGONAL = 2 * RADIUS * Math.sin((2 * Math.PI) / 5); // Diagonal length of the pentagon
const LONGER_SEGMENT = DIAGONAL / GOLDEN_RATIO;
const SHORTER_SEGMENT = LONGER_SEGMENT / GOLDEN_RATIO;
const SHORTEST_SEGMENT = SHORTER_SEGMENT / GOLDEN_RATIO;

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
    constructor(canvasId, audioManager, boundaries, discs, scale = 8) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audioManager = audioManager;
        this.boundaries = boundaries;
        this.scale = scale;
        this.discs = discs;
        this.resize();
        this.hiddenTitles = new Set();
        this.setupInteraction();
    }

    setupInteraction() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick(e.touches[0]);
        });
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left - this.canvas.width / 2;
        const y = event.clientY - rect.top - this.canvas.height / 2;
        console.log(`Click at: (${x}, ${y})`);
        const worldX = x / this.scale;
        const worldZ = y / this.scale;
        this.discs.forEach((disc, index) => {
            const dx = disc.point.x - worldX;
            const dz = disc.point.z - worldZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            console.log(`Disc ${index} distance: ${distance * this.scale}`);
            if (distance * this.scale < 50) {
                if (!this.hiddenTitles.has(index)) {
                    this.hiddenTitles.add(index);
                } else {
                    this.hiddenTitles.delete(index);
                }
            }
        });
        console.log(this.hiddenTitles);
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth - 2; // 1px border on each side
        this.canvas.height = this.canvas.offsetHeight - 2; // 1px border on each side
        // get viewport width
        const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const minScale = 8;
        const maxScale = 20;
        const minWidth = 360;
        const maxWidth = 1440;
        this.scale = minScale + (maxScale - minScale) * (viewportWidth - minWidth) / (maxWidth - minWidth);
        this.scale = Math.min(Math.max(this.scale, minScale), maxScale); // Clamp between min and max
    }

    draw(appListener) {
        // Clear canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Set canvas size and scale
        this.ctx.setTransform(1, 0, 0, 1, this.canvas.width / 2, this.canvas.height / 2);

        // Draw soft boundary
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.scale * this.boundaries.softBoundary, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffffff08';
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw hard boundary
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.scale * this.boundaries.hardBoundary, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffffff10';
        this.ctx.stroke();

        // Draw sound sources
        this.discs.forEach((disc, index) => {
            const loudness = this.audioManager.getLoudness(index);
            this.ctx.fillStyle = '#f00';
            this.ctx.beginPath();
            this.ctx.arc(disc.point.x * this.scale, disc.point.z * this.scale, 5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.save();
            this.ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
            this.ctx.shadowBlur = this.scale;
            this.ctx.filter = `blur(${this.scale}px)`;
            this.ctx.globalAlpha = 0.25;

            this.ctx.beginPath();
            this.ctx.arc(disc.point.x * this.scale, disc.point.z * this.scale, loudness * SHORTEST_SEGMENT * this.scale, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.filter = 'none';
            this.ctx.globalAlpha = 1;
            this.ctx.restore();

            if (!this.hiddenTitles.has(index)) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'italic 1em Libre Baskerville';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(disc.discName, disc.point.x * this.scale, disc.point.z * this.scale + 12 + this.scale);
                this.ctx.fillText(`(${disc.year})`, disc.point.x * this.scale, disc.point.z * this.scale + 12 + this.scale * 2);
                this.ctx.fillText(disc.tracks[this.audioManager.currentTrack].trackTitle, disc.point.x * this.scale, disc.point.z * this.scale + 12 + this.scale * 3);
            }
        });

        // Draw listener pointer
        this.ctx.fillStyle = '#4f5941';
        const px = appListener.position.x * this.scale;
        const pz = appListener.position.z * this.scale;
        const forward = appListener.getForwardVector();
        // normalize forward
        const len = Math.hypot(forward.x, forward.z);
        const ux = forward.x / len, uz = forward.z / len;
        // perpendicular to forward
        const perpX = uz, perpZ = -ux;
        // dimensions (in screen px)
        const tipLen = 12, baseDist = -8, notchDist = -4;
        const halfW = 6;
        // compute points
        const tipX       = px + ux * tipLen;
        const tipZ       = pz + uz * tipLen;
        const baseRX     = px + ux * baseDist + perpX * halfW;
        const baseRZ     = pz + uz * baseDist + perpZ * halfW;
        const notchX     = px + ux * notchDist;
        const notchZ     = pz + uz * notchDist;
        const baseLX     = px + ux * baseDist - perpX * halfW;
        const baseLZ     = pz + uz * baseDist - perpZ * halfW;
        // draw shape
        this.ctx.beginPath();
        this.ctx.moveTo(tipX, tipZ);
        this.ctx.lineTo(baseRX, baseRZ);
        this.ctx.lineTo(notchX, notchZ);
        this.ctx.lineTo(baseLX, baseLZ);
        this.ctx.closePath();
        this.ctx.fill();
    }
}

class Listener {
    constructor(boundaries) {
        this.position = new Vector2D();
        this.velocity = new Vector2D();
        this.rotation = 0;
        this.rotationVelocity = 0;
        this.boundaries = boundaries;
        this.hitBounds = false;
    }

    update(keys) {
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

            if (distanceFromCenter > this.boundaries.softBoundary) {
                this.hitBounds = true;
            }

            if (this.hitBounds) {
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
                this.position.add(this.getForwardVector().scale(0.015));
            }
            if (keys["ArrowDown"] || keys["s"]) {
                this.position.add(this.getForwardVector().scale(-0.015));
            }
            if (keys["ArrowLeft"] || keys["a"]) {
                this.rotation += 0.015;
            }
            if (keys["ArrowRight"] || keys["d"]) {
                this.rotation -= 0.015;
            }
        }

        // Keep within bounds
        if (distanceFromCenter > this.boundaries.hardBoundary) {
            this.position = this.getCenterVector().scale(this.boundaries.hardBoundary);
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
        this.peakLevels = new Array(discs.length).fill(0);
        this.attackTime = 0.005; // Quick attack (5ms)
        this.releaseTime = 0.2;  // Slower release (200ms)
        this.lastFrameTime = new Array(discs.length).fill(0);
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
            }// Create analyzer node if it doesn't exist
            if (!disc.analyzer) {
                disc.analyzer = this.context.createAnalyser();
                disc.analyzer.fftSize = 2048;
                disc.analyzer.minDecibels = -90;
                disc.analyzer.maxDecibels = 0;
                disc.analyzer.smoothingTimeConstant = 1;
            }
            // Connect source -> analyzer -> panner -> destination
            sources[index].connect(disc.analyzer);
            disc.analyzer.connect(disc.panner);
            disc.panner.connect(this.context.destination);
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
                try {
                    await this.prepareNextSources();
                } catch (error) {
                    console.error('Failed to prepare next sources:', error);
                    this.nextPrepared = false;  // Reset flag on error
                }
            }
        };
        this.endedListener = async () => {
            if (!this.nextPrepared) {
                try {
                    await this.prepareNextSources();
                } catch (error) {
                    console.error('Failed to prepare next sources:', error);
                }
            }
            try {
                await this.playNextSources(this.nextSources, true);
            } catch (error) {
                console.error('Failed to play next sources:', error);
            }
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

    getLoudness(discIndex) {
        const disc = this.discs[discIndex];
        if (!disc.analyzer) return 0;

        const analyzer    = disc.analyzer;
        const bufferLen   = analyzer.fftSize;
        const dataArray   = new Float32Array(bufferLen);
        analyzer.getFloatTimeDomainData(dataArray);

        // RMS over full buffer
        let sum = 0;
        for (let i = 0; i < bufferLen; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLen);

        // to dB, avoid log(0)
        const db = 20 * Math.log10(rms + Number.EPSILON);

        // map –60…0 dB -> 0…1
        const minDb = -60;
        const maxDb =   0;
        const norm  = (db - minDb) / (maxDb - minDb);

        return Math.max(0, Math.min(1, norm));
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
                "discName": "Fissures in Green",
                "year": "2011",
                "tracks": [
                    { "trackTitle": "Rain at the Station" },
                    { "trackTitle": "Still Life with Cicadas, Waterfall and Radu" },
                    { "trackTitle": "Silent Prayer" },
                    { "trackTitle": "Langhalsen" },
                ]
            },
            {
                "discName": "Pathsplitter (Yellow-Red)",
                "year": "2012",
                "tracks": [
                    { "trackTitle": "Canon a2" },
                    { "trackTitle": "Canon a3" },
                    { "trackTitle": "Canon a4" },
                    { "trackTitle": "Canon a5" },
                ]
            },
            {
                "discName": "Landscape in Black and Grey",
                "year": "2013",
                "tracks": [
                    { "trackTitle": "The Chords of the Grosse Mühl" },
                    { "trackTitle": "Six-Part Panorama" },
                    { "trackTitle": "Building a World" },
                    { "trackTitle": "The Disappearance of a World" },
                ]
            },
            {
                "discName": "White Light Under the Door",
                "year": "2014",
                "tracks": [
                    { "trackTitle": "Electricity" },
                    { "trackTitle": "Heat" },
                    { "trackTitle": "Light" },
                    { "trackTitle": "Gas" },
                ]
            },
            {
                "discName": "Hellgrün (Small New World)",
                "year": "2015",
                "tracks": [
                    { "trackTitle": "Malachite" },
                    { "trackTitle": "Bird Warnings" },
                    { "trackTitle": "The River is a Green-Brown God" },
                    { "trackTitle": "Emerald Twilight" },
                ]
            }
        ];

        this.boundaries = {
            "radius": RADIUS,
            "softBoundary": SHORTEST_SEGMENT,
            "hardBoundary": RADIUS + SHORTER_SEGMENT
        };

        this.calculatePentagonPoints();

        this.audioManager = new AudioManager(this.audioContext, this.discs);
        this.appListener = new Listener(this.boundaries);
        this.visualizer = new Visualizer('visualizer', this.audioManager, this.boundaries, this.discs);

        this.animationFrameId = null;
        this.isPlaying = false;

        this.keys = [];
        this.setupKeys();

        this.setupEventListeners();

        this.visualizer.draw(this.appListener);
    }

    calculatePentagonPoints() {
        for (let i = 0; i < 5; i++) {
            const angle = (((i * 2 * Math.PI) + Math.PI) / 5 + Math.PI / 4) * 2;
            this.discs[i].point = new Vector2D(
                this.boundaries.radius * Math.cos(angle),
                this.boundaries.radius * Math.sin(angle)
            );
        }
    }

    async handleDirectorySelection() {
        const directoryButton = document.getElementById('directoryButton');
        const directoryInput = document.getElementById('directoryInput');

        if ('showDirectoryPicker' in window) {
            directoryButton.disabled = true;
            directoryButton.textContent = 'Loading...';

            try {
                const dirHandle = await window.showDirectoryPicker();
                const audioFiles = [];

                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file' && entry.name.match(/\.(mp3|wav|ogg|flac)$/i)) {
                        const file = await entry.getFile();
                        audioFiles.push(file);
                    }
                }

                await this.processAudioFiles(audioFiles);
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('Directory selection was cancelled.');
                } else {
                    console.error('Error selecting directory:', err);
                    alert('Error selecting directory. Please try again.');
                    // Fallback to traditional input
                    directoryInput.click();
                }
            } finally {
                directoryButton.disabled = false;
                directoryButton.textContent = 'Select Audio Directory';
            }
        } else {
            // Use traditional file input for unsupported browsers
            directoryInput.click();
        }
    }

    async processAudioFiles(files) {
        if (files.length !== 20) {
            alert('Please select a directory with exactly 20 audio files (4 tracks for each of the 5 discs).');
            return;
        }
        this.discs = this.assignAudioSources(files);
        await this.audioManager.init();
        document.getElementById('directoryButton').disabled = true;
        document.getElementById('directoryButton').hidden = true;
        document.getElementById('startButton').disabled = false;
        document.getElementById('startButton').hidden = false;
    }

    assignAudioSources(files) {
        for (let file of files) {
            const match = /(\d{1,2}) Disc ([1-5])/.exec(file.name);
            const match2 = /([1-5])\.(\d{1,2})/.exec(file.name);
            let discIndex, trackIndex = null;
            if (match) {
                discIndex = +(parseInt(match[2]) - 1);
                trackIndex = +((parseInt(match[1]) - 1) % 4);
            } else if (match2) {
                discIndex = +(parseInt(match2[1]) - 1);
                trackIndex = +((parseInt(match2[2]) - 1) % 4);
            } else {
                // alert the user if at least one file is not named correctly
                alert(`Files are not named correctly. Please name files as "XX Disc X" or "X.X"`);
                return this.discs;
            }
            this.discs[discIndex].tracks[trackIndex].file = file;
        }
        return this.discs;
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
        this.appListener.update(this.keys);
        this.updateAudioListener();
        this.visualizer.resize();
        this.visualizer.draw(this.appListener);

        if (this.isPlaying) {
            this.animationFrameId = requestAnimationFrame(() => this.update());
        }
    }

    setupEventListeners() {
        window.addEventListener('load', () => {
            this.visualizer.resize();
            this.visualizer.draw(this.appListener);
        });

        const directoryButton = document.getElementById('directoryButton');
        const directoryInput = document.getElementById('directoryInput');

        directoryButton.addEventListener('click', () => this.handleDirectorySelection());
        directoryInput.addEventListener('change', (e) => this.processAudioFiles(Array.from(e.target.files)));

        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('nextButton').addEventListener('click', () => this.next());

        window.addEventListener('beforeunload', () => {
            if (this.audioManager) {
                this.audioManager.destroy();
            }
        });
    }

    async start() {
        if (!this.isPlaying) {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            await this.audioManager.play();
            this.isPlaying = true;
            this.update();
            document.getElementById('startButton').textContent = 'Pause';
            document.getElementById('nextButton').disabled = false;
            document.getElementById('nextButton').hidden = false;
        } else {
            await this.audioManager.pause();
            this.isPlaying = false;
            cancelAnimationFrame(this.animationFrameId);
            document.getElementById('startButton').textContent = 'Play';
            document.getElementById('nextButton').disabled = true;
            document.getElementById('nextButton').hidden = true;
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
