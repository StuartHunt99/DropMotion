document.addEventListener('DOMContentLoaded', async () => {
    try {
        const results = await window.electron.readCSV();
        const tableBody = document.getElementById('csv-body');

        results.forEach(row => {
            const tr = document.createElement('tr');

            const markerNumberTd = document.createElement('td');
            markerNumberTd.textContent = row['Marker Number'];
            tr.appendChild(markerNumberTd);

            const markerTimecodeTd = document.createElement('td');
            markerTimecodeTd.textContent = row['Marker Timecode'];
            tr.appendChild(markerTimecodeTd);

            const captionTd = document.createElement('td');
            captionTd.textContent = row['Closest Transcript Segment'];
            tr.appendChild(captionTd);

            const filePathTd = document.createElement('td');
            filePathTd.classList.add('file-path');
            tr.appendChild(filePathTd);

            const previewTd = document.createElement('td');
            previewTd.classList.add('drop-cell');
            previewTd.textContent = 'Drop image here';
            tr.appendChild(previewTd);

            const zoomTd = document.createElement('td');
            const zoomToggleBtn = document.createElement('button');
            zoomToggleBtn.textContent = 'Zoom In';
            zoomToggleBtn.classList.add('toggle-btn');
            zoomToggleBtn.dataset.state = 'zoom_in';
            zoomToggleBtn.addEventListener('click', () => {
                if (zoomToggleBtn.dataset.state === 'zoom_in') {
                    zoomToggleBtn.textContent = 'Zoom Out';
                    zoomToggleBtn.dataset.state = 'zoom_out';
                    zoomToggleBtn.classList.add('red');
                } else {
                    zoomToggleBtn.textContent = 'Zoom In';
                    zoomToggleBtn.dataset.state = 'zoom_in';
                    zoomToggleBtn.classList.remove('red');
                }
            });
            zoomTd.appendChild(zoomToggleBtn);
            tr.appendChild(zoomTd);

            const speedTd = document.createElement('td');
            const speedToggleBtn = document.createElement('button');
            speedToggleBtn.textContent = 'Slow';
            speedToggleBtn.classList.add('toggle-btn');
            speedToggleBtn.dataset.state = 'slow';
            speedToggleBtn.addEventListener('click', () => {
                if (speedToggleBtn.dataset.state === 'slow') {
                    speedToggleBtn.textContent = 'Fast';
                    speedToggleBtn.dataset.state = 'fast';
                    speedToggleBtn.classList.add('red');
                } else {
                    speedToggleBtn.textContent = 'Slow';
                    speedToggleBtn.dataset.state = 'slow';
                    speedToggleBtn.classList.remove('red');
                }
            });
            speedTd.appendChild(speedToggleBtn);
            tr.appendChild(speedTd);

            const clickCoordinatesTd = document.createElement('td');
            clickCoordinatesTd.dataset.coordinates = '';
            tr.appendChild(clickCoordinatesTd);

            tableBody.appendChild(tr);

            previewTd.addEventListener('dragover', (event) => {
                event.preventDefault();
                previewTd.classList.add('dragover');
            });

            previewTd.addEventListener('dragleave', () => {
                previewTd.classList.remove('dragover');
            });

            previewTd.addEventListener('drop', (event) => {
                event.preventDefault();
                previewTd.classList.remove('dragover');
                const file = event.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.classList.add('thumbnail');
                        previewTd.innerHTML = '';
                        previewTd.appendChild(img);

                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = 'X';
                        deleteBtn.classList.add('delete-btn');
                        previewTd.appendChild(deleteBtn);

                        filePathTd.textContent = file.path;
                        filePathTd.setAttribute('data-full-path', file.path);

                        deleteBtn.addEventListener('click', () => {
                            previewTd.innerHTML = 'Drop image here';
                            filePathTd.textContent = '';
                            filePathTd.removeAttribute('data-full-path');
                            clickCoordinatesTd.dataset.coordinates = '';
                        });

                        img.addEventListener('click', (event) => {
                            const rect = img.getBoundingClientRect();
                            const x = ((event.clientX - rect.left) / rect.width).toFixed(2);
                            const y = ((event.clientY - rect.top) / rect.height).toFixed(2);

                            const coordinates = { x, y };
                            clickCoordinatesTd.dataset.coordinates = JSON.stringify(coordinates);

                            // Log coordinates to the console for debugging
                            console.log('Click coordinates relative to the image:', coordinates);

                            const dot = document.createElement('div');
                            dot.classList.add('click-dot');
                            dot.style.left = `calc(${x * 100}% - 5px)`;  // Center the dot horizontally
                            dot.style.top = `calc(${y * 100}% - 5px)`;   // Center the dot vertically

                            previewTd.style.position = 'relative';
                            previewTd.innerHTML = '';
                            previewTd.appendChild(img);
                            previewTd.appendChild(dot);
                            previewTd.appendChild(deleteBtn);
                        });
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Please drop an image file.');
                }
            });
        });
    } catch (error) {
        console.error('Error reading CSV:', error);
    }
});

document.getElementById('save-button').addEventListener('click', () => {
    const rows = document.querySelectorAll('#csv-table tr');
    const csvData = [];

    csvData.push('Marker Number,Marker Timecode,File Path,Zoom,Speed,Click Coordinates');

    rows.forEach(row => {
        const markerNumber = row.cells[0]?.textContent;
        const markerTimecode = row.cells[1]?.textContent;
        const filePath = row.cells[3]?.textContent;
        const zoom = row.cells[5]?.querySelector('button')?.dataset.state;
        const speed = row.cells[6]?.querySelector('button')?.dataset.state;
        const clickCoordinates = row.cells[7]?.dataset.coordinates || '';

        if (markerNumber !== 'Marker Number' && markerTimecode) {
            const rowData = [markerNumber, markerTimecode, filePath || '', zoom || 'zoom_in', speed || 'slow', clickCoordinates];
            csvData.push(rowData.join(','));
        }
    });

    const csvContent = csvData.join('\n');
    window.electron.saveCSV(csvContent);
});

document.getElementById('save-json-button').addEventListener('click', () => {
    const rows = document.querySelectorAll('#csv-table tr');
    const jsonData = [];

    rows.forEach(row => {
        const markerNumber = row.cells[0]?.textContent;
        const markerTimecode = row.cells[1]?.textContent;
        const caption = row.cells[2]?.textContent;
        const filePath = row.cells[3]?.textContent;
        const zoom = row.cells[5]?.querySelector('button')?.dataset.state;
        const speed = row.cells[6]?.querySelector('button')?.dataset.state;
        const clickCoordinates = row.cells[7]?.dataset.coordinates || '';

        if (markerNumber !== 'Marker Number' && markerTimecode) {
            jsonData.push({
                markerNumber,
                markerTimecode,
                caption,
                filePath,
                zoom: zoom || 'zoom_in',
                speed: speed || 'slow',
                clickCoordinates: clickCoordinates ? JSON.parse(clickCoordinates) : {}
            });
        }
    });

    const jsonContent = JSON.stringify(jsonData, null, 2);
    window.electron.saveJSON(jsonContent);
});
