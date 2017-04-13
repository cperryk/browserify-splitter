const expect = require('chai').expect,
  sinon = require('sinon'),
  stream = require('stream'),
  fs = require('fs-extra'),
  buf = s => Buffer.from(s, 'utf8'),
  util = require('./lib/util'),
  browserify = require('browserify');

/**
 * Mocks a readable stream.
 * @param {Array} chunks
 * @param {boolean} objectMode
 * @return {object} readable stream
 */
function mockStream(chunks, objectMode) {
  const s = new stream.Readable({objectMode: objectMode});

  chunks.forEach(chunk => s.push(chunk));
  s.push(null);
  return s;
};

/**
 * Checks if each value in the stream matches the expected values.
 * @param  {object} stream
 * @param  {array} values
 * @param  {function} done
 */
function expectValues(stream, values, done) {
  let i = 0;

  stream
    .on('data', (val) => {
      const compare = values[i++];

      if (typeof compare === 'object') {
        expect(val).to.deep.equal(compare);
      } else {
        expect(val).to.equal(compare);
      }
    })
    .on('end', () => {
      if (i === values.length) {
        done();
      } else {
        done(new Error(`Expected ${values.length} results but got ${i}`));
      }
    })
    .on('error', done);
};

describe('index.js', function () {
  const fn = require('./index');

  it ('throws error if writeToDir is not set', function () {
    expect(()=> fn(browserify(), {})).to.throw(Error);
  });

  it ('configures fileWriter correctly', function () {
    const sandbox = sinon.sandbox.create();

    sandbox.stub(util, 'fileWriter');
    fn(browserify(), {writeToDir: 'someDir', verbose: true});
    util.fileWriter.calledWith('someDir', true);
    sandbox.restore();
  });

});

describe('util.js', function () {
  let sandbox;

  describe('splitBundle', function () {
    const fn = util[this.title];

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });
    afterEach(function () {
      sandbox.restore();
    });

    it ('splits a pack stream as expected', function (done) {
      const stream = mockStream([
          buf('preludeA'),
          buf('preludeB'),
          buf('moduleA'),
          buf(',moduleB'),
          buf('postlude')
        ]),
        modules = [{
          id: 'moduleA',
          file: './src/moduleA'
        }, {
          id: 'moduleB',
          file: './src/moduleB'
        }],
        expectedValues = [
          {path: 'moduleA.js', label: './src/moduleA', content: buf(',moduleA')},
          {path: 'moduleB.js', label: './src/moduleB', content: buf(',moduleB')},
          {path: 'prelude.js', label: '(prelude)', content: buf('preludeApreludeB0:[]')},
          {path: 'postlude.js', label: '(postlude)', content: buf('postlude;')}
        ],
        splitter = fn(modules);

      expectValues(stream.pipe(splitter), expectedValues, done);
    });
  });

  describe('fileWriter', function () {
    const fn = util[this.title];
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      sandbox.stub(fs, 'outputFile');
      fs.outputFile.callsFake((file, content, cb) => cb());
    });
    afterEach(function () {
      sandbox.restore();
    });
    it ('writes out files as expected', function (done) {
      mockStream([
        {path: 'moduleA.js', label: './src/moduleA', content: buf('foo')},
        {path: 'moduleB.js', label: './src/moduleB', content: buf('bar')}
      ], true)
      .pipe(fn('someDir'))
      .on('finish', () => {
        expect(fs.outputFile.calledWith('someDir/moduleA.js', buf('foo'))).to.be.true;
        expect(fs.outputFile.calledWith('someDir/moduleB.js', buf('bar'))).to.be.true;
        done();
      });
    });
    it ('logs file writes if log is set', function (done) {
      mockStream([
        {path: 'moduleA.js', label: './src/moduleA', content: buf('foo')},
      ], true).pipe(fn('someDir', true))
      .on('finish', () => {
        expect(console.log.called).to.be.true;
        done();
      });
      sandbox.spy(console, 'log');
    });
  });
});
