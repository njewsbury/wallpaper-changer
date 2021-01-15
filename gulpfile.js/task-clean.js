'use strict';

const rimraf = require('rimraf');

/**
 * Complete the gulp task.
 * 
 * GULP CLEAN
 * Use rimraf to delete the distro folder.
 * 
 * @return {Promise<Void>} Promise resolves once task is complete.
 */
async function asyncTask() {
    return new Promise((resolve, reject) => {
        rimraf('dist', () => {
            resolve();
        });
    });
}

module.exports = async function executeTask(cb) {
    await asyncTask();
    cb();
};
