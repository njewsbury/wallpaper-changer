'use strict';

const appconfig = require('./conf/appconfig');

const WallpaperSelector = require('./src/wallpaper-selector');
const RedditFinder = require('./src/finders/reddit-wallpaper-finder');

const path = require('path');
const {app, BrowserWindow, Tray, Menu, Notification} = require('electron');
const logger = require('electron-log');
const wallpaper = require('wallpaper');

// https://www.reddit.com/r/wallpaper+wallpapers/search.json?sort=new&restrict_sr=on&&q=3840x2160&limit=2
// https://medium.com/@fmacedoo/standalone-application-with-electron-react-and-sqlite-stack-9536a8b5a7b9
/**
 * WallpaperChangeJs.
 * 
 * Randomized NodeJS Wallpaper changer for windows.
 * 
 * @author njewsbury
 * @since 2021-01-14
 */
class WallpaperChangerjs {

    /**
     * Constructor. 
     * 
     * Initialize selectors and base config.
     */
    constructor() {
        //
        this.selector = new WallpaperSelector({});
        this.scheduler = null;
        this.intervalMilliseconds = 3 * 60 * 60 * 1000; // 3 hour 
        this.electronWindow = {};

        this.menuTemplate = {
            'prime': [

            ],
            'tray': [
                {
                    'label': 'Enabled',
                    'type': 'checkbox',
                    'checked': true
                },
                {
                    'type': 'separator'
                },
                {
                    'label': 'Save current wallpaper'
                },
                {
                    'label': 'Block current wallpaper'
                },
                {
                    'label': 'Like current wallpaper'
                },
                {
                    'label': 'Next wallpaper'
                },
                {
                    'type': 'separator'
                },
                {
                    'label': 'Settings',
                    'click': (item, window, event) => {
                        if (!this.electronWindow || !this.electronWindow.prime) {
                            return;
                        }
                        this.electronWindow.prime.show();
                    }
                },
                {
                    'label': 'Quit',
                    'role': 'quit'
                }
            ]
        };

    }

    /**
     * Initialize the electronjs window.
     */
    async initializeService() {
        logger.info('Initializing the electronJs window and tray.');
        this.electronWindow.prime = new BrowserWindow({
            'width': appconfig.width,
            'height': appconfig.height,
            'webPreferences': {
                'nodeIntegration': true,
                'webSecurity': true,
                'sandbox': true,
                'contextIsolation': true
            }
        });
        this.electronWindow.prime.on('close', (event) => {
            event.sender.hide();
            event.preventDefault();

            new Notification(
                {
                    'title': 'WallpaperChangerJs',
                    'body': 'Application moved to the taskbar',
                    'urgency': 'low',
                    'icon': path.join(__dirname, 'favicon.ico')
                }
            ).show();
        });

        this.electronWindow.tray = new Tray(path.join(__dirname, 'favicon.ico'));
        const trayMenu = Menu.buildFromTemplate(this.menuTemplate.tray);
        this.electronWindow.tray.setContextMenu(trayMenu);

        this.electronWindow.prime.loadFile(path.join(__dirname, 'dist', 'index.html'));

        logger.info('Initializing selector cache db...');
        await this.selector.initializeSelectorDb();

        this.scheduler = setTimeout(() => {
            this._doTimeout();
        }, this.intervalMilliseconds);
    }

    /**
     * Release electronjs listeners if any, free objects for gc.
     */
    release() {
        if (this.electronWindow && this.electronWindow.prime) {
            this.electronWindow.prime.removeAllListeners('close');
        }
        this.electronWindow = null;
    }

    async _doTimeout() {
        await this.updateWallpaper();

        this.scheduler = setTimeout(() => {
            this._doTimeout();
        }, this.intervalMilliseconds);
    }

    /**
     * Start the wallpaper changing service.
     * 
     * @return {Promise<Void>} async task completes when wallpaper selected and changed.
     */
    async updateWallpaper() {
        // await this.selector.initializeSelectorDb();
        this.selector.addRedditFinder(new RedditFinder({
            'query': '(3840x2160) AND '
                + '(landscape OR space OR sci-fi OR winter OR forest OR Canada OR Alaska OR '
                + 'Lights OR Moon OR Park OR National OR Tree OR Mountain  OR Pine OR Scene)'
        }));

        const wallpaperPath = await this.selector.selectNewWallpaper();

        if (wallpaperPath && wallpaperPath.length > 0) {
            await wallpaper.set(wallpaperPath);
            // logger.info('I want to change wallpaper to be: ' + wallpaperPath);
        }
    }

}

const wpcjs = new WallpaperChangerjs();
app.whenReady().then(async () => {
    await wpcjs.initializeService();
}).catch((err) => {
    console.warn('Unable to initialize electron app.', err);
    wpcjs.release();
    app.quit();
});

app.on('before-quit', () => {
    logger.info('Quitting.');
    if (wpcjs) {
        wpcjs.release();
    }
});

app.on('activate', () => {
    logger.info('Activating.');
});


// FOR DEVELOPMENT ONLY
if (!process.node_env) {
    app.setAppUserModelId(process.execPath);
}

// https://www.electronjs.org/docs/api/app#appsetloginitemsettingssettings-macos-windows

