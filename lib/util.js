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
 * @param  {Object[]} modules An array of module data
 * @return {Object} A stream
 */
function splitBundle(modules) {
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
      this.push({
        path: module.id + '.js',
        label: module.file,
        content: row
      });
    }

    chunkIndex ++;
    next();
  }, function (cb) {
    // Add an empty module at the beginning to ensure that the starting comma of
    // any real module does not cause a syntax error
    prelude += '0:[]';
    postlude += ';';
    this.push({
      path: 'prelude.js',
      label: '(prelude)',
      content: Buffer.from(prelude)
    });
    this.push({
      path: 'postlude.js',
      label: '(postlude)',
      content: Buffer.from(postlude)
    });
    cb();
  });
}


/**
 * Returns a function that writes a file synchronously and logs it.
 * @param {string} outDir
 * @param {boolean} [log] If true, logs writes
 * @return {function}
 */
function fileWriter(outDir, log) {
  return through.obj(function (item, enc, cb) {
    const outpath = path.join(outDir, item.path);

    fs.outputFile(outpath, item.content, function (err) {
      if (!err && log) {
        console.log(`written: ${item.label} => ${outpath}`);
      }
      cb(err, item.content);
    });
  });
}

module.exports.collectModules = collectModules;
module.exports.fileWriter = fileWriter;
module.exports.splitBundle = splitBundle;
