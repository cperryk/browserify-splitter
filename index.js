'use strict';

const path = require('path'),
  through = require('through2'),
  fs = require('fs-extra');

/**
 * Collects the IDs of a stream of module-dependencies
 * and adds them to the given array.
 * @param  {Object[]} arr
 * @return {Object} A stream
 */
function collectModules(arr) {
  return through.obj(function (row, enc, next) {
    arr.push({
      id: row.id,
      file: row.file
    });
    next(null, row);
  });
}

/**
 * Write out all the pieces of a browser-pack stream to
 * individual files such that any modules can be concatenated
 * arbitrarily.
 * @param  {Object} opts
 * @param  {string} opts.writeToDir Destination path
 * @param  {Object[]} modules An array of module data
 * @return {Object} A stream
 */
function splitBundle(opts, modules) {
  const conf = opts || {},
    outputFile = fileWriter(conf.writeToDir || './', conf.verbose);
  let chunkIndex = 0,
    prelude = '',
    postlude = '';

  return through.obj(function (row, enc, next) {

    // The first two chunks are not modules
    if (chunkIndex < 2) {
      prelude += row.toString();

    // Additional chunks wrap up the bundle
    } else if (chunkIndex - 2 >= modules.length) {
      postlude += row.toString();

    } else {
      const module = modules[chunkIndex - 2];

      // Ensure that the first module in the pack has a comma like the others.
      if (chunkIndex === 2) {
        row = Buffer.from(',' + row.toString());
      }
      outputFile(module.id + '.js', row, module.file);
    }

    chunkIndex ++;
    next();
  })
  .on('end', ()=>{
    // Add an empty module at the beginning to ensure that the starting comma of
    // any real module does not cause a syntax error
    prelude += '0:[]';
    postlude += ';';
    outputFile('prelude.js', Buffer.from(prelude), '(prelude)');
    outputFile('postlude.js', Buffer.from(postlude), '(postlude)');
  });
}

/**
 * Returns a function that writes a file synchronously and logs it.
 * @param {string} outDir
 * @param {boolean} [log] If true, logs writes
 * @return {function}
 */
function fileWriter(outDir, log) {
  return (outfile, data, label) => {
    const outpath = path.join(outDir, outfile);

    fs.writeFileSync(outpath, data);
    if (log) {
      console.log(`written: ${label} => ${outpath}`);
    }
  };
}

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

  b.pipeline.get('emit-deps').push(collectModules(modules));
  b.pipeline.get('pack').push(splitBundle(opts, modules));
};
