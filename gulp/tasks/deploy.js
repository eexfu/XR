var config  = require('../config')
var ghPages = require('gulp-gh-pages')
var gulp    = require('gulp')
var open    = require('open')
var os      = require('os')
var package = require('../../package.json')
var path    = require('path')

var settings = {
  url: package.homepage,
  src: path.join(config.root.dest, '/**/*'),
  ghPages: {
    cacheDir: path.join(os.tmpdir(), package.name)
  }
}

var deployTask = function() {
  return gulp.src(settings.src)
    .pipe(ghPages(settings.ghPages))
    .on('end', function(){
      open(settings.url)
    })
}

const productionTask = require('./production')
gulp.task('deploy', gulp.series(productionTask, deployTask))
module.exports = deployTask
