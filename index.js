'use strict';

const path = require('path'),
  through = require('through2'),
  fs = require('fs-extra');

/**
 * Collects the IDs of a stream of module-dependencies
 * and adds them to the given array.
 * @param  {String[]} arr
 * @return {Object} - A stream
 */
function collectIds(arr) {
  return through.obj(function (row, enc, next) {
    arr.push(row.id);
    next(null, row);
  });
}

/**
 * Write out all the pieces of a browser-pack stream to
 * individual files such that any modules can be concatenated
 * arbitrarily.
 * @param  {String} dest - Destination path
 * @param  {String[]} ids - An array of dependency IDs
 * @return {Object} - A stream
 */
function splitBundle(opts, ids) {
  let chunkIndex = 0,
    prelude = '',
    postlude = '',
    outDir;

  opts = opts || {};
  outDir = opts.writeToDir || './';

  const pipe = through.obj(function (row, enc, next) {

    // The first two chunks are not modules
    if (chunkIndex < 2) {
      prelude += row.toString();

    // Additional chunks wrap up the bundle
    } else if (chunkIndex - 2 >= ids.length) {
      postlude += row.toString();

    } else {
      // Ensure that the first module in the pack has a comma like the others.
      if (chunkIndex === 2) {
        row = Buffer.from(',' + row.toString());
      }
      fs.outputFile(path.join(outDir, ids[chunkIndex - 2] + '.js'), row);
    }
    chunkIndex ++;
    next();
  });

  pipe.on('end', ()=>{
    // Add an empty module at the beginning to ensure that the starting comma of
    // any real module does not cause a syntax error
    prelude += '0:[]';

    postlude += ';';

    fs.writeFile(path.join(outDir, 'prelude.js'), Buffer.from(prelude));
    fs.writeFile(path.join(outDir, 'postlude.js'), Buffer.from(postlude));
  });

  return pipe;
}

/**
 * A Browserify plugin that will write out the chunks of a bundle to individual
 * files in such a way that any modules can be concatenated arbitrarily together.
 * Writes these files:
 * - A "prelude.js" file that must appear before any modules
 * - One module JS file for each module in the bundle, named according to the module ID
 * - A "postlude.js" file that must appear after any modules
 * @param  {Object} b - A bundle
 * @param  {Object} opts - Plugin options
 * @param  {String} opts.writeToDir - Path to directory to which files will be written
 */
module.exports = function splitterPlugin(b, opts) {
  const ids = [];

  b.pipeline.get('emit-deps').push(collectIds(ids));
  b.pipeline.get('pack').push(splitBundle(opts, ids));
};
