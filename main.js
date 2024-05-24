const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

ipcMain.handle('read-csv', async () => {
    const results = [];
    const filePath = path.join(__dirname, 'output_spreadsheet.csv');
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
});

ipcMain.on('save-csv', async (event, data) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Save CSV',
            defaultPath: path.join(__dirname, 'updated_spreadsheet.csv'),
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        });

        if (filePath) {
            fs.writeFileSync(filePath, data);
        }
    } catch (error) {
        console.error('Error saving CSV:', error);
    }
});

ipcMain.on('save-json', async (event, data) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Save JSON',
            defaultPath: path.join(__dirname, 'updated_spreadsheet.json'),
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (filePath) {
            fs.writeFileSync(filePath, data);
        }
    } catch (error) {
        console.error('Error saving JSON:', error);
    }
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

    win.on('closed', () => {
        win = null;
    });
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
