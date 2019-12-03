'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var autoprefixer = require('autoprefixer');
var browserSync = require("browser-sync");
var cleanCSS = require('gulp-clean-css');
var cheerio = require('gulp-cheerio');
var del = require('del');
var imagemin = require('gulp-imagemin');
var imageminPngquant = require('imagemin-pngquant');
var path = require('path');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var posthtmlAttrsSorter = require('posthtml-attrs-sorter');
var postcss = require('gulp-postcss');
var rigger = require('gulp-rigger');
var replace = require('gulp-replace');
var runSequence = require('run-sequence');
var sourcemaps = require('gulp-sourcemaps');
var stylefmt = require('stylefmt');
var sass = require('gulp-sass');
var svgmin = require('gulp-svgmin');
var reload = browserSync.reload;

var srcFolder = 'src/';
var distFolder = 'dist/';

// Plugins options
var options = {
    dist: { // Dist paths
        html: distFolder,
        js: distFolder + 'js/',
        css: distFolder + 'css/',
        img: distFolder + 'img/',
        icons: srcFolder + 'templates-parts/',
        fonts: distFolder + 'fonts/'
    },
    src: { // Source paths
        html: srcFolder + 'html/*.html',
        js: srcFolder + 'js/**/*.js',
        style: srcFolder + 'scss/**/*.scss',
        img: srcFolder + 'img/*.{jpg,png,svg}',
        svg: srcFolder + 'img/svg-icons/**/*.svg',
        fonts: srcFolder + 'fonts/**/*.*'
    },
    watch: { // Watch files
        html: srcFolder + '**/*.html',
        js: srcFolder + 'js/**/*.js',
        style: srcFolder + 'scss/**/*.scss',
        img: srcFolder + 'img/**/*.*',
        svg: srcFolder + 'img/svg-icons/*.svg',
        fonts: srcFolder + 'fonts/**/*.*'
    },

    svgSprite: {
        title: 'Icon %f',
        id: 'icon-%f',
        className: 'icon-%f',
        svgClassname: 'icons-sprite',
        templates: [
            path.join(__dirname, srcFolder + 'img/icons-template.scss'),
            path.join(__dirname, srcFolder + 'img/icons-template.svg')
        ]
    },

    imagemin: {
        images: [
            $.imagemin.gifsicle({
                interlaced: true,
                optimizationLevel: 3
            }),
            $.imagemin.jpegtran({
                progressive: true
            }),
            $.imagemin.optipng({
                optimizationLevel: 5
            }),
            $.imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ],

        icons: [
            $.imagemin.svgo({
                plugins: [
                    {removeTitle: false},
                    {removeStyleElement: false},
                    {removeAttrs: {attrs: ['id', 'class', 'data-name', 'fill', 'fill-rule']}},
                    {removeEmptyContainers: true},
                    {sortAttrs: true},
                    {removeUselessDefs: true},
                    {removeEmptyText: true},
                    {removeEditorsNSData: true},
                    {removeEmptyAttrs: true},
                    {removeHiddenElems: true},
                    {transformsWithOnePath: true}
                ]
            })
        ],

        del: [
            'dist/img',
            'tmp'
        ],

        plumber: {
            errorHandler: errorHandler
        }
    },

    posthtml: {
        plugins: [
            posthtmlAttrsSorter({
                order: [
                    'class',
                    'id',
                    'name',
                    'data',
                    'ng',
                    'src',
                    'for',
                    'type',
                    'href',
                    'values',
                    'title',
                    'alt',
                    'role',
                    'aria'
                ]
            })
        ],
        options: {}
    },

    htmlPrettify: {
        indent_char: ' ',
        indent_size: 4
    },

    /*postcss: [
      autoprefixer({
        cascade: false
      }),
      stylefmt({
        configFile: '.stylelintrc'
      })
    ]*/
};

// configuration for localhost
var configServer = {
    server: {
        baseDir: distFolder + "/"
    },
    host: 'localhost',
    port: 8080,
    open: true,
    logPrefix: "Frontend_Alex",
    notify: false
};

/* All tasks */

// Error handler for gulp-plumber
function errorHandler(err) {
    $.util.log([(err.name + ' in ' + err.plugin).bold.red, '', err.message, ''].join('\n'));

    this.emit('end');
}

function correctNumber(number) {
    return number < 10 ? '0' + number : number;
}

// Return timestamp
function getDateTime() {
    var now = new Date();
    var year = now.getFullYear();
    var month = correctNumber(now.getMonth() + 1);
    var day = correctNumber(now.getDate());
    var hours = correctNumber(now.getHours());
    var minutes = correctNumber(now.getMinutes());
    return year + '-' + month + '-' + day + '-' + hours + minutes;
}

gulp.task('cleanup', function (cb) {
    return del(options.del, cb);
});

// livereload
gulp.task('webserver', function () {
    browserSync(configServer);
});

//task for js build
gulp.task('js:build', function () {
    return gulp.src(options.src.js)
        .pipe(gulp.dest(options.dist.js))
        .pipe(reload({stream: true}));
});

//task for style build
gulp.task('style:build', function () {
    return gulp.src(options.src.style)
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss([autoprefixer()]))
        //.pipe(sourcemaps.init())
        //.pipe(postcss(plugins))
        //.pipe($.combineMq({ beautify: true }))
        //.pipe(sourcemaps.write('.'))
        //.pipe($.cssmin())
        .pipe(plumber.stop())
        .pipe(gulp.dest(options.dist.css))
        .pipe(reload({stream: true}));
});

//task for style min
gulp.task('style:min', function () {
    return gulp.src(options.src.style)
        .pipe(sass().on('error', sass.logError))
        .pipe($.combineMq({beautify: true}))
        .pipe(cleanCSS({debug: true}, function (details) {
            console.log(details.name + ': ' + details.stats.originalSize);
            console.log(details.name + ': ' + details.stats.minifiedSize);
        }))
        .pipe(gulp.dest('css/'));
});

gulp.task('html:build', function () {
    return gulp.src([options.src.html, '!src/includes/*.*'])
        .pipe(rigger())
        .pipe($.posthtml(options.posthtml.plugins, options.posthtml.options))
        //.pipe($.prettify(options.htmlPrettify))
        .pipe(gulp.dest(options.dist.html))
        .pipe(reload({stream: true}));
});

gulp.task('cleanup', function (cb) {
    return del(options.del, cb);
});

gulp.task('icons:build', function () {
    return gulp.src(options.src.svg)
        .pipe($.plumber(options.plumber))
        .pipe(cheerio({
            /*run: function ($) {
              $('[fill]').removeAttr('fill');
              $('[style]').removeAttr('style');
            },*/
            parserOptions: {xmlMode: true}
        }))
        .pipe(replace('&gt;', '>'))
        .pipe(svgmin({
            plugins: [{
                removeDoctype: false
            }, {
                removeComments: true
            }, {
                cleanupNumericValues: {
                    floatPrecision: 2
                }
            }, {
                convertColors: {
                    names2hex: true,
                    rgb2hex: true
                }
            }]
        }))
        .pipe($.svgSymbols(options.svgSprite))
        .pipe($.if(/\.svg$/, $.rename({
            basename: "icons",
            extname: ".html"
        })))
        .pipe($.if(/\.html/, gulp.dest(options.dist.icons)));
});

gulp.task('image:build', function() {
    return gulp.src(options.src.img)
        .pipe(imagemin(options.imagemin.images))
        .pipe(gulp.dest(options.dist.img))
        .pipe(reload({stream: true}))
});

//task for fonts copy
gulp.task('fonts:build', function () {
    return gulp.src(options.src.fonts)
        .pipe(gulp.dest(options.dist.fonts))
});

gulp.task('build:zip', function () {
    var datetime = '-' + getDateTime();
    var zipName = 'dist' + datetime + '.zip';

    return gulp.src(options.dist.css)
        .pipe($.zip(zipName))
        .pipe(gulp.dest('zip'));
});

gulp.task('cleanup', function (cb) {
    return del(options.del, cb);
});

/*
  Tasks:
  * build (gulp build) -- start building task
  * production (gulp build) -- minification files (now - only CSS)
  * zip (gulp build) -- package to zip-archive (only markup)
  * deploy (gulp deploy) -- deploying on configured server
  * watch (gulp watch)
*/

gulp.task('build', function (cb) {
    return runSequence(
        'cleanup',
        'html:build',
        //'js:build',
        'style:build',
        'image:build',
        //'icons:build',
        //'fonts:build',
        cb
    );
});

gulp.task('production', function (cb) {
    return runSequence(
        'cleanup',
        //'html:min',
        //'js:min',
        'style:min',
        cb
    );
});

gulp.task('zip', function (cb) {
    return runSequence(
        'build',
        'production',
        'build:zip',
        cb
    );
});

gulp.task('deploy', function (cb) {
    return runSequence(
        'build',
        'deploy:publish',
        cb
    );
});

// watch task
gulp.task('watch', function () {
    $.watch([options.watch.html], function () {
        gulp.start('html:build');
    });
    /*$.watch([options.watch.fonts], function () {
      gulp.start('fonts:build');
    })
    $.watch([options.watch.js], function () {
      gulp.start('js:build');
    });
    $.watch([options.watch.svg], function () {
        gulp.start('icons:build');
    });
    */
    $.watch([options.watch.img], function () {
        gulp.start('image:build');
    });
    $.watch([options.watch.style], function () {
        gulp.start('style:build');
    });
});

// watch task
gulp.task('style-w', function () {
    $.watch([options.watch.style], function () {
        gulp.start('style:build');
    });
});

// main default task
gulp.task('default', function (cb) {
    return runSequence(
        'build',
        [
            'webserver',
            'watch'
        ],
        cb
    );
});
