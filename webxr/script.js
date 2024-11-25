async function startRecording() {
  if (!xrSession) { // Check if the AR session is active
      alert("Please start an AR session first.");
      return;
  }

  if (!selectedJoint) { // Check if a joint is selected
      alert("Please select a joint to record.");
      return;
  }

  dataset = []; // Reset the dataset
  recording = true; // Start recording
  document.getElementById('start-recording').disabled = true; // Disable the recording button
  document.getElementById('download-data').style.display = 'none'; // Hide download button while recording

  // Timer to stop recording after the set duration
  setTimeout(() => {
      recording = false; // Stop recording
      document.getElementById('start-recording').disabled = false; // Re-enable the recording button
      document.getElementById('download-data').style.display = 'block'; // Show download button
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
  xrSession = session; // Ensure xrSession is set
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
      xrSession = null; // Reset xrSession on end
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
