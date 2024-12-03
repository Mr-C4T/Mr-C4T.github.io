// Fetch JSON data from a file
fetch('hand.json') // Ensure 'hand.json' is in the same directory as 'index.html'
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  })
  .then(jsonData => {
    // Function to downsample data to 1/10th
    const downsample = (array, factor) => array.filter((_, index) => index % factor === 0);

    const downsampleFactor = 500; // Show only 1/10th of the points

    // Downsampled data for the first joint ("wrist")
    const positionX = downsample(jsonData.map(step => step.wrist.position.x), downsampleFactor);
    const positionY = downsample(jsonData.map(step => step.wrist.position.y), downsampleFactor);
    const positionZ = downsample(jsonData.map(step => step.wrist.position.z), downsampleFactor);
    const orientationX = downsample(jsonData.map(step => step.wrist.orientation.x), downsampleFactor);
    const orientationY = downsample(jsonData.map(step => step.wrist.orientation.y), downsampleFactor);
    const orientationZ = downsample(jsonData.map(step => step.wrist.orientation.z), downsampleFactor);

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
            label: "Position X",
            data: positionX,
            borderColor: "rgba(0, 255, 0, 0.8)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
          {
            label: "Position Y",
            data: positionY,
            borderColor: "rgba(0, 200, 0, 0.8)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
          {
            label: "Position Z",
            data: positionZ,
            borderColor: "rgba(0, 150, 0, 0.8)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
          {
            label: "Orientation X",
            data: orientationX,
            borderColor: "rgba(150, 0, 255, 0.8)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
          {
            label: "Orientation Y",
            data: orientationY,
            borderColor: "rgba(100, 0, 200, 0.8)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
          {
            label: "Orientation Z",
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
  })
  .catch(error => console.error('Error loading JSON:', error));
