/* // Modules to control application life and create native browser window
const setupEvents = require('./installers/setupEvents')
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
} */

const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    Menu,
    net,
    ipcRenderer
} = require("electron");
const electronLocalshortcut = require("electron-localshortcut");
const logger = require("electron-log");
// const { sessionStorage } = require('electron-browser-storage');
// var dotenv = require('dotenv');
var os = require("os");
var fs = require("fs-extra");
var path = require("path");
// const notifier = require('node-notifier')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let errorWindow;

let appData = {
    url: "https://dev.cloudvlt.com",
    past_url: "./src/index.html"
};

const { autoUpdater } = require("electron-updater");
const isDev = require("electron-is-dev");

const axios = require("axios");
const { NFC } = require("nfc-pcsc");

const nfc = new NFC();
const { pretty } = require("./pretty-logger");

autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

autoUpdater.on("checking-for-update", () => {
    logger.info("Checking for updates ....");
});

autoUpdater.on("update-available", info => {
    /* notifier.notify(
                  {
                    message: `Update available for Cloudvlt ${info.version}`,
                    icon: './src/img/cvlt.png',
                    wait: true
                  },
                  function(err, response, metadata) {
                    autoUpdater.quitAndInstall()
                  }
                ) */
    logger.info("update available", info);
    logger.info("version", info.version);
});

autoUpdater.on("update-not-available", () => {
    logger.loinfog("update not available");
});

autoUpdater.on("download-progress", progress => {
    logger.info(`Progress ${Math.floor(progress.percent)}`);
});

autoUpdater.on("update-downloaded", info => {
    logger.info("Update downloaded!!!");
    autoUpdater.quitAndInstall();
});

// HEre you need to put link of your update.json from your server.
const feed = "update.json";

const configFilePath = path.join(os.homedir(), ".cloudvlt", "config.json");

if (!fs.existsSync(configFilePath)) {
    fs.ensureDirSync(path.join(os.homedir(), ".cloudvlt"));
}

if (isDev) {
    logger.info("Running in development");
} else {
    // autoUpdater.setFeedURL(feed);
}

/*
setInterval(() => {
  autoUpdater.checkForUpdates()
}, 60000); */

/* 
autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  }

  dialog.showMessageBox(dialogOpts, (response) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
});

autoUpdater.on('error', message => {
  logger.error('There was a problem updating the application')
  logger.error(message)
}); */

if (!isDev) {
    logger.info("Not in Development mode.");
    autoUpdater.checkForUpdates();
}

let msg = "The user is already logged on, please try later.";

function errorHandler(err) {
    msg = err;
    errorWindow = new BrowserWindow({
        modal: true,
        parent: mainWindow,
        width: 800,
        height: 600,
        center: true,
        webPreferences: {
            nodeIntegration: true,
            backgroundColor: "#000000"
        }
    });
    errorWindow.loadFile("./src/error.html");
}


function createWindow() {
    let uid = null;
    let token = null;
    try {
        var data = fs.readFileSync(configFilePath, "utf8");
        appData = JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            mainWindow = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    nodeIntegration: true
                }
            });

            mainWindow.loadFile("./src/index.html");
            return;
        }
    }

    let { width, height } = require("electron").screen.getPrimaryDisplay().size;
    if (appData.fullscreen == undefined || appData.fullscreen == null || appData.fullscreen == false) {
        width = 800;
        height = 600;
    }
    console.log(appData);
    mainWindow = new BrowserWindow({
        fullscreen: process.platform == "win32" ? true : false,
        width: width,
        height: height,
        kiosk: appData.kiosk != null && appData.kiosk != undefined ?
            appData.kiosk : false,
        show: true,
        frame: appData.fullscreen != null && appData.fullscreen != undefined ?
            !appData.fullscreen : true,
        resizable: true,
        autoHideMenuBar: true,
        titleBarStyle: false,
        enableLargerThanScreen: true,
        transparent: appData.fullscreen != null && appData.fullscreen != undefined ?
            appData.fullscreen : false,
        useContentSize: false,
        webPreferences: {
            nodeIntegration: true,
            backgroundColor: "#000000"
        }
    });
    mainWindow.webContents
        .executeJavaScript('sessionStorage.getItem("token")')
        .then(function(value) {
            if (value != null && value != undefined) token = value;
            return value;
        });
    if (appData.smartcard) {
        pretty.info(`nfc module init`);
        nfc.on("reader", async reader => {
            reader.aid = "F222222222";
            reader.on("card", async card => {
                pretty.info(`card detected`, reader, card);
                uid = card.uid;

                axios
                    .get(
                        `${
              appData.url
            }/vlt/api/api.php?rquest=card_login&card_data=${uid}&output=json&token=${token}`
                    )
                    .then(res => {
                        if (res.data.status === "OK") {
                            appData.past_url = res.data.url;
                            if (errorWindow != null) {
                                errorWindow.close();
                            }
                            mainWindow.loadURL(res.data.url);
                        } else {
                            console.log("Failed  ", res.data.msg);
                            errorHandler(res.data.msg);
                        }
                    })
                    .catch(err => {
                        logger.log("------------ axios error start -------------");
                        logger.warn("axios error:", err);
                        errorHandler("Error occurred while requesting axios call!");
                        logger.log("------------ axios error end -------------");
                    });
            });
            reader.on("error", err => {
                logger.warn(`an error occurred`, reader, err);
                pretty.error(`an error occurred`, reader, err);
                errorHandler("ACR Reader error!");
            });
            reader.on("end", () => {
                pretty.info(`device removed`, reader);
            });
        });
        nfc.on("error", err => {
            pretty.error(`an error occurred`, err);
            errorHandler("NFC module error!");
        });
    }

    electronLocalshortcut.register(mainWindow, "h", async() => {
        var returnurl = global.sharedObj.prop;
        if (returnurl != undefined && returnurl != null) {
            mainWindow.loadURL(global.sharedObj.prop);
            appData.past_url = global.sharedObj.prop;
            return;
        }
        mainWindow.webContents
            .executeJavaScript("sessionStorage.returnurl")
            .then(function(url) {
                if (global.sharedObj != null && global.sharedObj != undefined) {
                    url = global.sharedObj.prop;
                }
                if (url) {
                    appData.past_url = url;
                    mainWindow.loadURL(url);
                } else {
                    if (appData.device_id != null && appData.device_id != "") {
                        url = appData.url + "?device_id=" + appData.device_id;
                        appData.past_url = url;
                        mainWindow.loadURL(url);
                    }
                }
            });
    });
    // dotenv.config();go

    // and load the index.html of the app.
    url = appData.url;
    if (appData.device_id != null && appData.device_id != "") {
        url =
            appData.url +
            "/portal/login_device.php" +
            "?device_id=" +
            appData.device_id;
        appData.past_url = url;
        mainWindow.loadURL(url);
    }

    //logger.log(url);
    const isDebug = appData.debug;
    //logger.log(isDebug);

    //logger.log(appData);
    mainWindow.webContents.on("new-window", function(
        e,
        url,
        frameName,
        disposition,
        options
    ) {
        e.preventDefault();
        mainWindow.setMenu(null);
        appData.past_url = url;
        mainWindow.loadURL(url);
    });

    appData.past_url = url;
    mainWindow.loadURL(url);

    win = new BrowserWindow({
        parent: mainWindow,
        width: width,
        height: height,
        show: true,
        autoHideMenuBar: true,
        enableLargerThanScreen: true,
        transparent: true,
        resizable: false,
        useContentSize: false,
        titleBarStyle: false,
        fullscreen: appData.fullscreen != undefined && appData.fullscreen != null ?
            appData.fullscreen : false,
        frame: false
    });

    win.loadFile("./space-loader/index.html");

    win.once("ready-to-show", () => {
        win.show();
    });
    win.on("close", function(event) {
        if (win != null) {
            win.hide();
            win = null;
            event.preventDefault();
        }
    });

    mainWindow.webContents.on("did-finish-load", function() {
        if (
            appData.fullscreen != null &&
            appData.fullscreen != undefined &&
            appData.fullscreen
        ) {
            mainWindow.maximize();
        }
        mainWindow.webContents
            .executeJavaScript('sessionStorage.getItem("returnurl")')
            .then(function(value) {
                if (value != null && value != undefined)
                    global.sharedObj = {
                        prop: value
                    };
                return value;
            });

        setTimeout(() => {
            if (win != null) {
                win.close();

            }
        }, 2500);
    });

    mainWindow.webContents.on("did-finish-start", function() {
        //win.show();
    });
    if (isDebug) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on("closed", function() {
        mainWindow = null;
    });
}
ipcMain.on("request-msg", (event, obj) => {
    event.sender.send("error-msg", msg);
});
ipcMain.on("writeCongifFile", (event, data) => {
    fs.writeFile(configFilePath, JSON.stringify(data), function(err) {
        if (err) {
            return logger.warn(err);
        }
        logger.info(data);
        event.sender.send(
            "configCompleted",
            "Your config file has been successfully saved! Your app will be restarted in few seconds..."
        );
    });
});

ipcMain.on("returnToMain", (event, data) => {
    mainWindow.loadURL(appData.past_url);
});

ipcMain.on("closeErrorWindow", (event, data) => {
    errorWindow.close();
});

ipcMain.on("restartApp", (event, data) => {
    app.relaunch();
    app.exit(0);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
// Quit when all windows are closed.
app.on("window-all-closed", function() {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them her