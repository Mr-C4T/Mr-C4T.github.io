// Global variables
let xrSession = null;
let gl = null;
let renderer = null;
let scene = null;
let camera = null;
let referenceSpace = null;
let dataset = [];
let recordingStartTime = 0;
let maxRecordingTime = 10;
let isRecording = false;

// Hand joints list
const HAND_JOINTS = [
    'wrist',
    'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
    'index-metacarpal', 'index-phalanx-proximal', 'index-phalanx-intermediate', 'index-phalanx-distal', 'index-tip',
    'middle-metacarpal', 'middle-phalanx-proximal', 'middle-phalanx-intermediate', 'middle-phalanx-distal', 'middle-tip',
    'ring-metacarpal', 'ring-phalanx-proximal', 'ring-phalanx-intermediate', 'ring-phalanx-distal', 'ring-tip',
    'pinky-metacarpal', 'pinky-phalanx-proximal', 'pinky-phalanx-intermediate', 'pinky-phalanx-distal', 'pinky-tip'
];

// Initialize UI
function initializeUI() {
    // Populate joint checkboxes
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
    try {
        const supported = await navigator.xr.supportsSession('immersive-ar');
        if (!supported) {
            alert("Your device does not support immersive AR.");
            return;
        }
    } catch (err) {
        console.error("Error checking XR session support:", err);
        alert("Failed to verify XR support. Check console for details.");
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
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Get reference space
    referenceSpace = await xrSession.requestReferenceSpace('local-floor');
    
    // Reset and start recording
    dataset = [];
    isRecording = true;
    recordingStartTime = performance.now();
    
    // Start animation frame
    xrSession.requestAnimationFrame(onXRFrame);
    
    // Hide UI
    document.querySelector('.container').style.display = 'none';
    
    // Handle session end
    xrSession.addEventListener('end', () => {
        canvas.style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        isRecording = false;
    });
}

// XR Animation Frame
function onXRFrame(time, frame) {
    // Check if session is still active
    if (!xrSession) return;

    xrSession.requestAnimationFrame(onXRFrame);

    // Stop recording after max time
    if (isRecording && (time - recordingStartTime) / 1000 > maxRecordingTime) {
        isRecording = false;
        xrSession.end();
        return;
    }

    // Get viewer pose
    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
        // Render scene
        renderer.render(scene, camera);

        // Process hand tracking
        const hands = xrSession.inputSources ? 
            Array.from(xrSession.inputSources).filter(source => source.hand) : [];
        hands.forEach(hand => updateHandData(frame, hand));
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
        const joint = hand.hand.get(jointName);
        if (joint) {
            const jointPose = frame.getJointPose(joint, referenceSpace);
            if (jointPose) {
                handData[jointName] = {
                    position: jointPose.transform.position,
                    orientation: jointPose.transform.orientation
                };
            }
        }
    }
    
    if (Object.keys(handData).length > 0) {
        dataset.push(handData);
    }
}

// Download Dataset
function downloadDataset() {
    if (dataset.length === 0) {
        alert("No data recorded. Start an XR session first.");
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
