'use strict';

const appconfig = require('./conf/appconfig');

const WallpaperSelector = require('./src/wallpaper-selector');
const RedditFinder = require('./src/finders/reddit-wallpaper-finder');

const path = require('path');
const {app, BrowserWindow, Tray, Menu} = require('electron');
const logger = require('electron-log');
const wallpaper = require('wallpaper');

// https://www.reddit.com/r/wallpaper+wallpapers/search.json?sort=new&restrict_sr=on&&q=3840x2160&limit=2
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
    initializeElectronWindow() {
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
        });

        this.electronWindow.tray = new Tray(path.join(__dirname, 'favicon.ico'));
        const trayMenu = Menu.buildFromTemplate(this.menuTemplate.tray);
        this.electronWindow.tray.setContextMenu(trayMenu);

        this.electronWindow.prime.loadFile(path.join(__dirname, 'dist', 'index.html'));
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

    /**
     * Start the wallpaper changing service.
     * 
     * @return {Promise<Void>} async task completes when wallpaper selected and changed.
     */
    async start() {
        // await this.selector.initializeSelectorDb();
        this.selector.addRedditFinder(new RedditFinder({
            'query': '(3840x2160) AND '
                + '(landscape OR space OR sci-fi OR winter OR forest OR Canada OR Alaska OR '
                + 'Lights OR Moon OR Park OR National OR Tree OR Mountain  OR Pine OR Scene)'
        }));

        const wallpaperPath = await this.selector.selectNewWallpaper();

        if (wallpaperPath && wallpaperPath.length > 0) {
            await wallpaper.set(wallpaperPath);
        }
    }
}

const wpcjs = new WallpaperChangerjs();
app.whenReady().then(() => {
    wpcjs.initializeElectronWindow();
}).catch((err) => {
    console.warn('Unable to initialize electron app.', err);
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


/*
    How this will work:
    Phase 0.
        When run, it will search through the configured resources to find and select a new wallpaper.

    Phase 1.
        When run, it starts a service that will call phase 0 on a scheduled timer.

    Phase 2.
        ElectronJS service with UI allowing user configuration of the service.
*/
