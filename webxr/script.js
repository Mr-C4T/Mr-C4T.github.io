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

document.getElementById('recordButton').addEventListener('click', ()=> {
    recording = !recording;
    if (recording) {
        document.getElementById('recordButton').textContent = 'Stop Recording';
    } else {
        document.getElementById('recordButton').textContent = 'Record Position and Orientation';
    }
});

navigator.xr.requestDevice()
    .then((device) => {
        device.addEventListener('inputsconnected', (event) => {
            for (let input of event.inputs) {
                if (input.target && input.target.handedness ===
'right') {
                    controller = input;
                }
            }
        });
    })
    .catch((error) => {
        console.error('Error requesting XR device:', error);
    });

initXR();