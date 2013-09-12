'use strict';

var fs = require('fs');
var url = require('url');
var _ = require('lodash');
var Q = require('q');
var generateAngularTemplate = require('generate-angular-template');
var onTheFlyMiddleware = require('otf-render-middleware');
var fileMatches = require('file-matches');

function templateRender(options) {
  var deferred = Q.defer();

  var stripPrefix = new RegExp('^' + options.stripPrefix);
  var prependPrefix = options.prependPrefix;
  var cacheIdFromPath = options.cacheIdFromPath ||function (filepath) {
    return prependPrefix + filepath.replace(stripPrefix, '');
  };
  var htmlPath = cacheIdFromPath(options.file);

  fs.readFile(options.file, function(err, content) {
    if (err) { deferred.reject(err); }

    var template = generateAngularTemplate({
      moduleName: options.moduleName,
      htmlPath: htmlPath,
      content: content.toString()
    });

    deferred.resolve(template);
  });

  return deferred.promise;
}

function middleware(options) {
  options = _.extend({
    prependPrefix: '',
    stripPrefix: '',
    root: './',
    fileNameTransform: function fileNameTransform(filepath) {
      return filepath.replace(fileMatches.template.match, fileMatches.html.ext);
    },
    compile: function compile(options) {
      return templateRender(options);
    }
  }, options);

  return function angularMiddleware(req, res, next) {
    var pathname = url.parse(req.url).pathname;
    if (!fileMatches.template.match.test(pathname)) { return next(); }

    var renderOptions = onTheFlyMiddleware.getOptions(pathname, options);

    res.setHeader('Content-Type', 'application/javascript');

    onTheFlyMiddleware.render({
      res: res,
      next: next
    }, renderOptions);
  };
}

module.exports = middleware;
