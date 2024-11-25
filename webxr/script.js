let xrSession = null;
let gl = null;
let renderer = null;
let scene = null;
let camera = null;
let referenceSpace = null;
let dataset = [];

document.getElementById('start-xr').addEventListener('click', startXR);
document.getElementById('download-data').addEventListener('click', downloadDataset);

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
        document.getElementById('download-data').style.display = 'none';
        console.log("Session ended.");
    });

    document.getElementById('start-xr').style.display = 'none';
    document.getElementById('download-data').style.display = 'block';
}

function onXRFrame(time, frame) {
    xrSession.requestAnimationFrame(onXRFrame);

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
    let handData = {};
    for (let jointName of hand.hand.keys()) {
        const jointPose = frame.getJointPose(hand.hand.get(jointName), referenceSpace);
        if (jointPose) {
            handData[jointName] = {
                position: jointPose.transform.position,
                orientation: jointPose.transform.orientation
            };
        }
    }
    dataset.push(handData);
}

function downloadDataset() {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'hand_tracking_dataset.json';
    link.click();
}
