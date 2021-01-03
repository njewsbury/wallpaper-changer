const WallpaperSelector = require('./src/wallpaper-selector');
const RedditFinder = require('./src/finders/reddit-wallpaper-finder');

const wallpaper = require('wallpaper');

// https://www.reddit.com/r/wallpaper+wallpapers/search.json?sort=new&restrict_sr=on&&q=3840x2160&limit=2
class WallpaperChangerjs {

    constructor() {
        //
        this.selector = new WallpaperSelector({});
    }

    async start() {
        // await this.selector.initializeSelectorDb();

        this.selector.addRedditFinder(new RedditFinder({
            'query': '(3840x2160) AND (landscape OR space OR sci-fi OR winter OR forest OR Canada OR Alaska OR Lights OR Moon OR Park OR National OR Tree OR Mountain  OR Pine OR Scene)'
        }));

        const wallpaperPath = await this.selector.selectNewWallpaper();

        if (wallpaperPath && wallpaperPath.length > 0) {
            await wallpaper.set(wallpaperPath);
        }
    }
}

const wpcjs = new WallpaperChangerjs();

new Promise(async (resolve, reject) => {
    await wpcjs.start();
    resolve();
}).catch((err) => {
    console.warn('Err: ', err);
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