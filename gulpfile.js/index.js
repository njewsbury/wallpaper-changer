'use strict';

const gulp = require('gulp');

exports.clean = require('./task-clean');
exports.html = require('./task-html');


exports.default = gulp.series(exports.clean, exports.html);
