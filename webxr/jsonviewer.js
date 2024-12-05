// Retrieve JSON data from local storage
const datasetJSON = localStorage.getItem('handTrackingDataset');

if (datasetJSON) {
    try {
        const jsonData = JSON.parse(datasetJSON); // Parse the JSON string

        // Dynamically determine the first joint in the dataset
        const firstJointName = Object.keys(jsonData[0])[0];
        if (!firstJointName) {
            throw new Error("Dataset is empty or has no joints.");
        }
        console.log(`Using first joint: ${firstJointName}`);

        // Function to downsample data
        const downsample = (array, factor) => array.filter((_, index) => index % factor === 0);

        const totalSteps = jsonData.length;
        const desiredSteps = 50;
        const downsampleFactor = Math.ceil(totalSteps / desiredSteps);

        // Downsampled data for the first joint
        const positionX = downsample(jsonData.map(step => step[firstJointName].position.x), downsampleFactor);
        const positionY = downsample(jsonData.map(step => step[firstJointName].position.y), downsampleFactor);
        const positionZ = downsample(jsonData.map(step => step[firstJointName].position.z), downsampleFactor);
        const orientationX = downsample(jsonData.map(step => step[firstJointName].orientation.x), downsampleFactor);
        const orientationY = downsample(jsonData.map(step => step[firstJointName].orientation.y), downsampleFactor);
        const orientationZ = downsample(jsonData.map(step => step[firstJointName].orientation.z), downsampleFactor);

        // Generate labels for the downsampled data
        const labels = downsample(
            Array.from({ length: jsonData.length }, (_, i) => `Step ${i + 1}`),
            downsampleFactor
        );

        // Create the chart
        const ctx = document.getElementById("handTrackingChart").getContext("2d");
        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Position X (${firstJointName})`,
                        data: positionX,
                        borderColor: "rgba(0, 255, 0, 0.8)",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                    },
                    {
                        label: `Position Y (${firstJointName})`,
                        data: positionY,
                        borderColor: "rgba(0, 200, 0, 0.8)",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                    },
                    {
                        label: `Position Z (${firstJointName})`,
                        data: positionZ,
                        borderColor: "rgba(0, 150, 0, 0.8)",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                    },
                    {
                        label: `Orientation X (${firstJointName})`,
                        data: orientationX,
                        borderColor: "rgba(150, 0, 255, 0.8)",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                    },
                    {
                        label: `Orientation Y (${firstJointName})`,
                        data: orientationY,
                        borderColor: "rgba(100, 0, 200, 0.8)",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                    },
                    {
                        label: `Orientation Z (${firstJointName})`,
                        data: orientationZ,
                        borderColor: "rgba(50, 0, 150, 0.8)",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: "rgba(0, 255, 0, 0.8)",
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            color: "#fff",
                        },
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                        },
                    },
                    y: {
                        ticks: {
                            color: "#fff",
                        },
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                        },
                    },
                },
            },
        });
    } catch (error) {
        console.error('Failed to parse dataset JSON:', error);
    }
} else {
    console.error('No dataset found in local storage.');
    alert("No dataset available. Please generate and try again.");
}
