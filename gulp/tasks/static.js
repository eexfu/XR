var config  = require('../config')
var newer = require('gulp-newer')
var gulp    = require('gulp')
var path    = require('path')

var paths = {
  src: [
    path.join(config.root.src, config.tasks.static.src, '/**'),
    path.join('!' + config.root.src, config.tasks.static.src, '/README.md')
  ],
  dest: path.join(config.root.dest, config.tasks.static.dest)
}

var staticTask = function() {
  return gulp.src(paths.src)
    .pipe(newer(paths.dest)) // Ignore unchanged files
    .pipe(gulp.dest(paths.dest))
}

gulp.task('static', staticTask)
module.exports = staticTask
