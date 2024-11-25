// Declare necessary variables
let xrSession = null;
let gl = null;
let xrReferenceSpace = null;
let controller = null;
let controllerData = [];
let timer = null;
let csvData = "timestamp,x,y,z\n";

// Get elements from the DOM
const startARButton = document.getElementById("start-ar-button");
const statusElement = document.getElementById("status");

// Set up WebGL rendering
function setupWebGL(canvas) {
  gl = canvas.getContext("webgl", { xrCompatible: true });
  const clearColor = [33 / 255, 33 / 255, 33 / 255, 1.0]; // Dark grey background
  gl.clearColor(...clearColor);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

// Listen for the Start AR button click
startARButton.addEventListener("click", startAR);

async function startAR() {
  // Check WebXR support
  if (!navigator.xr) {
    statusElement.textContent = "WebXR not supported on this device.";
    console.error("WebXR not supported.");
    return;
  }

  // Check if AR is supported
  const arSupported = await navigator.xr.isSessionSupported("immersive-ar");
  if (!arSupported) {
    console.warn("AR feature not supported, falling back to VR.");
    statusElement.textContent = "AR not supported. Trying VR...";
  }

  // Start XR session
  try {
    xrSession = await navigator.xr.requestSession(arSupported ? "immersive-ar" : "immersive-vr", {
      requiredFeatures: ["local"],
    });

    xrReferenceSpace = await xrSession.requestReferenceSpace("local");

    // WebGL setup
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    setupWebGL(canvas);

    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });
    xrSession.requestAnimationFrame(onXRFrame);

    startControllerTracking();
    startTimer();

    statusElement.textContent = arSupported ? "AR session started." : "VR session started.";
  } catch (err) {
    console.error("Failed to start XR session:", err);
    statusElement.textContent = "Failed to start XR session.";
  }
}

function startControllerTracking() {
  // Detect input sources (controllers)
  xrSession.addEventListener("inputsourceschange", () => {
    const inputSources = Array.from(xrSession.inputSources);
    controller = inputSources.find((source) => source.targetRayMode === "tracked-pointer");

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
  const blob = new Blob([csvData], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "controller_tracking_data.csv";
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
  const size = 0.1; // Cube size

  // Create a buffer for the cube's vertices
  const vertices = new Float32Array([
    x - size, y - size, z,
    x + size, y - size, z,
    x + size, y + size, z,
    x - size, y + size, z,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4); // Draw the cube as a 2D square for simplicity
}
