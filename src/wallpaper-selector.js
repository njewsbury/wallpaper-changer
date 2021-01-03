'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');

const sqlite = require('sqlite3');
const Database = sqlite.Database;
const DATABASE_PATH = path.join(__dirname, '..', 'wallpapers.db');

const SQL_FILES = {
    'listUnread': path.join(__dirname, 'sql', 'list-unused.sql'),
    'initializeDb': path.join(__dirname, 'sql', 'initialize-db.sql'),
    'markUsed': path.join(__dirname, 'sql', 'mark-used.sql'),
    'purgeCache': path.join(__dirname, 'sql', 'truncate-cache.sql')
};

/**
 * Wallpaper Selector.
 * 
 * Contains the configured wallpaper finder objects. Aggregate the results of all
 * the selectors and choose a single wallpaper.
 * 
 * The reddit wallpaper finder can be specially set to paginate through reddit's search
 * to find the desired amount of wallpapers.
 * 
 * @author njewsbury
 * @since 2020-12-20
 */
class WallpaperSelector {

    constructor(config) {
        this.finders = [];
        this.redditFinder = undefined;
        this.minimumWallpaperSet = config.minimumSet || 100;
        this.saveDirectory = config.saveDirectory || path.join(__dirname, '..', 'wallpapers');
        //
        this.db = undefined;
    }

    async initializeSelectorDb() {
        const self = this;
        return new Promise((resolve, reject) => {

            self.db = new Database(DATABASE_PATH, sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, (err) => {
                if (err) {
                    console.log(err);
                    return reject(new Error('Unable to open DB.'));
                }
                const initialSql = fs.readFileSync(SQL_FILES['initializeDb']);

                self.db.run(initialSql, [], (initErr) => {
                    if (initErr) {
                        return reject(new Error('Unable to initialize DB.'));
                    }
                    return resolve();
                });
            });
        });
    }

    addFinder(finder) {
        this.finders.push(finder);
    }

    /**
     * Specially set the reddit wallpaper finder.
     * 
     * @param {RedditWallpaperFinder} redditFinder Wallpaper finder using Reddit search API.
     */
    addRedditFinder(redditFinder) {
        this.redditFinder = redditFinder;
    }

    async selectNewWallpaper() {
        let allAvailableWallpapers = [];
        for (const finder of this.finders) {
            const availableWallpapers = await finder.listAvailableWallpapers();
            allAvailableWallpapers = allAvailableWallpapers.concat(availableWallpapers);
        }

        if (this.redditFinder) {
            let lastWallpaper = undefined;
            let iterations = 0;
            while (allAvailableWallpapers.length < this.minimumWallpaperSet && iterations < 10) {
                let redditWallpapers = [];
                if (lastWallpaper) {
                    redditWallpapers = await this.redditFinder.listAvailableWallpapers(
                        lastWallpaper.id
                    );
                } else {
                    redditWallpapers = await this.redditFinder.listAvailableWallpapers();
                }

                lastWallpaper = redditWallpapers[redditWallpapers.length - 1];
                allAvailableWallpapers = allAvailableWallpapers.concat(redditWallpapers);
                iterations++;
            }
        }

        const wallpaperIndex = Math.floor(Math.random() * (allAvailableWallpapers.length));
        const wallpaperChosen = allAvailableWallpapers[wallpaperIndex];

        console.log('Selected wallpaper: ', wallpaperChosen);

        const downloadImg = new Promise((resolve, reject) => {
            const wpAbsolutePath = path.join(
                this.saveDirectory,
                `wallpaper.${wallpaperChosen.id}${path.extname(wallpaperChosen.url)}`
            );
            const file = fs.createWriteStream(wpAbsolutePath);

            https.get(wallpaperChosen.url, (resp) => {
                resp.pipe(file);

                resp.on('end', () => {
                    return resolve(wpAbsolutePath);
                });
            });
        });


        return await downloadImg;
    }

    async _extractCached() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // DB not initialized? pretend it's not available.
                return resolve([]);
            }
            const listUnused = fs.readFileSync(SQL_FILES['listUnread']);
            this.db.all(listUnused, [], (err, rows) => {
                return resolve(rows);
            });
        });
    }

    async purgeCache() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return resolve(true);
            }
            const purgeQuery = fs.readFileSync(SQL_FILES['purgeCache']);
            this.db.run(purgeQuery, [], (err) => {
                if (err) {
                    return reject(new Error('Unable to purge cache.'));
                }
                return resolve();
            });
        });
    }

}

module.exports = WallpaperSelector;