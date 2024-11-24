// Declare necessary variables
let xrSession = null;
let controller = null;
let controllerData = [];
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

  // Try to start an immersive AR session with controller tracking
  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local'],
    });

    // Listen for session end event
    xrSession.addEventListener('end', onSessionEnd);

    // Get the reference space for tracking
    xrReferenceSpace = await xrSession.requestReferenceSpace('local');

    // Check for available controllers and start tracking
    startControllerTracking();

    // Update status message
    statusElement.textContent = "AR session started, collecting data...";

    // Start the timer to collect data every 0.5s for 50s
    startTimer();

    // Start the XR frame loop
    xrSession.requestAnimationFrame(onXRFrame);
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

async function startControllerTracking() {
  // Get the list of input sources (controllers or devices)
  xrSession.addEventListener('inputsourceschange', () => {
    // Update controller when new input sources are detected
    const inputSources = Array.from(xrSession.inputSources);
    controller = inputSources.find((source) => source.targetRayMode === 'tracked-pointer');

    if (!controller) {
      console.log("No controller detected.");
      statusElement.textContent = "No controller detected. Please connect a controller.";
    } else {
      console.log("Controller detected:", controller);
      statusElement.textContent = "Controller detected. Collecting data...";
    }
  });
}

function startTimer() {
  let elapsed = 0;
  timer = setInterval(() => {
    elapsed += 0.5;
    if (elapsed >= 50) {
      clearInterval(timer);
      downloadCSV();
    } else {
      collectControllerData();
    }
  }, 500);
}

function collectControllerData() {
  if (!controller || !controller.gamepad) {
    console.log("No controller data available.");
    return;
  }

  // Use the gamepad's pose data to track position
  const pose = controller.targetRaySpace;
  const timestamp = Date.now();

  // Check if a pose is available
  const frameOfReference = xrSession.getViewerPose(xrReferenceSpace);
  if (frameOfReference && frameOfReference.views[0].transform) {
    const position = frameOfReference.views[0].transform.position;
    csvData += `${timestamp},${position.x},${position.y},${position.z}\n`;
    console.log(`Logged data: ${timestamp}, ${position.x}, ${position.y}, ${position.z}`);
  }
}

function downloadCSV() {
  // Create a Blob for the CSV data
  const blob = new Blob([csvData], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'controller_tracking_data.csv';
  link.click();
}

function onXRFrame(t, frame) {
  // Request the next animation frame
  xrSession.requestAnimationFrame(onXRFrame);

  // Render logic could go here if needed
}
