// Fetch JSON data from a file
fetch('hand.json') // Ensure 'data.json' is in the same directory as 'index.html'
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  })
  .then(jsonData => {
    // Extract data for the first joint ("wrist")
    const positionX = jsonData.map(step => step.wrist.position.x);
    const positionY = jsonData.map(step => step.wrist.position.y);
    const positionZ = jsonData.map(step => step.wrist.position.z);
    const orientationX = jsonData.map(step => step.wrist.orientation.x);
    const orientationY = jsonData.map(step => step.wrist.orientation.y);
    const orientationZ = jsonData.map(step => step.wrist.orientation.z);

    // Create the chart
    const ctx = document.getElementById("handTrackingChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: Array.from({ length: jsonData.length }, (_, i) => `Step ${i + 1}`),
        datasets: [
            {
              //label: "Position X",
              data: positionX,
              borderColor: "rgba(0, 255, 0, 0.8)",
              borderWidth: 2,
              fill: true,
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

