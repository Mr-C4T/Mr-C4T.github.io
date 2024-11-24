// Ensure WebXR Polyfill is loaded, or include it in the HTML file (before this script)

// Declare necessary variables
let xrSession = null;
let handTrackingData = [];
let timer = null;
let csvData = "timestamp,x,y,z\n";
let xrReferenceSpace = null;

// Get elements from the DOM
const startARButton = document.getElementById('start-ar-button');
const statusElement = document.getElementById('status');

// Listen for the Start AR button click
startARButton.addEventListener('click', startAR);

async function startAR() {
  // Check if WebXR is supported
  if (!navigator.xr) {
    statusElement.textContent = "WebXR not supported on this device.";
    console.error("WebXR not supported on this device.");
    return;
  }

  // Check if immersive AR is supported
  const xrSupported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!xrSupported) {
    statusElement.textContent = "AR feature not supported by this device.";
    console.error("AR feature not supported by this device.");
    return;
  }

  // Try to start an immersive AR session with hand-tracking
  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hand-tracking'],
    });

    // Listen for session end event
    xrSession.addEventListener('end', onSessionEnd);

    // Get the reference space for tracking
    xrReferenceSpace = await xrSession.requestReferenceSpace('local');

    // Start hand tracking and data collection
    startHandTracking();

    // Update status message
    statusElement.textContent = "AR session started, collecting data...";

    // Start the timer to collect data every 0.5s for 50s
    startTimer();

    // Update the render state and start the XR frame loop
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, glContext) });
    onXRFrame();
  } catch (err) {
    console.error('Failed to start AR session:', err);
    statusElement.textContent = "Failed to start AR session.";
  }
}

function onSessionEnd() {
  console.log('XR session ended');
  clearInterval(timer);
  downloadCSV();
  statusElement.textContent = "AR session ended. CSV generated.";
}

async function startHandTracking() {
  // Check if hand tracking is supported on the device
  const isHandTrackingSupported = await navigator.xr.isHandTrackingSupported();
  if (!isHandTrackingSupported) {
    console.log("Hand tracking is not supported.");
    statusElement.textContent = "Hand tracking not supported on this device.";
    return;
  }

  // Add an event listener for hand tracking data
  xrSession.addEventListener('selectstart', onHandTrackingData);
}

function onHandTrackingData(event) {
  // Log and extract hand tracking data (position)
  const handData = event.data; // Get the hand position data
  const timestamp = Date.now();
  const handPosition = {
    timestamp,
    x: handData.position.x,
    y: handData.position.y,
    z: handData.position.z,
  };

  // Store the hand position data
  handTrackingData.push(handPosition);
}

function startTimer() {
  let elapsed = 0;
  timer = setInterval(() => {
    elapsed += 0.5;
    if (elapsed >= 50) {
      clearInterval(timer);
      downloadCSV();
    }
  }, 500);
}

function downloadCSV() {
  // Format hand tracking data into CSV
  handTrackingData.forEach((data) => {
    csvData += `${data.timestamp},${data.x},${data.y},${data.z}\n`;
  });

  // Create a Blob for the CSV data
  const blob = new Blob([csvData], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'hand_tracking_data.csv';
  link.click();
}

function onXRFrame() {
  // Request the next animation frame
  xrSession.requestAnimationFrame(onXRFrame);
  // Additional rendering logic could go here (for now it's left empty)
}
