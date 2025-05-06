// Initialize the Image Classifier method with MobileNet
let classifier;
let img;
let chartInstance = null; // To track the current chart instance

// Variables for displaying the results on the canvas
let label = "";
let confidence = "";

function preload() {
    // Load a placeholder image if required
    classifier = ml5.imageClassifier("MobileNet");
}

function setup() {
    // Create the canvas
    const canvas = createCanvas(400, 400);
    canvas.parent('canvasContainer');

    // Set up default text on the canvas
    background(245);
    textAlign(CENTER, CENTER);
    fill(100);
    textSize(18);
    text('Bitte laden Sie ein Bild hoch.', width / 2, height / 2);

    // Set up file upload handling
    const fileInput = document.querySelector('#file-input');
    fileInput.addEventListener('change', handleFileUpload);
}

function handleFileUpload() {
    const fileInput = document.querySelector('#file-input');
    const uploadedFile = fileInput.files[0];

    if (uploadedFile && uploadedFile.type.startsWith('image')) {
        const imgUrl = URL.createObjectURL(uploadedFile);

        loadImage(imgUrl, (loadedImg) => {
            img = loadedImg;

            // Set canvas aspect ratio
            const aspectRatio = img.width / img.height;
            let imgWidth, imgHeight;
            if (aspectRatio > 1) {
                imgWidth = width;
                imgHeight = width / aspectRatio;
            } else {
                imgHeight = height;
                imgWidth = height * aspectRatio;
            }

            // Display the uploaded image
            background(245);
            image(img, (width - imgWidth) / 2, (height - imgHeight) / 2, imgWidth, imgHeight);

            // Start classification
            console.log("Starte Klassifizierung...");
            classifier.classify(img, handleResult);

        }, () => {
            alert('Fehler: Das Bild konnte nicht geladen werden.');
        });
    } else {
        alert('Bitte laden Sie eine gültige Bilddatei hoch!');
    }
}

function handleResult(error, results) {
    const resultsContainer = document.getElementById('results');

    // Sicherstellen, dass der Zielcontainer existiert
    if (!resultsContainer) {
        console.error("Das HTML-Element mit der ID 'results' fehlt.");
        return;
    }

    // Prüfen, ob `error` tatsächlich ein Fehler ist
    if (error) {
        // Prüfen, ob `error` die Ergebnisse enthält (z. B. Array von Objekten)
        if (Array.isArray(error) && error.length > 0 && 'label' in error[0]) {
            console.warn("Der Fehlerparameter enthält eigentlich Ergebnisse. Ergebnisse werden korrigiert.");
            results = error; // Ergebnisse aus `error` übernehmen
            error = null;    // Fehler zurücksetzen
        } else {
            // Handhabung echter Fehler
            console.error("Fehler bei der Klassifikation:", error);
            resultsContainer.innerHTML = `
                <p class="mdc-typography--body2">Es ist ein Fehler aufgetreten: ${JSON.stringify(error)}</p>`;
            return;
        }
    }

    // Verarbeiten der Ergebnisse, falls vorhanden
    if (results && results.length > 0) {
        // Extrahiere Labels und Confidence-Werte
        const labels = results.slice(0, 3).map(result => result.label || "Unbekannt");
        const confidences = results.slice(0, 3).map(result => (result.confidence * 100).toFixed(2));

        // HTML für Ergebnisse erzeugen
        let outputHTML = '<h3 class="mdc-typography--subtitle1">Top 3 Ergebnisse</h3>';
        results.slice(0, 3).forEach((result, index) => {
            outputHTML += `
                <p class="mdc-typography--body1">
                    <strong>${index + 1}. ${result.label}:</strong> ${confidences[index]}%
                </p>`;
        });

        // Diagramm hinzufügen
        outputHTML += `
            <div>
                <canvas id="resultChart" width="400" height="400"></canvas>
            </div>`;

        resultsContainer.innerHTML = outputHTML;

        // Donut-Diagramm rendern
        renderDonutChart(labels, confidences);

        // Ergebnisse in der Konsole anzeigen
        console.log("Ergebnisse verarbeitet:", results);
    } else {
        // Keine Ergebnisse vorhanden
        console.warn('Es wurden keine Ergebnisse zurückgegeben.');
        resultsContainer.innerHTML = `
            <p class="mdc-typography--body2">
                Keine Ergebnisse gefunden. Versuchen Sie es mit einem anderen Bild.
            </p>`;
    }

    // Diagramm-Funktion
    function renderDonutChart(labels, data) {
        const chartCanvas = document.getElementById('resultChart');
        if (!chartCanvas) {
            console.error('Canvas für das Diagramm nicht gefunden.');
            return;
        }

        const ctx = chartCanvas.getContext('2d');

        // Zerstöre die alte Chart-Instanz, falls sie existiert
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: 'doughnut', // Donut-Diagramm
            data: {
                labels: labels,
                datasets: [{
                    label: 'Confidence (%)',
                    data: data, // Confidence-Werte
                    backgroundColor: [
                        'rgb(255, 99, 132)', // Rot
                        'rgb(54, 162, 235)', // Blau
                        'rgb(255, 205, 86)'  // Gelb
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                const label = tooltipItem.label || '';
                                const value = tooltipItem.raw || 0;
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                },
                cutout: '50%' // Durchmesser des Donut-Lochs
            }
        });
    }
}


function saveDonutChart() {
    const canvas = document.getElementById('resultChart');
    if (!canvas) {
        alert("Das Diagramm konnte nicht gefunden werden.");
        return;
    }

    // Erstelle ein temporäres Canvas mit weißem Hintergrund
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');

    // Setze die Größe des temporären Canvas auf die des ursprünglichen
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Zeichne einen weißen Hintergrund
    context.fillStyle = 'white';
    context.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Zeichne das ursprüngliche Diagramm auf das temporäre Canvas
    context.drawImage(canvas, 0, 0);

    // Konvertiere das Canvas mit Hintergrund in eine Daten-URL
    const dataURL = tempCanvas.toDataURL('image/jpeg', 1.0);

    // Erstelle einen Download-Link und starte den Download
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'DonutChart.jpg'; // Dateiname
    link.click();
}
function saveDonutAndLabels() {
    // Der Bereich, der das Diagramm und die Ergebnisse enthält
    const container = document.getElementById('chartContainer');

    // `html2canvas` rendern
    html2canvas(container, {
        backgroundColor: "white" // Weißer Hintergrund für Export
    }).then((canvas) => {
        // Konvertiere das gerenderte Canvas in ein Bild
        const dataURL = canvas.toDataURL("image/jpeg", 1.0);

        // Initiere den Download des generierten Bildes
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = "DonutChartWithLabels.jpg"; // Bildname
        link.click();
    });
}