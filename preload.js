const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    readCSV: () => ipcRenderer.invoke('read-csv'),
    saveJSON: (data) => ipcRenderer.send('save-json', data),
    selectFile: () => ipcRenderer.invoke('select-file'),
    runPythonScript: (transcriptFilePath, markersFilePath) => ipcRenderer.invoke('run-python-script', transcriptFilePath, markersFilePath)
});
