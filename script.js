document.addEventListener('DOMContentLoaded', async () => {
    let markerFilePath = null;
    let transcriptFilePath = null;

    const updateFileStatus = (fileType, filePath) => {
        const statusElement = document.getElementById(`${fileType}-file-status`);
        if (filePath) {
            statusElement.textContent = '✔️';
        } else {
            statusElement.textContent = '❌';
        }
    };

    document.getElementById('select-marker-file').addEventListener('click', async () => {
        markerFilePath = await window.electron.selectFile();
        updateFileStatus('marker', markerFilePath);
    });

    document.getElementById('select-transcript-file').addEventListener('click', async () => {
        transcriptFilePath = await window.electron.selectFile();
        updateFileStatus('transcript', transcriptFilePath);
    });

    document.getElementById('run-script-button').addEventListener('click', async () => {
        if (!markerFilePath || !transcriptFilePath) {
            alert('Please select both files before running the script.');
            return;
        }
        try {
            await window.electron.runPythonScript(transcriptFilePath, markerFilePath);
            alert('Python script executed successfully.');
            location.reload(); // Reload the page
        } catch (error) {
            console.error('Error running Python script:', error);
            alert('An error occurred while running the Python script.');
        }
    });

    try {
        const results = await window.electron.readCSV();
        const tableBody = document.getElementById('csv-body');
        const nightModeToggle = document.getElementById('night-mode-toggle');
        nightModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('night-mode');
        });

        if (results.length === 0) {
            console.warn('No data found in base_table.csv, loading a blank table.');
        }

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
                updateRectangleOverlay(previewTd);
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
                updateRectangleOverlay(previewTd);
            });
            speedTd.appendChild(speedToggleBtn);
            tr.appendChild(speedTd);

            const clickCoordinatesTd = document.createElement('td');
            clickCoordinatesTd.dataset.coordinates = '';
            clickCoordinatesTd.dataset.imgWidth = '';
            clickCoordinatesTd.dataset.imgHeight = '';
            clickCoordinatesTd.classList.add('hidden-cell');
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

                        deleteBtn.addEventListener('click', (event) => {
                            event.stopPropagation();
                            previewTd.innerHTML = 'Drop image here';
                            filePathTd.textContent = '';
                            filePathTd.removeAttribute('data-full-path');
                            clickCoordinatesTd.dataset.coordinates = '';
                            clickCoordinatesTd.dataset.imgWidth = '';
                            clickCoordinatesTd.dataset.imgHeight = '';
                            removeRectangleOverlay(previewTd);
                            tr.classList.remove('active-row');
                        });

                        resetBtn.addEventListener('click', (event) => {
                            event.stopPropagation();
                            updateDotPosition(previewTd, 0, 0);
                            updateRectangleOverlay(previewTd);
                        });

                        img.onload = function () {
                            clickCoordinatesTd.dataset.imgWidth = img.width;
                            clickCoordinatesTd.dataset.imgHeight = img.height;
                            updateRectangleOverlay(previewTd);
                        };

                        img.addEventListener('click', () => {
                            setActiveRow(tr);
                            previewTd.classList.add('active');
                        });

                        const dot = createClickDot(previewTd);
                        dot.classList.add('click-dot');
                        dot.style.left = 'calc(50% - 30px)';
                        dot.style.top = 'calc(50% - 30px)';
                        previewTd.appendChild(dot);

                        dot.addEventListener('mousedown', (event) => {
                            event.preventDefault();
                            setActiveRow(tr);
                            previewTd.classList.add('active');
                            const shiftX = event.clientX - dot.getBoundingClientRect().left;
                            const shiftY = event.clientY - dot.getBoundingClientRect().top;

                            function moveAt(pageX, pageY) {
                                const rect = img.getBoundingClientRect();

                                const scrollX = window.scrollX || window.pageXOffset;
                                const scrollY = window.scrollY || window.pageYOffset;

                                let x = ((pageX - (rect.left + scrollX) - shiftX + 30) / rect.width) * 2 - 1;
                                let y = ((pageY - (rect.top + scrollY) - shiftY + 30) / rect.height) * 2 - 1;

                                const overlayRect = previewTd.querySelector('.overlay-rect');
                                const overlayRectWidth = parseFloat(overlayRect.style.width);
                                const overlayRectHeight = parseFloat(overlayRect.style.height);

                                // Apply boundary constraints to ensure the dot stays within the image bounds
                                x = Math.max((-rect.width + overlayRectWidth) / rect.width, Math.min((rect.width - overlayRectWidth) / rect.width, x));
                                y = Math.max((-rect.height + overlayRectHeight) / rect.height, Math.min((rect.height - overlayRectHeight) / rect.height, y));

                                dot.style.left = `calc(${(x + 1) * 50}% - 30px)`;
                                dot.style.top = `calc(${(y + 1) * 50}% - 30px)`;

                                // Store the coordinates in the closest hidden-cell for later use
                                const coordinates = { x, y };
                                const clickCoordinatesTd = previewTd.closest('tr').querySelector('td.hidden-cell');
                                clickCoordinatesTd.dataset.coordinates = JSON.stringify(coordinates);

                                updateRectangleOverlay(previewTd);
                            }

                            function onMouseMove(event) {
                                moveAt(event.pageX, event.pageY);
                            }

                            const onMouseUpOrLeave = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUpOrLeave);
                                document.removeEventListener('mouseleave', onMouseUpOrLeave);
                            };

                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUpOrLeave);
                            document.addEventListener('mouseleave', onMouseUpOrLeave);
                        });

                        previewTd.addEventListener('click', (event) => {
                            setActiveRow(tr);
                            previewTd.classList.add('active');
                            const rect = img.getBoundingClientRect();
                            const offsetX = event.clientX - rect.left;
                            const offsetY = event.clientY - rect.top;
                            let x = (offsetX / rect.width) * 2 - 1;
                            let y = (offsetY / rect.height) * 2 - 1;

                            const overlayRect = previewTd.querySelector('.overlay-rect');
                            const overlayRectWidth = parseFloat(overlayRect.style.width);
                            const overlayRectHeight = parseFloat(overlayRect.style.height);

                            x = Math.max((-rect.width + overlayRectWidth) / rect.width, Math.min((rect.width - overlayRectWidth) / rect.width, x));
                            y = Math.max((-rect.height + overlayRectHeight) / rect.height, Math.min((rect.height - overlayRectHeight) / rect.height, y));

                            updateDotPosition(previewTd, x, y);
                        });
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Please drop a valid image file.');
                }
            });
        });

        document.addEventListener('keydown', (event) => {
            const activeRow = document.querySelector('.active-row');
            if (!activeRow) return;

            const previewTd = activeRow.querySelector('.drop-cell.active');
            if (!previewTd) return;

            const increment = event.shiftKey ? 0.1 : 0.01;

            switch (event.key) {
                case 'ArrowUp':
                    moveDot(previewTd, 0, -increment);
                    break;
                case 'ArrowDown':
                    moveDot(previewTd, 0, increment);
                    break;
                case 'ArrowLeft':
                    moveDot(previewTd, -increment, 0);
                    break;
                case 'ArrowRight':
                    moveDot(previewTd, increment, 0);
                    break;
            }
        });
    } catch (error) {
        console.error('Error reading CSV:', error);
        const tableBody = document.getElementById('csv-body');
        tableBody.innerHTML = ''; // Load a blank table
    }

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
            const imgWidth = row.cells[7]?.dataset.imgWidth || 1920;
            const imgHeight = row.cells[7]?.dataset.imgHeight || 1080;

            if (markerNumber !== 'Marker Number' && markerTimecode) {
                const coordinates = clickCoordinates ? JSON.parse(clickCoordinates) : { x: 0, y: 0 };
                jsonData.push({
                    markerNumber,
                    markerTimecode,
                    caption,
                    filePath,
                    zoom: zoom || 'zoom_in',
                    speed: speed || 'slow',
                    clickCoordinates: coordinates
                });
            }
        });

        const jsonContent = JSON.stringify(jsonData, null, 2);
        window.electron.saveJSON(jsonContent);
    });
});
