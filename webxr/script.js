import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

let xrSession = null;
let gl = null;
let renderer = null;
let scene = null;
let camera = null;
let referenceSpace = null;
let dataset = [];
let recordingStartTime = 0;
let maxRecordingTime = 10; // Default 10 seconds
let isRecording = false;

// Predefined list of common hand joints to choose from
const HAND_JOINTS = [
    'wrist',
    'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
    'index-metacarpal', 'index-phalanx-proximal', 'index-phalanx-intermediate', 'index-phalanx-distal', 'index-tip',
    'middle-metacarpal', 'middle-phalanx-proximal', 'middle-phalanx-intermediate', 'middle-phalanx-distal', 'middle-tip',
    'ring-metacarpal', 'ring-phalanx-proximal', 'ring-phalanx-intermediate', 'ring-phalanx-distal', 'ring-tip',
    'pinky-metacarpal', 'pinky-phalanx-proximal', 'pinky-phalanx-intermediate', 'pinky-phalanx-distal', 'pinky-tip'
];

// Create joint selection checkboxes
function createJointSelectionUI() {
    const container = document.createElement('div');
    container.id = 'joint-selection-container';
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.backgroundColor = 'rgba(255,255,255,0.8)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.maxHeight = '200px';
    container.style.overflowY = 'auto';

    // Add time limit slider
    const timeLimitLabel = document.createElement('label');
    timeLimitLabel.textContent = 'Max Recording Time (seconds): ';
    const timeLimitSlider = document.createElement('input');
    timeLimitSlider.type = 'range';
    timeLimitSlider.min = '1';
    timeLimitSlider.max = '60';
    timeLimitSlider.value = '10';
    timeLimitSlider.id = 'time-limit-slider';
    timeLimitSlider.addEventListener('input', (e) => {
        maxRecordingTime = parseInt(e.target.value);
        document.getElementById('time-limit-value').textContent = maxRecordingTime;
    });

    const timeLimitValue = document.createElement('span');
    timeLimitValue.id = 'time-limit-value';
    timeLimitValue.textContent = maxRecordingTime;

    container.appendChild(timeLimitLabel);
    container.appendChild(timeLimitSlider);
    container.appendChild(timeLimitValue);
    container.appendChild(document.createElement('br'));

    // Create checkboxes for joint selection
    HAND_JOINTS.forEach(joint => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `joint-${joint}`;
        checkbox.name = joint;
        
        const label = document.createElement('label');
        label.htmlFor = `joint-${joint}`;
        label.textContent = joint;
        
        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });

    document.body.appendChild(container);
}

document.getElementById('start-xr').addEventListener('click', startXR);
document.getElementById('download-data').addEventListener('click', downloadDataset);

async function startXR() {
    if (!navigator.xr) {
        alert("WebXR is not supported in this browser.");
        return;
    }
    
    // Create joint selection UI if not already created
    if (!document.getElementById('joint-selection-container')) {
        createJointSelectionUI();
    }
    
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
        alert("Your device does not support immersive AR.");
        return;
    }
    
    navigator.xr.requestSession('immersive-ar', { 
        requiredFeatures: ['local-floor'], 
        optionalFeatures: ['hand-tracking'] 
    })
    .then(onSessionStarted)
    .catch(err => console.error("Failed to start session:", err));
}

async function onSessionStarted(session) {
    xrSession = session;
    const canvas = document.getElementById('webgl-canvas');
    canvas.style.display = 'block';
    gl = canvas.getContext('webgl', { xrCompatible: true });
    
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    referenceSpace = await xrSession.requestReferenceSpace('local-floor');
    
    // Reset dataset and start recording
    dataset = [];
    isRecording = true;
    recordingStartTime = performance.now();
    
    xrSession.requestAnimationFrame(onXRFrame);
    
    xrSession.addEventListener('end', () => {
        canvas.style.display = 'none';
        document.getElementById('download-data').style.display = 'none';
        isRecording = false;
        console.log("Session ended.");
    });
    
    document.getElementById('start-xr').style.display = 'none';
    document.getElementById('download-data').style.display = 'block';
}

function onXRFrame(time, frame) {
    xrSession.requestAnimationFrame(onXRFrame);
    
    // Check recording time limit
    if (isRecording && (time - recordingStartTime) / 1000 > maxRecordingTime) {
        isRecording = false;
        console.log("Recording time limit reached.");
    }
    
    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
        // Render AR scene
        renderer.setAnimationLoop(() => {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            renderer.render(scene, camera);
        });
        
        // Handle hand tracking
        let hands = Array.from(xrSession.inputSources).filter(source => source.hand);
        for (let hand of hands) {
            updateHandData(frame, hand);
        }
    }
}

function updateHandData(frame, hand) {
    if (!isRecording) return;
    
    let handData = {};
    
    // Get selected joints
    const selectedJoints = HAND_JOINTS.filter(joint => 
        document.getElementById(`joint-${joint}`).checked
    );
    
    for (let jointName of selectedJoints) {
        const jointPose = frame.getJointPose(hand.hand.get(jointName), referenceSpace);
        if (jointPose) {
            handData[jointName] = {
                position: jointPose.transform.position,
                orientation: jointPose.transform.orientation
            };
        }
    }
    
    if (Object.keys(handData).length > 0) {
        dataset.push(handData);
    }
}

function downloadDataset() {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'hand_tracking_dataset.json';
    link.click();
}