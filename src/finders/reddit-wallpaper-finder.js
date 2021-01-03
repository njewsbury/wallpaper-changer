
const {request} = require('http');
const https = require('https');
const WallpaperFinder = require('../wallpaper-finder');

const SEARCH_API = {
    'hostname': 'www.reddit.com',
    'path': '/r/',
    'endpoint': '/search.json'
};

const API_PARAMS = {
    'query': 'q',
    'sort': 'sort',
    'restrict_subreddit': 'restrict_sr',
    'time': 't',
    'limit': 'limit',
    'after': 'after'
};

const PARAM_DEFAULTS = {
    'sort': 'new',
    'time': 'all',
    'limit': 100,
    'restrict_subreddit': 'on'
}

class RedditWallpaperFinder extends WallpaperFinder {

    constructor(conf) {
        super();
        this.config = {
            'subreddits': conf.subreddits || ['wallpaper', 'wallpapers'],
            'sort': conf.sort || PARAM_DEFAULTS['sort'],
            'time': conf.time || PARAM_DEFAULTS['time'],
            'limit': conf.limit || PARAM_DEFAULTS['limit'],
            'restrict_subreddit': conf.restrict_subreddit || PARAM_DEFAULTS['restrict_subreddit'],
            'query': conf.query
        }
    }

    async listAvailableWallpapers(startingId) {
        const subredditString = this.config.subreddits.join('+');

        let fullpath = `${SEARCH_API['path']}${subredditString}${SEARCH_API['endpoint']}?`
            + `${API_PARAMS['sort']}=${encodeURI(this.config['sort'])}`
            + `&${API_PARAMS['restrict_subreddit']}=${encodeURI(this.config['restrict_subreddit'])}`
            + `&${API_PARAMS['time']}=${encodeURI(this.config['time'])}`
            + `&${API_PARAMS['limit']}=${encodeURI(this.config['limit'])}`
            + `&${API_PARAMS['query']}=${encodeURI('(' + this.config['query'] + ')')}`;

        if (startingId && startingId.trim().length > 0) {
            fullpath += `&${API_PARAMS['after']}=${encodeURI(startingId)}`;
        }

        console.log(
            'Searching reddit with params: '
            + `[SUBS] [${this.config.subreddits.join()}] `
            + `[SORT] ${this.config.sort} `
            + `[TIME] ${this.config.time} `
            + `[LIMIT] ${this.config.limit} `
            + `[AFTER] ${startingId ? startingId : '0'} `
            + `[QUERY] ${this.config.query} `
        );

        const requestOptions = {
            'hostname': SEARCH_API['hostname'],
            'path': fullpath,
            'method': 'GET',
            'headers': {
                'Content-Type': 'application/json',
            }
        };

        const redditRequest = new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (response) => {
                let responseString = '';

                if (!response || !response.statusCode) {
                    return reject(new Error('Server Error'), 500);
                }

                if (response.statusCode !== 200) {
                    return reject(new Error('Non-200 Status Code'));
                }

                response.on('data', (chunk) => {
                    responseString += chunk;
                }).on('end', () => {
                    const jsonData = JSON.parse(responseString);
                    return resolve(jsonData);
                });
            });

            req.on('error', (err) => {
                return reject(err);
            });

            req.end();
        });

        const jsonResult = await redditRequest;

        if (!jsonResult || !jsonResult.data || !jsonResult.data.children) {
            console.log('No data!');
            return [];
        }

        const resultSet = jsonResult.data.children;
        const subsetResults = [];
        for (const child of jsonResult.data.children) {
            if (child.data.post_hint !== 'image') {
                continue;
            }
            // console.log(child);
            const details = {
                'id': child.data.name,
                'title': child.data.title,
                'subreddit': child.data.subreddit,
                'url': child.data.url,
                'type': child.data.post_hint
            };

            // console.log(details);
            subsetResults.push(details);
        }


        return subsetResults;

    }

}


module.exports = RedditWallpaperFinder;