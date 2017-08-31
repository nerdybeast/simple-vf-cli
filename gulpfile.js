'use strict';

const gulp = require('gulp');
const ts = require('gulp-typescript');

let tsProject = ts.createProject('tsconfig.json');

gulp.task('scripts', function() {
	return tsProject.src()
		.pipe(tsProject())
		.js.pipe(gulp.dest('dist'));
});

gulp.task('static', ['scripts'], function() {
	return gulp.src('./lib/static/**')
		.pipe(gulp.dest('./dist/lib/static'));
});

gulp.task('watch', ['static'], function() {
	gulp.watch(['./lib/static/**/*'], ['static']);
	gulp.watch(['./lib/**/*.js', './lib/**/*.ts', './index.ts', './install.ts'], ['scripts']);
});

gulp.task('default', ['watch']);