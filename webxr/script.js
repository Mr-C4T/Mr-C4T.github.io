let xrSession = null;
let selectedHand = "left";
let selectedJoint = null;
let jointData = [];
let recording = false;
let recordDuration = 5;

// DOM Elements
const startARButton = document.getElementById("start-ar");
const handSelector = document.getElementById("hand-selector");
const jointSelector = document.getElementById("joint-selector");
const durationSlider = document.getElementById("duration-slider");
const durationDisplay = document.getElementById("duration-display");
const startRecordingButton = document.getElementById("start-recording");
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

// Start AR session
startARButton.addEventListener("click", async () => {
    if (navigator.xr && navigator.xr.isSessionSupported) {
        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        if (supported) {
            xrSession = await navigator.xr.requestSession("immersive-ar");
            document.getElementById("webgl-canvas").style.display = "block";
            console.log("AR Session started.");
        } else {
            alert("AR immersive mode not supported on this device.");
        }
    } else {
        alert("WebXR not supported in this browser.");
    }
});

// Handle hand selection
handSelector.addEventListener("change", (e) => {
    selectedHand = e.target.value;
    console.log(`Selected hand: ${selectedHand}`);
});

// Handle joint selection
jointSelector.addEventListener("change", (e) => {
    selectedJoint = e.target.value;
    console.log(`Selected joint: ${selectedJoint}`);
});

// Start recording
startRecordingButton.addEventListener("click", () => {
    if (!xrSession) {
        alert("Start an AR session before recording!");
        return;
    }
    if (!selectedJoint) {
        alert("Select a joint to record.");
        return;
    }
    recording = true;
    jointData = [];
    console.log(`Recording ${selectedJoint} on ${selectedHand} hand for ${recordDuration} seconds.`);

    setTimeout(() => {
        recording = false;
        downloadButton.style.display = "block";
        console.log("Recording stopped. Data ready to download.");
    }, recordDuration * 1000);
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
