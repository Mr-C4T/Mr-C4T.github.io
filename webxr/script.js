// Declare necessary variables
let xrSession = null;
let gl = null;
let xrReferenceSpace = null;
let controller = null;
let controllerData = [];
let timer = null;
let csvData = "timestamp,x,y,z\n";

// Get elements from the DOM
const startARButton = document.getElementById('start-ar-button');
const statusElement = document.getElementById('status');

// Set up WebGL rendering
function setupWebGL(canvas) {
  gl = canvas.getContext("webgl", { xrCompatible: true });
  const clearColor = [33 / 255, 33 / 255, 33 / 255, 1.0]; // Dark grey background
  gl.clearColor(...clearColor);
}

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

  // Start immersive AR session
  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local']
    });

    // Get XR reference space
    xrReferenceSpace = await xrSession.requestReferenceSpace('local');

    // Set up WebGL for XR rendering
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    setupWebGL(canvas);

    // Start XR rendering loop
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });
    xrSession.requestAnimationFrame(onXRFrame);

    // Monitor controllers
    startControllerTracking();

    // Start recording timer
    startTimer();

    statusElement.textContent = "AR session started, collecting data...";
  } catch (err) {
    console.error("Failed to start AR session:", err);
    statusElement.textContent = "Failed to start AR session.";
  }
}

function startControllerTracking() {
  // Detect input sources (controllers)
  xrSession.addEventListener('inputsourceschange', () => {
    const inputSources = Array.from(xrSession.inputSources);
    controller = inputSources.find((source) => source.targetRayMode === 'tracked-pointer');

    if (controller) {
      console.log("Controller detected:", controller);
      statusElement.textContent = "Controller detected. Collecting data...";
    } else {
      console.log("No controller detected.");
      statusElement.textContent = "No controller detected. Please connect a controller.";
    }
  });
}

function startTimer() {
  let elapsed = 0;
  timer = setInterval(() => {
    elapsed += 0.5;
    if (elapsed >= 25) {
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

  // Get controller's pose
  const frame = xrSession.requestAnimationFrame(() => {
    const pose = xrSession.getPose(controller.targetRaySpace, xrReferenceSpace);
    if (pose) {
      const position = pose.transform.position;
      const timestamp = Date.now();
      csvData += `${timestamp},${position.x},${position.y},${position.z}\n`;
      console.log(`Logged data: ${timestamp}, ${position.x}, ${position.y}, ${position.z}`);
    } else {
      console.log("No valid position data from controller.");
    }
  });
}

function downloadCSV() {
  const blob = new Blob([csvData], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'controller_tracking_data.csv';
  link.click();
}

function onXRFrame(t, frame) {
  // Request the next animation frame
  xrSession.requestAnimationFrame(onXRFrame);

  // Clear the WebGL canvas
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get controller pose and render a cube
  if (controller && controller.targetRaySpace) {
    const pose = frame.getPose(controller.targetRaySpace, xrReferenceSpace);
    if (pose) {
      const position = pose.transform.position;
      drawCube(position.x, position.y, position.z);
    }
  }
}

// Render a cube at the given position
function drawCube(x, y, z) {
  // Example: Render a simple cube at the given position
  const size = 0.1; // Cube size
  gl.beginPath();
  gl.translate(x, y, z);
  gl.fillStyle = "#39ff14"; // Neon green cube
  gl.fillRect(-size / 2, -size / 2, size, size);
  gl.restore();
}
