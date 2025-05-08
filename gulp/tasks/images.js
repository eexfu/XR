var config      = require('../config')
if(!config.tasks.images) return

var browserSync = require('browser-sync')
var newer       = require('gulp-newer')
var gulp        = require('gulp')
var imagemin    = require('gulp-imagemin')
var path        = require('path')
var plumber     = require('gulp-plumber')  // 添加错误处理

var paths = {
  src: path.join(config.root.src, config.tasks.images.src, '/**/*.{' + config.tasks.images.extensions + '}'),
  dest: path.join(config.root.dest, config.tasks.images.dest)
}

var imagesTask = function() {
  return gulp.src([paths.src, '!**/README.md', '!**/vorlage.gif'])
    .pipe(plumber({  // 添加错误处理
      errorHandler: function(err) {
        console.log(err.toString());
        this.emit('end');
      }
    }))
    .pipe(newer(paths.dest))
    .pipe(imagemin({
      verbose: true,  // 显示详细信息
      silent: false   // 不静默处理
    }))
    .pipe(gulp.dest(paths.dest))
    .pipe(browserSync.stream())
}

gulp.task('images', imagesTask)
module.exports = imagesTask