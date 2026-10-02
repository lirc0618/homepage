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
const path = require('path')
const crypto = require('crypto')
const { buildContent } = require('./scripts/content.cjs')

function templateData() {
    const hash = crypto.createHash('sha256')
    function visit(directory) {
        for (const name of fs.readdirSync(directory).sort()) {
            const file = path.join(directory, name)
            if (fs.statSync(file).isDirectory()) visit(file)
            else { hash.update(file); hash.update(fs.readFileSync(file)) }
        }
    }
    visit('./src')
    hash.update(fs.readFileSync('./config.json'))
    return { ...JSON.parse(fs.readFileSync('./config.json', 'utf8')), assetVersion: hash.digest('hex').slice(0, 12) }
}

gulp.task('clean', function () {
	return del(['./dist/**', '!./dist'])
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
		.pipe(pug({ data: templateData() }))
		.pipe(gulp.dest('./dist'))
})

gulp.task('channels', function (done) {
    buildContent({ contentRoot: './content', outputRoot: './dist', templateRoot: './src', templateData: templateData() })
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
	gulp.watch('./src/css/**/*.less', gulp.series('css', 'pug', 'channels', 'html'))
	gulp.watch('./src/js/*.js', gulp.series('js', 'pug', 'channels', 'html'))
	gulp.watch('./config.json', gulp.series('pug', 'channels', 'html'))
	gulp.watch('./src/assets/**/*', gulp.series('assets'))
	gulp.watch(['./content/**/*', './src/channel.pug', './src/article.pug'], gulp.series('channels'))
	connect.server({
		root: 'dist',
		livereload: true,
		port: 8080
	})
})
