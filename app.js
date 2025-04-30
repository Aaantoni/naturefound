const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const listener = audioContext.listener;

const tracks = [
    {filename: 'Disc 1 - Fissures In Green.mp3', disc: "Disc 1", title: "Fissures In Green", year: 2011},
    {filename: 'Disc 4 - White Light Under The Door.mp3', disc: "Disc 4", title: "White Light Under The Door", year: 2014},
    {filename: 'Disc 2 - Pathsplitter - Yellow-Red.mp3', disc: "Disc 2", title: "Pathsplitter (Yellow-Red)", year: 2012},
    {filename: 'Disc 5 - Hellgrun - Small New World.mp3', disc: "Disc 5", title: "Hellgrün (Small New World)", year: 2015},
    {filename: 'Disc 3 - Landscape In Black And Grey.mp3', disc: "Disc 3", title: "Landscape In Black And Grey", year: 2013}
];

const sources = [];
const panners = [];
const analysers = [];
let animationFrameId = null;
let isPlaying = false;

// Calculate pentagon vertices (corners)
const pentagonPoints = [];
const radius = 5; // Distance from center to corners
for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 + Math.PI / 2; // Start from bottom
    pentagonPoints.push({
        x: radius * Math.cos(angle),
        z: radius * Math.sin(angle),
        disc: tracks[i].disc,
        title: tracks[i].title,
        year: tracks[i].year
    });
}

// Listener state
const listenerState = {
    x: 0,
    z: 0,
    rotation: 0,
    velocityX: 0,
    velocityZ: 0,
    rotationVelocity: 0
};

// Setup audio sources and panners
async function setupAudio() {
    for (let i = 0; i < tracks.length; i++) {
        const response = await fetch(tracks[i].filename);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        const dataArray = new Uint8Array(analyser.fftSize);

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // compute approximate RMS amplitude
        const getRMS = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const sample = (dataArray[i] - 128) / 128; // Normalize to -1 to 1 range
                sum += sample * sample; // Square the sample
            }
            return Math.sqrt(sum / dataArray.length);
        };
        
        const panner = new PannerNode(audioContext, {
            positionX: pentagonPoints[i].x,
            positionY: 0,
            positionZ: pentagonPoints[i].z,
            refDistance: 1,
            maxDistance: 15,
            rolloffFactor: 1,
            distanceModel: 'inverse',
            panningModel: 'HRTF'
        });

        source.connect(panner).connect(audioContext.destination);
        sources.push(source);
        panners.push(panner);
        analysers.push(analyser);
    }
}

// Update listener position and rotation
function updateListener() {
    // Update velocities with random accelerations
    listenerState.velocityX += (Math.random() - 0.5) * 0.005;
    listenerState.velocityZ += (Math.random() - 0.5) * 0.005;
    listenerState.rotationVelocity += (Math.random() - 0.5) * 0.01;

    // Apply damping
    listenerState.velocityX *= 0.97;
    listenerState.velocityZ *= 0.97;
    listenerState.rotationVelocity *= 0.98;

    // Update position and rotation
    listenerState.x += listenerState.velocityX;
    listenerState.z += listenerState.velocityZ;
    listenerState.rotation += listenerState.rotationVelocity;

    // Keep listener within pentagon bounds (simple circular boundary)
    const distanceFromCenter = Math.sqrt(listenerState.x ** 2 + listenerState.z ** 2);
    const boundary = radius * 0.5;
    if (distanceFromCenter > boundary) {
        const angle = Math.atan2(listenerState.z, listenerState.x);
        listenerState.x = boundary * Math.cos(angle);
        listenerState.z = boundary * Math.sin(angle);
        // Reverse velocities when hitting boundary
        listenerState.velocityX *= -0.5;
        listenerState.velocityZ *= -0.5;
    }

    // Update listener position and orientation
    listener.positionX.setValueAtTime(listenerState.x, audioContext.currentTime);
    listener.positionY.setValueAtTime(0, audioContext.currentTime);
    listener.positionZ.setValueAtTime(listenerState.z, audioContext.currentTime);

    // Calculate forward direction based on rotation
    const forwardX = Math.sin(listenerState.rotation);
    const forwardZ = Math.cos(listenerState.rotation);
    
    listener.forwardX.setValueAtTime(forwardX, audioContext.currentTime);
    listener.forwardY.setValueAtTime(0, audioContext.currentTime);
    listener.forwardZ.setValueAtTime(forwardZ, audioContext.currentTime);
    
    listener.upX.setValueAtTime(0, audioContext.currentTime);
    listener.upY.setValueAtTime(1, audioContext.currentTime);
    listener.upZ.setValueAtTime(0, audioContext.currentTime);

    // Update position display
    updatePositionsDisplay();

    // Draw visualization
    drawVisualization();

    if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateListener);
    }
}

// Update the positions display in the HTML
function updatePositionsDisplay() {
    const positions = document.querySelectorAll('#positionsList span');
    positions[0].textContent = `(${listenerState.x.toFixed(2)}, ${listenerState.z.toFixed(2)})`;
    for (let i = 0; i < pentagonPoints.length; i++) {
        positions[i + 1].textContent = `(${pentagonPoints[i].x.toFixed(2)}, ${pentagonPoints[i].z.toFixed(2)})`;
    }
}

// Draw the visualization on canvas
function drawVisualization() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const scale = 40; // Pixels per unit

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Translate to center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Draw pentagon
    ctx.beginPath();
    ctx.moveTo(pentagonPoints[0].x * scale, pentagonPoints[0].z * scale);
    for (let i = 1; i < pentagonPoints.length; i++) {
        ctx.lineTo(pentagonPoints[i].x * scale, pentagonPoints[i].z * scale);
    }
    ctx.closePath();
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // Draw sound sources
    pentagonPoints.forEach((point, i) => {
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(point.x * scale, point.z * scale, 5, 0, Math.PI * 2);
        ctx.fill();
        // Draw labels
        // Determine text color based on background contrast
        // Get the canvas background color (assuming it's the body background or canvas background)
        const backgroundColor = window.getComputedStyle(canvas.parentNode).backgroundColor;
        
        // Parse the RGB values
        let r, g, b;
        if (backgroundColor.startsWith('rgb')) {
            [r, g, b] = backgroundColor.match(/\d+/g).map(Number);
        } else {
            // Default to white background if we can't parse
            r = 255; g = 255; b = 255;
        }
        
        // Calculate luminance - standard formula for perceived brightness
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Use black text for bright backgrounds, white text for dark backgrounds
        ctx.fillStyle = luminance > 0.5 ? '#000' : '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const labelY = point.z * scale + 20;
        ctx.fillText(`${point.disc}`, point.x * scale, labelY);
        ctx.fillText(`${point.title}`, point.x * scale, labelY + 15);
        ctx.fillText(`${point.year}`, point.x * scale, labelY + 30);
    });

    // Draw listener
    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(listenerState.x * scale, listenerState.z * scale, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw listener direction
    ctx.beginPath();
    ctx.moveTo(listenerState.x * scale, listenerState.z * scale);
    ctx.lineTo(
        (listenerState.x + Math.sin(listenerState.rotation)) * scale,
        (listenerState.z + Math.cos(listenerState.rotation)) * scale
    );
    ctx.strokeStyle = '#00f';
    ctx.stroke();

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Event Listeners
document.getElementById('startButton').addEventListener('click', async () => {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    if (!isPlaying) {
        await setupAudio();
        sources.forEach(source => source.start());
        isPlaying = true;
        updateListener();
        document.getElementById('startButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    if (isPlaying) {
        sources.forEach(source => source.stop());
        sources.length = 0;
        panners.length = 0;
        isPlaying = false;
        cancelAnimationFrame(animationFrameId);
        document.getElementById('startButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
    }
});

// Initial canvas setup
window.addEventListener('load', () => {
    const canvas = document.getElementById('visualizer');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawVisualization();
});