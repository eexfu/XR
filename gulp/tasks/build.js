var gulp = require('gulp')
var getEnabledTasks = require('../lib/getEnabledTasks')

var buildTask = function(cb) {
  var tasks = getEnabledTasks('production')
  return gulp.series(
    'clean',
    gulp.parallel(tasks.assetTasks),
    gulp.parallel(tasks.codeTasks),
    'static',
    function(buildDone) {
      // Log a message when build is complete
      console.log('Build complete!')
      buildDone()
    }
  )(cb)
}

gulp.task('build', buildTask)
module.exports = buildTask 