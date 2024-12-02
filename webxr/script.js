import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

// Global variables
let xrSession = null;
let gl = null;
let renderer = null;
let scene = null;
let camera = null;
let referenceSpace = null;
let dataset = [];  // Global dataset to persist data across sessions
let recordingStartTime = 0;
let maxRecordingTime = 5;
let isRecording = false;

// Hand joints list
const HAND_JOINTS = [
    'wrist', 'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip', 'index-metacarpal', 'index-phalanx-proximal', 'index-phalanx-intermediate', 'index-phalanx-distal', 'index-tip'//,'middle-metacarpal', 'middle-phalanx-proximal', 'middle-phalanx-intermediate', 'middle-phalanx-distal', 'middle-tip','ring-metacarpal', 'ring-phalanx-proximal', 'ring-phalanx-intermediate', 'ring-phalanx-distal', 'ring-tip','pinky-metacarpal', 'pinky-phalanx-proximal', 'pinky-phalanx-intermediate', 'pinky-phalanx-distal', 'pinky-tip'
];

// Initialize UI
function initializeUI() {
    const jointGrid = document.getElementById('joint-grid');
    HAND_JOINTS.forEach(joint => {
        const jointCheckbox = document.createElement('div');
        jointCheckbox.classList.add('joint-checkbox');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `joint-${joint}`;
        checkbox.name = joint;
        
        const label = document.createElement('label');
        label.htmlFor = `joint-${joint}`;
        label.textContent = joint;
        
        jointCheckbox.appendChild(checkbox);
        jointCheckbox.appendChild(label);
        jointGrid.appendChild(jointCheckbox);
    });

    // Time limit slider
    const timeLimitSlider = document.getElementById('time-limit-slider');
    const timeLimitDisplay = document.getElementById('time-limit-display');
    
    timeLimitSlider.addEventListener('input', (e) => {
        maxRecordingTime = parseInt(e.target.value);
        timeLimitDisplay.textContent = maxRecordingTime;
    });

    // Start XR button
    document.getElementById('start-xr').addEventListener('click', startXR);
    
    // Download data button
    document.getElementById('download-data').addEventListener('click', downloadDataset);
}

// Start XR Session
async function startXR() {
    // Check WebXR support
    if (!navigator.xr) {
        alert("WebXR is not supported in this browser.");
        return;
    }
    
    // Check if immersive AR is supported
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
        alert("Your device does not support immersive AR.");
        return;
    }
    
    // Request XR session
    try {
        const session = await navigator.xr.requestSession('immersive-ar', { 
            requiredFeatures: ['local-floor'], 
            optionalFeatures: ['hand-tracking'] 
        });
        await onSessionStarted(session);
    } catch (err) {
        console.error("Failed to start XR session:", err);
        alert("Failed to start XR session. Check console for details.");
    }
}

// Session Started Handler
async function onSessionStarted(session) {
    xrSession = session;
    const canvas = document.getElementById('webgl-canvas');
    canvas.style.display = 'block';
    
    // Get WebGL context
    gl = canvas.getContext('webgl', { xrCompatible: true });
    
    // Update render state
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });
    
    // Setup Three.js scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Get reference space
    referenceSpace = await xrSession.requestReferenceSpace('local-floor');
    
    // Start recording (do not clear dataset here)
    isRecording = true;
    recordingStartTime = performance.now();
    
    // Start animation frame
    xrSession.requestAnimationFrame(onXRFrame);

    // Hide UI
    document.querySelector('.container').style.display = 'none';
    
    // Handle session end without clearing dataset
    xrSession.addEventListener('end', () => {
        canvas.style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        isRecording = false;

        // Log data to ensure persistence
        console.log("Session ended. Dataset:", dataset);
    });
}

// XR Animation Frame
function onXRFrame(time, frame) {
    // Check if recording should continue
    if (!xrSession || xrSession.ended) return;

    xrSession.requestAnimationFrame(onXRFrame);
    
    // Check time limit
    if (isRecording && (time - recordingStartTime) / 1000 > maxRecordingTime) {
        isRecording = false;
        xrSession.end();
        return;
    }
    
    // Get viewer pose
    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
        // Render scene
        renderer.setAnimationLoop(() => {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            renderer.render(scene, camera);
        });
        
        // Track hands
        let hands = Array.from(xrSession.inputSources).filter(source => source.hand);
        for (let hand of hands) {
            updateHandData(frame, hand);
        }
    }
}

// Update Hand Data
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
        console.log("Recorded hand data:", handData);  // Debugging the data being recorded
    }
}

// Download Dataset
function downloadDataset() {
    if (dataset.length === 0) {
        alert("No data recorded. Start an XR session first.");
        console.log("Dataset is empty at download attempt.");
        return;
    }

    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'hand_tracking_dataset.json';
    link.click();
}

// Initialize UI when script loads
initializeUI();
