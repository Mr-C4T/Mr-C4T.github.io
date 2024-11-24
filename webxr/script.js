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
const indicatorElement = document.createElement('div'); // Visual indicator

// Add the visual indicator to the page
indicatorElement.style.width = "20px";
indicatorElement.style.height = "20px";
indicatorElement.style.borderRadius = "50%";
indicatorElement.style.backgroundColor = "red"; // Default: No controller
indicatorElement.style.margin = "20px auto";
indicatorElement.style.boxShadow = "0px 0px 10px rgba(255, 0, 0, 0.8)";
indicatorElement.style.display = "inline-block";
document.getElementById('webxr-container').appendChild(indicatorElement);

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

    // Start monitoring input sources (controllers)
    startControllerTracking();

    // Verify controllers and log initial data
    const initialPositionAvailable = await verifyControllerPosition();
    if (!initialPositionAvailable) {
      statusElement.textContent = "Controller position unavailable. Please adjust or reconnect.";
      console.error("No valid position data from controller.");
      return;
    }

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
  indicatorElement.style.backgroundColor = "red"; // No controller
  indicatorElement.style.boxShadow = "0px 0px 10px rgba(255, 0, 0, 0.8)";
}

function startControllerTracking() {
  // Listen for input sources and detect controllers
  xrSession.addEventListener('inputsourceschange', () => {
    const inputSources = Array.from(xrSession.inputSources);
    controller = inputSources.find((source) => source.targetRayMode === 'tracked-pointer');

    if (controller) {
      console.log("Controller detected:", controller);
      statusElement.textContent = "Controller detected. Collecting data...";
      indicatorElement.style.backgroundColor = "limegreen"; // Controller active
      indicatorElement.style.boxShadow = "0px 0px 20px rgba(50, 255, 50, 0.8)";
    } else {
      console.log("No controller detected.");
      statusElement.textContent = "No controller detected. Please connect a controller.";
      indicatorElement.style.backgroundColor = "red"; // No controller
      indicatorElement.style.boxShadow = "0px 0px 10px rgba(255, 0, 0, 0.8)";
    }
  });
}

async function verifyControllerPosition() {
  if (!controller || !controller.targetRaySpace) {
    console.log("No valid controller detected.");
    return false;
  }

  // Check if the controller's position is trackable
  const pose = await xrSession.requestAnimationFrame(() => {
    const viewerPose = xrSession.getViewerPose(xrReferenceSpace);
    return viewerPose?.views[0]?.transform?.position ?? null;
  });

  if (!pose) {
    console.log("Controller position is not available.");
    return false;
  }

  console.log("Controller initial position verified:", pose);
  return true;
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
  if (!controller || !controller.targetRaySpace) {
    console.log("No controller data available.");
    return;
  }

  // Request the current pose of the controller
  const frameOfReference = xrSession.getViewerPose(xrReferenceSpace);
  if (frameOfReference && frameOfReference.views[0]?.transform?.position) {
    const position = frameOfReference.views[0].transform.position;
    const timestamp = Date.now();
    csvData += `${timestamp},${position.x},${position.y},${position.z}\n`;
    console.log(`Logged data: ${timestamp}, ${position.x}, ${position.y}, ${position.z}`);
  } else {
    console.log("No valid position data.");
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
}
