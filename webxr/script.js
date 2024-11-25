import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

let xrSession = null;
let gl = null;
let renderer = null;
let scene = null;
let camera = null;
let referenceSpace = null;
let dataset = [];
let selectedHand = 'left'; // Default to left hand
let selectedJoint = null;
let recording = false;
let recordDuration = 5; // Default recording duration

// Joint names
const joints = [
    'wrist', 'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal',
    'thumb-tip', 'index-finger-metacarpal', 'index-finger-phalanx-proximal',
    'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
    'middle-finger-metacarpal', 'middle-finger-phalanx-proximal',
    'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
    'ring-finger-metacarpal', 'ring-finger-phalanx-proximal',
    'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
    'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal',
    'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'
];

// DOM elements
const jointSelector = document.getElementById('joint-selector');
const durationLabel = document.getElementById('duration-label');

// Populate joint selector dropdown
joints.forEach(joint => {
    const option = document.createElement('option');
    option.value = joint;
    option.textContent = joint;
    jointSelector.appendChild(option);
});

// Event listeners
document.getElementById('select-left').addEventListener('click', () => selectedHand = 'left');
document.getElementById('select-right').addEventListener('click', () => selectedHand = 'right');
document.getElementById('joint-selector').addEventListener('change', (e) => selectedJoint = e.target.value);
document.getElementById('record-duration').addEventListener('input', (e) => {
    recordDuration = parseInt(e.target.value);
    durationLabel.textContent = `${recordDuration}`;
});
document.getElementById('start-recording').addEventListener('click', startRecording);
document.getElementById('download-data').addEventListener('click', downloadDataset);

async function startRecording() {
    if (!xrSession) {
        alert("Please start an AR session first.");
        return;
    }

    dataset = []; // Reset dataset
    recording = true;
    setTimeout(() => {
        recording = false;
        document.getElementById('download-data').style.display = 'block';
        alert("Recording finished!");
    }, recordDuration * 1000);
}

async function startXR() {
    if (!navigator.xr) {
        alert("WebXR is not supported in this browser.");
        return;
    }

    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
        alert("Your device does not support immersive AR.");
        return;
    }

    navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking'] })
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

    xrSession.requestAnimationFrame(onXRFrame);

    xrSession.addEventListener('end', () => {
        canvas.style.display = 'none';
        console.log("Session ended.");
    });
}

function onXRFrame(time, frame) {
    xrSession.requestAnimationFrame(onXRFrame);

    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
        renderer.setAnimationLoop(() => {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            renderer.render(scene, camera);
        });

        let hands = Array.from(xrSession.inputSources).filter(source => source.hand);
        for (let hand of hands) {
            if (hand.handedness === selectedHand && recording) {
                recordJointData(frame, hand);
            }
        }
    }
}

function recordJointData(frame, hand) {
    const jointPose = frame.getJointPose(hand.hand.get(selectedJoint), referenceSpace);
    if (jointPose) {
        dataset.push({
            timestamp: Date.now(),
            joint: selectedJoint,
            position: jointPose.transform.position,
            orientation: jointPose.transform.orientation
        });
    }
}

function downloadDataset() {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'hand_tracking_dataset.json';
    link.click();
}
