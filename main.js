const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');

ipcMain.handle('read-csv', async (event) => {
    const results = [];
    const filePath = path.join(__dirname, 'create-table/base_table.csv');
    return new Promise((resolve, reject) => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.warn('base_table.csv not found, returning an empty array.');
                resolve(results); // Return an empty array if file is not found
            } else {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', () => {
                        resolve(results);
                    })
                    .on('error', (error) => {
                        reject(error);
                    });
            }
        });
    });
});

ipcMain.on('save-json', async (event, data) => {
    const savePath = path.join(__dirname, 'xml-updater', 'updated_spreadsheet.json');
    fs.writeFileSync(savePath, data);
    exec('python3 xml-updater/xml-updater-2.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Python script stderr: ${stderr}`);
            return;
        }
        console.log(`Python script stdout: ${stdout}`);
    });
});

ipcMain.handle('select-file', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    return result.filePaths[0];
});

ipcMain.handle('run-python-script', async (event, transcriptFilePath, markersFilePath) => {
    const scriptPath = path.join(__dirname, 'create-table', 'create-table.py');
    exec(`python3 ${scriptPath} ${transcriptFilePath} ${markersFilePath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Python script stderr: ${stderr}`);
            return;
        }
        console.log(`Python script stdout: ${stdout}`);
    });
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
