'use strict';

const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');

let tsProject = ts.createProject('tsconfig.json');

gulp.task('scripts', function() {
	return tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		
		//Needed to correctly map back to the js file's associated ts file
		//See: https://github.com/gulp-sourcemaps/gulp-sourcemaps#alter-sources-property-on-sourcemaps
		.pipe(sourcemaps.mapSources((sourcePath) => `../lib/${sourcePath}`))

		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('dist'));
});

gulp.task('watch', ['scripts'], function() {
	gulp.watch(['./lib/**/*.ts'], ['scripts']);
});

gulp.task('default', ['watch']);