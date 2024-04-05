import {app, BrowserWindow, dialog} from 'electron';
import isDev from 'electron-is-dev';
import {PythonShell} from 'python-shell';
import {execFile} from 'child_process';
import path from "path";
import url, {fileURLToPath} from 'url';
import os from "os";
import treeKill from "tree-kill";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_PROD_PATH = path.join(__dirname, "../build/api/api.exe");
const API_DEV_PATH = path.join(__dirname, "api/api.py");
const INDEX_PROD_PATH = path.join(__dirname, 'build/client/index.html');
let pythonProcess;

let venvExeFolder = os.platform() === 'win32' ? "Scripts" : "bin";
let serverPid = null;

function processApiStderr(data) {
    if (serverPid === null) {
        let match = data.match(".*Started server process \\[(\\d+)]");
        if (match) {
            serverPid = match[1];
        }
    }
    console.log(data);
}

if (isDev) {
    let pythonShell =  new PythonShell(API_DEV_PATH, {
        pythonPath: path.resolve(__dirname, ".venv", venvExeFolder, "python")
    })

    pythonShell.on('message', console.log);
    pythonShell.on('stderr', processApiStderr);
    pythonShell.end((err,code,signal) =>{
      if (err) throw err;
      console.log('The exit code was: ' + code);
      console.log('The exit signal was: ' + signal);
      console.log('finished');
    });
    pythonProcess = pythonShell.childProcess;
} else {
    pythonProcess = execFile(API_PROD_PATH, {
        windowsHide: true,
    })
    pythonProcess.stderr.on('data', processApiStderr);
    pythonProcess.stdout.on('data', console.log);
    pythonProcess.on('exit', (code, signal) => {
        if(code !== 0 && code !== null)
            dialog.showErrorBox("API exited", `API exited with code ${code} and signal ${signal}`);
    });
}

function killServer() {
    if (pythonProcess) {
        treeKill(pythonProcess.pid, "SIGINT");
        pythonProcess = null;
    }
    if (serverPid) {
        treeKill(serverPid, "SIGINT");
        serverPid = null;
    }
}

try {
    const createWindow = () => {
        const win = new BrowserWindow({
            width: 800,
            height: 600
        })
        win.loadURL(isDev ? 'http://localhost:3000' : url.format({
            pathname: INDEX_PROD_PATH,
            protocol: 'file:',
            slashes: true
        })).catch(() => {
            dialog.showErrorBox("Error", "Failed to load index.html")
        });
    }
    app.whenReady().then(() => {
        createWindow()
    })
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })

    app.on("before-quit", function () {
        killServer();
    });

    }
catch (e) {
    killServer();
    throw e;
}