'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');
const logger = require('electron-log');
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

    /**
     * Basic Constructor.
     * 
     * @param {Json} config 
     */
    constructor(config) {
        this.finders = [];
        this.redditFinder = undefined;
        this.minimumWallpaperSet = config.minimumSet || 100;
        this.saveDirectory = config.saveDirectory || path.join(__dirname, '..', 'wallpapers');
        //
        this.db = undefined;
    }

    /**
     * Selection Database Initializer.
     * 
     * Initialize the sqlite wallpaper database. Used to cache database results
     * so future changes don't require a full "search".
     * 
     * @return {Promise<Void>} promise completed once database initialized.
     */
    async initializeSelectorDb() {
        const self = this;
        return new Promise((resolve, reject) => {
            self.db = new Database(DATABASE_PATH, sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, async (err) => {
                if (err) {
                    logger.error('Unable to open DB', err);
                    return reject(new Error('Unable to open DB.'));
                }
                const initialSql = fs.readFileSync(SQL_FILES['initializeDb'], 'utf8');

                self.db.run(initialSql, [], (initErr) => {
                    if (initErr) {
                        logger.error('Unable to initialize database schema', err);
                        return reject(new Error('Unable to initialize DB.'));
                    }
                    return resolve();
                });
            });
        });
    }

    /**
     * Add a new wallpaper finder.
     * 
     * @param {WallpaperFinder} finder An independant wallpaper finder.
     */
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

    /**
     * Select a new wallpaper.
     * 
     * @return {Promise<String>} The selected wallpaper absolute path.
     */
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

    /**
     * Extract wallpaper from cache DB.
     * 
     * @return {Promise<Array<Json>>} A promise that resolves containing cached wallpaper records.
     */
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

    /**
     * Purge the wallpaper cache.
     * 
     * @return {Promise<Void>} promise that resolves once purge is complete.
     */
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
