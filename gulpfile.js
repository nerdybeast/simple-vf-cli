'use strict';

const gulp = require('gulp');
const ts = require('gulp-typescript');

let tsProject = ts.createProject('tsconfig.json');

gulp.task('scripts', function() {
	return tsProject.src()
		.pipe(tsProject()).js
		.pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
	gulp.watch(['./lib/**/*.ts'], ['scripts']);
});

gulp.task('default', ['watch']);