const gulp = require('gulp')
const minifycss = require('gulp-clean-css')
const uglify = require('gulp-uglify')
const htmlmin = require('gulp-htmlmin')
const cssnano = require('gulp-cssnano')
const htmlclean = require('gulp-htmlclean')
const del = require('del')
const babel = require('gulp-babel')
const autoprefixer = require('gulp-autoprefixer')
const connect = require('gulp-connect')
const pug = require('gulp-pug')
const less = require('gulp-less')

const fs = require('fs')

gulp.task('clean', function () {
	return del(['./dist/css/', './dist/js/'])
})

gulp.task('css', function () {
	return gulp
	.src('./src/css/*.less')
	.pipe(less().on('error', function(err) {
		throw err;
	}))
	.pipe(minifycss({ compatibility: 'ie8' }))
	.pipe(autoprefixer({ overrideBrowserslist: ['last 2 version'] }))
	.pipe(cssnano({ reduceIdents: false }))
		.pipe(gulp.dest('./dist/css'))
})

gulp.task('html', function () {
	return gulp
		.src('./dist/index.html')
		.pipe(htmlclean())
		.pipe(htmlmin())
		.pipe(gulp.dest('./dist'))
})

gulp.task('js', function () {
	return gulp
		.src('./src/js/*.js')
		.pipe(babel({ presets: ['@babel/preset-env'] }))
		.pipe(uglify())
		.pipe(gulp.dest('./dist/js'))
})

gulp.task('pug', function () {
	return gulp
		.src('./src/index.pug')
		.pipe(pug({ data: JSON.parse(fs.readFileSync('./config.json', 'utf8')) }))
		.pipe(gulp.dest('./dist'))
})

gulp.task('channels', function (done) {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
    const channels = JSON.parse(fs.readFileSync('./content/channels.json', 'utf8'))
    const renderer = require('pug')
    for (const [slug, channel] of Object.entries(channels)) {
        if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid channel slug: ' + slug)
        fs.mkdirSync('./dist/' + slug, { recursive: true })
        fs.writeFileSync('./dist/' + slug + '/index.html', renderer.renderFile('./src/channel.pug', {
            ...config, channels, channel, current: slug
        }))
    }
    done()
})

gulp.task('assets', function () {
	return gulp
		.src(['./src/assets/**/*'])
		.pipe(gulp.dest('./dist/assets'));
})

gulp.task('build', gulp.series('clean', 'assets', 'pug', 'channels', 'css', 'js', 'html'))
gulp.task('default', gulp.series('build'))

gulp.task('watch', function () {
	gulp.watch('./src/components/*.pug', gulp.parallel('pug'))
	gulp.watch('./src/index.pug', gulp.parallel('pug'))
	gulp.watch('./src/css/**/*.less', gulp.parallel(['css']))
	gulp.watch('./src/js/*.js', gulp.parallel(['js']))
	gulp.watch('./config.json', gulp.series('pug', 'channels', 'html'))
	gulp.watch('./src/assets/**/*', gulp.series('assets'))
	gulp.watch(['./content/*.json', './src/channel.pug'], gulp.series('channels'))
	connect.server({
		root: 'dist',
		livereload: true,
		port: 8080
	})
})
