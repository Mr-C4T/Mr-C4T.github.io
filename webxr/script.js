// Event listener for starting the AR session
document.getElementById('start-ar-session').addEventListener('click', startXR);

async function startRecording() {
    if (!xrSession) {
        alert("Please start an AR session first by clicking 'Start AR Session'.");
        return;
    }

    dataset = []; // Reset dataset
    recording = true;
    document.getElementById('download-data').style.display = 'none'; // Hide download button

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

function onSessionStarted(session) {
    xrSession = session;

    const canvas = document.getElementById('webgl-canvas');
    canvas.style.display = 'block';

    gl = canvas.getContext('webgl', { xrCompatible: true });
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });

    referenceSpace = session.requestReferenceSpace('local-floor').then(refSpace => {
        referenceSpace = refSpace;
        xrSession.requestAnimationFrame(onXRFrame);
    });

    xrSession.addEventListener('end', () => {
        xrSession = null; // Clear session
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
