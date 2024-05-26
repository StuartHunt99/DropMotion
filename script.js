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

                        const resetBtn = document.createElement('button');
                        resetBtn.textContent = '↺';
                        resetBtn.classList.add('reset-btn');
                        previewTd.appendChild(resetBtn);

                        filePathTd.textContent = file.path;
                        filePathTd.setAttribute('data-full-path', file.path);

                        deleteBtn.addEventListener('click', () => {
                            previewTd.innerHTML = 'Drop image here';
                            filePathTd.textContent = '';
                            filePathTd.removeAttribute('data-full-path');
                            clickCoordinatesTd.dataset.coordinates = '';
                        });

                        resetBtn.addEventListener('click', () => {
                            updateDotPosition(0, 0);
                        });

                        // Function to update coordinates and dot position
                        function updateDotPosition(x, y) {
                            const coordinates = { x, y };
                            clickCoordinatesTd.dataset.coordinates = JSON.stringify(coordinates);
                            console.log('Click coordinates relative to the image:', coordinates);

                            const dot = previewTd.querySelector('.click-dot');
                            dot.style.left = `calc(${(parseFloat(x) + 0.5) * 100}% - 5px)`;
                            dot.style.top = `calc(${(parseFloat(y) + 0.5) * 100}% - 5px)`;
                        }

                        // Create and position the initial dot at the center
                        const dot = document.createElement('div');
                        dot.classList.add('click-dot');
                        dot.style.left = 'calc(50% - 5px)';
                        dot.style.top = 'calc(50% - 5px)';
                        previewTd.appendChild(dot);

                        // Make the dot draggable
                        dot.addEventListener('mousedown', (event) => {
                            event.preventDefault();
                            const shiftX = event.clientX - dot.getBoundingClientRect().left;
                            const shiftY = event.clientY - dot.getBoundingClientRect().top;

                            function moveAt(pageX, pageY) {
                                const rect = img.getBoundingClientRect();
                                let x = ((pageX - rect.left - shiftX + 5) / rect.width - 0.5).toFixed(2);
                                let y = ((pageY - rect.top - shiftY + 5) / rect.height - 0.5).toFixed(2);
                                if (x > 0.5) x = 0.5;
                                if (x < -0.5) x = -0.5;
                                if (y > 0.5) y = 0.5;
                                if (y < -0.5) y = -0.5;
                                updateDotPosition(x, y);
                            }

                            function onMouseMove(event) {
                                moveAt(event.pageX, event.pageY);
                            }

                            document.addEventListener('mousemove', onMouseMove);

                            dot.onmouseup = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                dot.onmouseup = null;
                            };
                        });

                        dot.ondragstart = () => {
                            return false;
                        };

                        img.addEventListener('click', (event) => {
                            const rect = img.getBoundingClientRect();
                            const x = ((event.clientX - rect.left) / rect.width - 0.5).toFixed(2);
                            const y = ((event.clientY - rect.top) / rect.height - 0.5).toFixed(2);
                            updateDotPosition(x, y);
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
            const coordinates = clickCoordinates ? JSON.parse(clickCoordinates) : { x: 0, y: 0 };
            // Invert the coordinates for export
            const invertedCoordinates = {
                x: (-coordinates.x).toFixed(2),
                y: (-coordinates.y).toFixed(2)
            };
            jsonData.push({
                markerNumber,
                markerTimecode,
                caption,
                filePath,
                zoom: zoom || 'zoom_in',
                speed: speed || 'slow',
                clickCoordinates: invertedCoordinates
            });
        }
    });

    const jsonContent = JSON.stringify(jsonData, null, 2);
    window.electron.saveJSON(jsonContent);
});
