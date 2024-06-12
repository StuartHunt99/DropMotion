document.addEventListener('DOMContentLoaded', async () => {
    try {
        const results = await window.electron.readCSV();
        const tableBody = document.getElementById('csv-body');
        const nightModeToggle = document.getElementById('night-mode-toggle');
        nightModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('night-mode');
        });

        function updateRectangleOverlay(previewTd) {
            const img = previewTd.querySelector('img');
            if (!img) return;

            const rect = img.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const aspectRatio = 16 / 9;

            let baseWidth, baseHeight, scaledWidth, scaledHeight;

            const zoomToggleBtn = previewTd.closest('tr').querySelector('td:nth-child(6) .toggle-btn');
            const speedToggleBtn = previewTd.closest('tr').querySelector('td:nth-child(7) .toggle-btn');

            if (width / height > aspectRatio) {
                baseHeight = height;
                baseWidth = height * aspectRatio;
            } else {
                baseWidth = width;
                baseHeight = width / aspectRatio;
            }

            if (speedToggleBtn.dataset.state === 'fast') {
                scaledWidth = baseWidth * (1 / 2);
                scaledHeight = scaledWidth / aspectRatio;
            } else {
                scaledWidth = baseWidth * (2 / 3);
                scaledHeight = scaledWidth / aspectRatio;
            }

            const dot = previewTd.querySelector('.click-dot');
            const dotX = dot.offsetLeft + 5;
            const dotY = dot.offsetTop + 5;

            let overlayRect = previewTd.querySelector('.overlay-rect');
            if (!overlayRect) {
                overlayRect = document.createElement('div');
                overlayRect.classList.add('overlay-rect');
                previewTd.appendChild(overlayRect);
            }

            let baseRect = previewTd.querySelector('.base-rect');
            if (!baseRect) {
                baseRect = document.createElement('div');
                baseRect.classList.add('base-rect');
                previewTd.appendChild(baseRect);
            }

            overlayRect.style.width = `${scaledWidth}px`;
            overlayRect.style.height = `${scaledHeight}px`;
            overlayRect.style.left = `${dotX - scaledWidth / 2}px`;
            overlayRect.style.top = `${dotY - scaledHeight / 2}px`;
            overlayRect.style.borderColor = speedToggleBtn.dataset.state === 'fast' ? 'red' : 'green';

            baseRect.style.width = `${baseWidth}px`;
            baseRect.style.height = `${baseHeight}px`;
            baseRect.style.left = `calc(50% - ${baseWidth / 2}px)`;
            baseRect.style.top = `calc(50% - ${baseHeight / 2}px)`;
            baseRect.style.borderColor = 'white';
        }

        function removeRectangleOverlay(previewTd) {
            const overlayRect = previewTd.querySelector('.overlay-rect');
            if (overlayRect) {
                overlayRect.remove();
            }
            const baseRect = previewTd.querySelector('.base-rect');
            if (baseRect) {
                baseRect.remove();
            }
        }

        function setActiveImage(previewTd) {
            document.querySelectorAll('.drop-cell.active').forEach(cell => {
                cell.classList.remove('active');
            });
            previewTd.classList.add('active');
        }

        function moveDot(previewTd, dx, dy) {
            const img = previewTd.querySelector('img');
            if (!img) return;

            const dot = previewTd.querySelector('.click-dot');
            const clickCoordinatesTd = previewTd.closest('tr').querySelector('td.hidden-cell');
            const overlayRect = previewTd.querySelector('.overlay-rect');

            let x = parseFloat(dot.style.left.replace('calc(', '').replace('%) - 5px)', '')) / 50 - 1;
            let y = parseFloat(dot.style.top.replace('calc(', '').replace('%) - 5px)', '')) / 50 - 1;

            x += dx;
            y += dy;

            const rect = img.getBoundingClientRect();
            const overlayRectWidth = parseFloat(overlayRect.style.width);
            const overlayRectHeight = parseFloat(overlayRect.style.height);

            x = Math.max((-rect.width + overlayRectWidth) / rect.width, Math.min((rect.width - overlayRectWidth) / rect.width, x));
            y = Math.max((-rect.height + overlayRectHeight) / rect.height, Math.min((rect.height - overlayRectHeight) / rect.height, y));

            dot.style.left = `calc(${(x + 1) * 50}% - 5px)`;
            dot.style.top = `calc(${(y + 1) * 50}% - 5px)`;

            const coordinates = { x, y };
            clickCoordinatesTd.dataset.coordinates = JSON.stringify(coordinates);
            updateRectangleOverlay(previewTd);
        }

        function updateDotPosition(previewTd, x, y) {
            const coordinates = { x, y };
            const clickCoordinatesTd = previewTd.closest('tr').querySelector('td.hidden-cell');
            clickCoordinatesTd.dataset.coordinates = JSON.stringify(coordinates);

            const dot = previewTd.querySelector('.click-dot');
            const rect = previewTd.querySelector('img').getBoundingClientRect();
            const overlayRect = previewTd.querySelector('.overlay-rect');
            const overlayRectWidth = parseFloat(overlayRect.style.width);
            const overlayRectHeight = parseFloat(overlayRect.style.height);

            x = Math.max((-rect.width + overlayRectWidth) / rect.width, Math.min((rect.width - overlayRectWidth) / rect.width, x));
            y = Math.max((-rect.height + overlayRectHeight) / rect.height, Math.min((rect.height - overlayRectHeight) / rect.height, y));

            dot.style.left = `calc(${(x + 1) * 50}% - 5px)`;
            dot.style.top = `calc(${(y + 1) * 50}% - 5px)`;
            console.log('Click coordinates relative to the image:', coordinates);
            updateRectangleOverlay(previewTd);
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
                            previewTd.classList.remove('active');
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
                            setActiveImage(previewTd);
                        });

                        const dot = document.createElement('div');
                        dot.classList.add('click-dot');
                        dot.style.left = 'calc(50% - 5px)';
                        dot.style.top = 'calc(50% - 5px)';
                        previewTd.appendChild(dot);

                        dot.addEventListener('mousedown', (event) => {
                            event.preventDefault();
                            const shiftX = event.clientX - dot.getBoundingClientRect().left;
                            const shiftY = event.clientY - dot.getBoundingClientRect().top;

                            function moveAt(pageX, pageY) {
                                const rect = img.getBoundingClientRect();
                                let x = ((pageX - rect.left - shiftX + 5) / rect.width) * 2 - 1;
                                let y = ((pageY - rect.top - shiftY + 5) / rect.height) * 2 - 1;

                                const overlayRect = previewTd.querySelector('.overlay-rect');
                                const overlayRectWidth = parseFloat(overlayRect.style.width);
                                const overlayRectHeight = parseFloat(overlayRect.style.height);

                                x = Math.max((-rect.width + overlayRectWidth) / rect.width, Math.min((rect.width - overlayRectWidth) / rect.width, x));
                                y = Math.max((-rect.height + overlayRectHeight) / rect.height, Math.min((rect.height - overlayRectHeight) / rect.height, y));

                                dot.style.left = `calc(${(x + 1) * 50}% - 5px)`;
                                dot.style.top = `calc(${(y + 1) * 50}% - 5px)`;

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
            const activeCell = document.querySelector('.drop-cell.active');
            if (!activeCell) return;

            const increment = event.shiftKey ? 0.1 : 0.01;

            switch (event.key) {
                case 'ArrowUp':
                    moveDot(activeCell, 0, -increment);
                    break;
                case 'ArrowDown':
                    moveDot(activeCell, 0, increment);
                    break;
                case 'ArrowLeft':
                    moveDot(activeCell, -increment, 0);
                    break;
                case 'ArrowRight':
                    moveDot(activeCell, increment, 0);
                    break;
            }
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
