var gulp = require('gulp')
    , sourcemaps = require('gulp-sourcemaps')
    , jade = require('gulp-jade')
    , imagemin = require('gulp-imagemin')
    , plumber = require('gulp-plumber')
    , pngquant = require('imagemin-pngquant')
    , order = require("gulp-order")
    , postcss = require('gulp-postcss')
    , custom = require('postcss-custom-properties')
    , nested = require('postcss-nested')
    , color = require('postcss-color-function')
    , vars = require('postcss-simple-vars')
    , mixin = require('postcss-mixins')
    , imprt = require('postcss-import')
    , autoprefixer = require('autoprefixer-core')
    , concat = require('gulp-concat')
    , gulpif = require('gulp-if')
    , build = require('gulp-gh-pages')
    , uglify = require('gulp-uglify')
    , uglifycss = require('gulp-uglifycss')
    , ext = require('gulp-ext')
    , babel = require("gulp-babel")
    , dirs = {
        'source': {
            'jade': ['./source/elements/**/*.jade', './source/pages/*.jade', './source/partials/*.jade'],
            'page': './source/pages/*.jade',
            'copy': './source/copy/**/*',
            'js': ['./node_modules/regenerator/runtime.js', './source/elements/**/*.js', './source/js/*.js'],
            'css': ['./source/elements/**/*.css', './source/css/**/*.css'],
            'images': './source/images/**/*',
            'fonts': './source/fonts/**/*'
        },
        'build': {
            'html': './build/',
            'phtml': './build/elements/',
            'fonts': './build/fonts/',
            'js': './build/js/',
            'css': './build/css/',
            'images': './build/images/'
        }
    };

gulp.task('copy', function() {
    gulp.src(dirs.source.copy).pipe(gulp.dest(dirs.build.html));
});

gulp.task('fonts', function() {
    gulp.src(dirs.source.fonts).pipe(gulp.dest(dirs.build.fonts));
});

gulp.task('images', function() {
    return gulp.src(dirs.source.images)
        .pipe(plumber())
        .pipe(gulpif(/[.](png|jpeg|jpg|svg)$/, imagemin({
            progressive: true,
            svgoPlugins: [{
                removeViewBox: false
            }],
            optimizationLevel: 1,
            use: [pngquant()]
        })))
        .pipe(gulp.dest(dirs.build.images));
});

gulp.task('html', function() {
    return gulp.src(dirs.source.page)
        .pipe(plumber())
        .pipe(jade({
            pretty: true
        }))
        .pipe(gulp.dest(dirs.build.html));
});

gulp.task('phtml', function() {
    return gulp.src(dirs.source.jade)
        .pipe(plumber())
        .pipe(jade({
            pretty: true
        }))
        .pipe(ext.replace('phtml'))
        .pipe(gulp.dest(dirs.build.phtml));
});

gulp.task('js', function() {
    return gulp.src(dirs.source.js)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(concat("scripts.js"))
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(dirs.build.js));
});

gulp.task('css', function() {
    var processors = [
        imprt({
            from: process.cwd() + '/source/elements/layout/layout.css',
            glob: true
        }), mixin, vars, nested, color, autoprefixer({
            browsers: ['last 2 version', 'IE 8', 'IE 9', 'IE 10', 'IE 11', 'Opera 12']
        })
    ];

    return gulp.src(dirs.source.css)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(order(['reset.css', 'fonts.css']))
        .pipe(postcss(processors))
        .pipe(concat("styles.css"))
        .pipe(uglifycss())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(dirs.build.css));
});

gulp.task('build', function() {
    console.log('deploying');
    return gulp.src('build/**')
        .pipe(plumber())
        .pipe(build({
            branch: 'gh-pages',
            cacheDir: 'gh-cache',
            remoteUrl: 'git@github.com:SilentImp/vaimo.git'
        }).on('error', function() {
            console.log('error', arguments);
        }));
});

gulp.task('watch', function() {
    gulp.watch([dirs.source.css], ['css']);
    gulp.watch(dirs.source.jade, ['html']);
    gulp.watch(dirs.source.js, ['js']);
});

gulp.task('default', ['copy', 'fonts', 'html', 'phtml', 'css', 'js', 'images']);
