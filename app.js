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

class AudioSource {
    constructor(context, position, trackPath) {
        this.context = context;
        this.position = position;
        this.trackPath = trackPath;
        this.source = null;
        this.panner = null;
        this.audioElement = null;
    }

    async setup() {
        // Create audio element
        this.audioElement = new Audio(this.trackPath);
        this.audioElement.loop = true;
        
        // Create media element source
        this.source = this.context.createMediaElementSource(this.audioElement);

        this.panner = new PannerNode(this.context, {
            positionX: this.position.x,
            positionY: 0,
            positionZ: this.position.z,
            refDistance: 1,
            maxDistance: 15,
            rolloffFactor: 1,
            distanceModel: 'inverse',
            panningModel: 'HRTF'
        });

        this.source.connect(this.panner).connect(this.context.destination);
    }

    start() {
        this.audioElement?.play().catch(console.error);
    }

    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
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

    draw(pentagonPoints, listener) {
        this.resize();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Draw pentagon
        this.ctx.beginPath();
        this.ctx.moveTo(pentagonPoints[0].x * this.scale, pentagonPoints[0].z * this.scale);
        for (let i = 1; i < pentagonPoints.length; i++) {
            this.ctx.lineTo(pentagonPoints[i].x * this.scale, pentagonPoints[i].z * this.scale);
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = '#666';
        this.ctx.stroke();

        // Draw sound sources
        pentagonPoints.forEach(point => {
            this.ctx.fillStyle = '#f00';
            this.ctx.beginPath();
            this.ctx.arc(point.x * this.scale, point.z * this.scale, 5, 0, Math.PI * 2);
            this.ctx.fill();
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

class SpatialAudioExperience {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.tracks = [
            'Disc 1 - Fissures In Green.mp3',
            'Disc 2 - Pathsplitter - Yellow-Red.mp3',
            'Disc 3 - Landscape In Black And Grey.mp3',
            'Disc 4 - White Light Under The Door.mp3',
            'Disc 5 - Hellgrun - Small New World.mp3'
        ];
        
        this.radius = 5;
        this.boundaryRadius = this.radius * 0.6667;
        this.pentagonPoints = this.calculatePentagonPoints();
        
        this.listener = new Listener();
        this.audioSources = this.createAudioSources();
        this.visualizer = new Visualizer('visualizer');
        
        this.animationFrameId = null;
        this.isPlaying = false;

        this.setupEventListeners();
    }

    calculatePentagonPoints() {
        const points = [];
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            points.push(new Vector2D(
                this.radius * Math.cos(angle),
                this.radius * Math.sin(angle)
            ));
        }
        return points;
    }

    createAudioSources() {
        return this.tracks.map((track, i) => 
            new AudioSource(this.audioContext, this.pentagonPoints[i], track)
        );
    }

    setupEventListeners() {
        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('stopButton').addEventListener('click', () => this.stop());
        window.addEventListener('load', () => this.visualizer.resize());
    }

    updatePositionsDisplay() {
        const positions = document.querySelectorAll('#positionsList span');
        positions[0].textContent = `(${this.listener.position.x.toFixed(2)}, ${this.listener.position.z.toFixed(2)})`;
        this.pentagonPoints.forEach((point, i) => {
            positions[i + 1].textContent = `(${point.x.toFixed(2)}, ${point.z.toFixed(2)})`;
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
        this.updatePositionsDisplay();
        this.visualizer.draw(this.pentagonPoints, this.listener);

        if (this.isPlaying) {
            this.animationFrameId = requestAnimationFrame(() => this.update());
        }
    }

    async start() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        if (!this.isPlaying) {
            // Since we're using HTML Audio elements, we can set up all sources at construction
            if (!this.audioSources[0].source) {
                await Promise.all(this.audioSources.map(source => source.setup()));
            }
            this.audioSources.forEach(source => source.start());
            this.isPlaying = true;
            this.update();
            document.getElementById('startButton').disabled = true;
            document.getElementById('stopButton').disabled = false;
        }
    }

    stop() {
        if (this.isPlaying) {
            this.audioSources.forEach(source => source.stop());
            this.isPlaying = false;
            cancelAnimationFrame(this.animationFrameId);
            document.getElementById('startButton').disabled = false;
            document.getElementById('stopButton').disabled = true;
        }
    }
}

// Initialize the experience
const experience = new SpatialAudioExperience();
