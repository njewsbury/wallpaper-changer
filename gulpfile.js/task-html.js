'use strict';

const gulp = require('gulp');
const fileinclude = require('gulp-file-include');

/**
 * Complete the gulp task.
 * 
 * GULP HTML
 * 'compile' and copy html files to the distro folder.
 * 
 * @return {Promise<Void>} Promise resolves once task is complete.
 */
async function asyncTask() {
    gulp.src('static/html/*.html', {
        'base': 'static/html'
    }).pipe(fileinclude({
        'prefix': '@@',
        'basepath': '@file',
        'indent': true
    })).pipe(gulp.dest('dist'));
}

module.exports = async function executeTask(cb) {
    await asyncTask();
    cb();
};
