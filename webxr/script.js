let controller = null;
let recording = false;
const recordedData = [];

async function initXR() {
    if (await navigator.xr.isSessionSupported('immersive-ar')) {
        await startRecording();
    } else {
        console.error('WebXR not supported on this device.');
    }
}

async function startRecording() {
    const session = await navigator.xr.requestSession('immersive-ar');
    session.addEventListener('end', stopRecording);

    session.updateRenderState({
        baseLayer: new XRWebGLLayer(session,
canvas.getContext('webgl'))
    });

    const referenceSpace = await
session.requestReferenceSpace('local');
    await session.requestAnimationFrame(frame);
}

function stopRecording() {
    recording = false;
    console.log('Recording stopped.');
    displayRecordedData();
}

function displayRecordedData() {
    const output = document.getElementById('output');
    output.textContent = JSON.stringify(recordedData, null, 2);

    // Display the last recorded controller position
    if (recordedData.length > 0) {
        const lastPose = recordedData[recordedData.length - 1];
        document.getElementById('lastPosition').textContent = `X:
${lastPose.position.x.toFixed(2)}, Y:
${lastPose.position.y.toFixed(2)}, Z:
${lastPose.position.z.toFixed(2)}`;
    } else {
        document.getElementById('lastPosition').textContent = 'No data recorded yet.';
    }
}

async function frame(time, xrFrame) {
    if (recording && controller) {
        const pose = await controller.getPose(referenceSpace);
        if (pose) {
            recordedData.push({
                time: new Date().toISOString(),
                position: pose.transform.position,
                orientation: pose.transform.orientation,
                buttonPressed: controller.buttonPresses
            });
        }
    }

    session.requestAnimationFrame(frame);
}

document.getElementById('recordButton').addEventListener('click', () => {
    recording = !recording;
    if (recording) {
        document.getElementById('recordButton').textContent = 'Stop Recording';
    } else {
        document.getElementById('recordButton').textContent = 'Record Position and Orientation';
    }
});

navigator.xr.requestDevice()
    .then((device) => {
        device.addEventListener('inputsconnected', updateControllers);
        device.addEventListener('inputsdisconnected',
updateControllers);
    })
    .catch((error) => {
        console.error('Error requesting XR device:', error);
    });

function updateControllers(event) {
    const controllersList =
document.getElementById('controllersList');

controllersList.innerHTML = ''; // Clear existing list

    if (event.inputSources.length === 0) {
        controllersList.textContent = 'No controllers detected.';
    } else {
        event.inputSources.forEach((source, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `Controller ${index + 1}`;
            controllersList.appendChild(listItem);
        });
    }
}

initXR()