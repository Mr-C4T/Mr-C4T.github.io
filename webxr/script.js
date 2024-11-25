let xrSession = null;
let gl = null;
let dataset = [];
let recording = false;
let selectedHand = 'left'; // Default hand
let selectedJoint = 'wrist'; // Default joint
let recordDuration = 5; // Default duration in seconds

const JOINTS = [
    'wrist', 'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal',
    'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal',
    'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal',
    'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal',
    'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'
];

// Ensure the AR session starts correctly
async function startXR() {
    console.log("Attempting to start AR session...");
    if (!navigator.xr) {
        alert("WebXR is not supported in this browser.");
        return;
    }

    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
        alert("Your device does not support immersive AR.");
        return;
    }

    try {
        xrSession = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking'] });
        onSessionStarted(xrSession);
    } catch (err) {
        console.error("Failed to start AR session:", err);
    }
}

async function onSessionStarted(session) {
    xrSession = session;
    console.log("AR session started.");

    const canvas = document.getElementById('webgl-canvas');
    canvas.style.display = 'block';

    gl = canvas.getContext('webgl', { xrCompatible: true });
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const referenceSpace = await xrSession.requestReferenceSpace('local-floor');
    xrSession.requestAnimationFrame((time, frame) => onXRFrame(time, frame, renderer, scene, camera, referenceSpace));

    xrSession.addEventListener('end', () => {
        xrSession = null;
        console.log("AR session ended.");
        canvas.style.display = 'none';
    });
}

function onXRFrame(time, frame, renderer, scene, camera, referenceSpace) {
    if (!xrSession) return;

    xrSession.requestAnimationFrame((t, f) => onXRFrame(t, f, renderer, scene, camera, referenceSpace));

    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
        renderer.render(scene, camera);

        // Handle hand tracking data
        const hands = Array.from(xrSession.inputSources).filter(source => source.hand);
        hands.forEach(hand => {
            if (hand.handedness === selectedHand && recording) {
                recordJointData(frame, hand, referenceSpace);
            }
        });
    }
}

function recordJointData(frame, hand, referenceSpace) {
    const joint = hand.hand.get(selectedJoint);
    if (!joint) {
        console.warn(`Joint ${selectedJoint} not found.`);
        return;
    }

    const jointPose = frame.getJointPose(joint, referenceSpace);
    if (jointPose) {
        dataset.push({
            timestamp: Date.now(),
            joint: selectedJoint,
            hand: selectedHand,
            position: jointPose.transform.position,
            orientation: jointPose.transform.orientation
        });
        console.log("Recorded joint data:", dataset[dataset.length - 1]);
    }
}

function startRecording() {
    if (!xrSession) {
        alert("Please start an AR session first.");
        return;
    }

    if (!selectedJoint) {
        alert("Please select a joint to record.");
        return;
    }

    dataset = [];
    recording = true;
    console.log("Recording started...");
    document.getElementById('start-recording').disabled = true;

    setTimeout(() => {
        recording = false;
        console.log("Recording stopped.");
        document.getElementById('start-recording').disabled = false;
        document.getElementById('download-data').style.display = 'block';
    }, recordDuration * 1000);
}

function downloadDataset() {
    if (dataset.length === 0) {
        alert("No data recorded!");
        return;
    }

    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'hand_tracking_dataset.json';
    link.click();
    console.log("Dataset downloaded.");
}

// UI handlers
document.getElementById('hand-selector').addEventListener('change', (e) => {
    selectedHand = e.target.value;
    console.log(`Selected hand: ${selectedHand}`);
});

document.getElementById('joint-selector').addEventListener('change', (e) => {
    selectedJoint = e.target.value;
    console.log(`Selected joint: ${selectedJoint}`);
});

document.getElementById('duration-slider').addEventListener('input', (e) => {
    recordDuration = parseInt(e.target.value, 10);
    document.getElementById('duration-display').textContent = `${recordDuration} seconds`;
    console.log(`Record duration set to: ${recordDuration} seconds`);
});
