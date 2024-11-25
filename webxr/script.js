let xrSession = null;
let xrRefSpace = null;
let recording = false;
let jointData = [];
let selectedHand = "left";
let selectedJoint = null;
let recordDuration = 5;

// DOM Elements
const startARButton = document.getElementById("start-ar");
const handSelector = document.getElementById("hand-selector");
const jointSelector = document.getElementById("joint-selector");
const durationSlider = document.getElementById("duration-slider");
const durationDisplay = document.getElementById("duration-display");
const downloadButton = document.getElementById("download-data");

// Populate joint dropdown
const handJoints = [
    "wrist", "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal",
    "index-metacarpal", "index-phalanx-proximal", "index-phalanx-intermediate",
    "index-phalanx-distal", "middle-metacarpal", "middle-phalanx-proximal",
    "middle-phalanx-intermediate", "middle-phalanx-distal", "ring-metacarpal",
    "ring-phalanx-proximal", "ring-phalanx-intermediate", "ring-phalanx-distal",
    "pinky-metacarpal", "pinky-phalanx-proximal", "pinky-phalanx-intermediate",
    "pinky-phalanx-distal"
];

jointSelector.innerHTML = handJoints.map(joint => `<option value="${joint}">${joint}</option>`).join("");

// Update duration display
durationSlider.addEventListener("input", () => {
    recordDuration = parseInt(durationSlider.value);
    durationDisplay.textContent = `${recordDuration} seconds`;
});

// Combined AR and Recording Logic
startARButton.addEventListener("click", async () => {
    if (!navigator.xr || !navigator.xr.isSessionSupported) {
        alert("WebXR not supported in this browser.");
        return;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    if (!supported) {
        alert("AR immersive mode not supported on this device.");
        return;
    }

    // Start AR Session
    xrSession = await navigator.xr.requestSession("immersive-ar");
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl", { xrCompatible: true });
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });
    xrRefSpace = await xrSession.requestReferenceSpace("local");

    // Start Recording
    startRecording();
});

function startRecording() {
    if (!xrSession) {
        alert("AR session not active.");
        return;
    }
    if (!selectedJoint) {
        alert("Select a joint to record.");
        return;
    }

    recording = true;
    jointData = [];
    console.log(`Recording ${selectedJoint} on ${selectedHand} hand for ${recordDuration} seconds.`);

    const stopTime = Date.now() + recordDuration * 1000;

    function onXRFrame(time, frame) {
        if (!recording) return;

        const inputSources = xrSession.inputSources;
        inputSources.forEach(source => {
            if (source.handedness === selectedHand && source.hand) {
                const joint = source.hand.get(selectedJoint);
                if (joint) {
                    const jointPose = frame.getJointPose(joint, xrRefSpace);
                    if (jointPose) {
                        jointData.push({
                            time: Date.now(),
                            position: jointPose.transform.position,
                            orientation: jointPose.transform.orientation
                        });
                    }
                }
            }
        });

        if (Date.now() >= stopTime) {
            recording = false;
            xrSession.requestAnimationFrame(null); // Stop rendering
            downloadButton.style.display = "block";
            console.log("Recording stopped. Data ready to download.");
        } else {
            xrSession.requestAnimationFrame(onXRFrame); // Continue recording
        }
    }

    xrSession.requestAnimationFrame(onXRFrame);
}

// Handle hand and joint selection
handSelector.addEventListener("change", (e) => {
    selectedHand = e.target.value;
    console.log(`Selected hand: ${selectedHand}`);
});

jointSelector.addEventListener("change", (e) => {
    selectedJoint = e.target.value;
    console.log(`Selected joint: ${selectedJoint}`);
});

// Download recorded data
downloadButton.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(jointData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hand-joint-data.json";
    link.click();
    URL.revokeObjectURL(url);
});
