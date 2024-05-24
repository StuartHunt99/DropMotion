const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');  // Import exec from child_process

ipcMain.handle('read-csv', async (event) => {
    const results = [];
    const filePath = path.join(__dirname, 'output_spreadsheet.csv');
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
});

ipcMain.on('save-csv', async (event, data) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save CSV',
        defaultPath: path.join(__dirname, 'updated_spreadsheet.csv'),
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (filePath) {
        fs.writeFileSync(filePath, data);
    }
});

ipcMain.on('save-json', async (event, data) => {
    const savePath = path.join(__dirname, 'xml-updater', 'updated_spreadsheet.json');
    
    fs.writeFileSync(savePath, data);

    // Run the Python script after saving the JSON file
    exec('python3 xml-updater/xml-updater.py', (error, stdout, stderr) => {
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
