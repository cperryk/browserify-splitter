'use strict';

const splitBundle = require('./lib/util').splitBundle,
  collectModules = require('./lib/util').collectModules,
  fileWriter = require('./lib/util').fileWriter,
  pumpify = require('pumpify');

/**
 * Browserify plugin. Writes bundle chunks to files such that any
 * modules can be concatenated arbitrarily. Writes these files:
 * - A "prelude.js" file that must appear before any modules
 * - One module JS file for each module in the bundle, named according to the module ID
 * - A "postlude.js" file that must appear after any modules
 * @param  {Object} b A Browserify() instance
 * @param  {Object} opts Plugin options
 * @param  {string} opts.writeToDir Path to directory to which files will be written
 * @param  {boolean} [verbose] Log writes
 */
module.exports = function splitterPlugin(b, opts) {
  const modules = [];

  if (typeof opts.writeToDir !== 'string') {
    throw new Error('Browserify-splitter requires the "writeToDir" option to be set');
  }

  // Collect module data at the emit-deps phase. This is to allow splitBundle to (1)
  // know when to stop considering chunks modules, (2) determine how to name module
  // files, and (3) log paths to source files
  b.pipeline.get('emit-deps').push(collectModules(modules));

  b.pipeline.get('pack').push(pumpify([
    splitBundle(modules),
    fileWriter(opts.writeToDir, opts.verbose)
  ]));
};
