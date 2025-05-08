var gulp = require('gulp')
var getEnabledTasks = require('../lib/getEnabledTasks')

var defaultTask = function(cb) {
  var tasks = getEnabledTasks('watch')
  return gulp.series(
    'clean',
    gulp.parallel(tasks.assetTasks),
    gulp.parallel(tasks.codeTasks),
    'static',
    'watch'
  )(cb)
}

gulp.task('default', defaultTask)
module.exports = defaultTask