const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    readCSV: () => ipcRenderer.invoke('read-csv'),
    saveCSV: (data) => ipcRenderer.send('save-csv', data),
    saveJSON: (data) => ipcRenderer.send('save-json', data)
});
