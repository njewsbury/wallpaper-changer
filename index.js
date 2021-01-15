'use strict';

const appconfig = require('./conf/appconfig');

const WallpaperSelector = require('./src/wallpaper-selector');
const RedditFinder = require('./src/finders/reddit-wallpaper-finder');

const {app, BrowserWindow} = require('electron');
const wallpaper = require('wallpaper');
const path = require('path');

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

        this.electronMenuTemplate = [
            {
                'label': 'File',
                'role': 'file'
            }
        ];
    }

    /**
     * Initialize the electronjs window.
     */
    initializeElectronWindow() {
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


if (!app) {
    return;
}

const wpcjs = new WallpaperChangerjs();
app.whenReady().then(() => {
    wpcjs.initializeElectronWindow();
}).catch((err) => {
    console.warn('Unable to initialize electron app.', err);
});

app.on('before-quit', () => {
    console.log('quitting');
    if (wpcjs) {
        wpcjs.release();
    }
});

app.on('activate', () => {
    console.log('activate!');
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
