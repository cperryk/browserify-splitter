# browserify-splitter

Browserify-splitter is a Browserify plugin that allows you to split a bundle into separate files in such a way that module files can be concatenated arbtrarily.

This is currently in development. Use with caution!

## Installation
`npm install browserify-splitter --save`

## Usage

```
// a.js
require('lodash');
require('./c.js')
```

```
// b.js
// do something
```

```
const splitter = require('browserify-splitter');

browserify()
  .require('./a.js')
  .require('./b.js')
  .plugin(splitter, {
    writeToDir: 'public/js'
  })
  .bundle();
```

This will write the five following files to `public/js`:

* `prelude.js` - Javascript that starts a bundle.
* `a.js` - Module chunk file for `a` module.
* `b.js` - Module chunk file for `b` module.
* `c.js` - Module chunk file for `c` module.
* `lodash.js` - Module chunk file for `lodash`.
* `postlude.js` - Javascript that ends the bundle.

You could generate the entire bundle by concatenating all of these files together. If you didn't need `b.js`, you could leave it out, and the resulting bundle will still be valid. You can include or exclude any modules from the bundle as long as you include `prelude` at the beginning and `postlude` at the end.

## Plugin Configuration

* `writeToDir`: Required. String.
* `verbose`: Boolean. Log all file writes. Defaults to `false`.

## What's this for?

Oftentimes, developers use Browserify to precompile client JS during a build step. However, what happens when you don't know what the client needs until runtime? You have a few options:

* Include all the JS the client possibly needs, though this may result in huge bundles.
* Bundle only modules we know the client needs, and have the client fetch other JS as needed via async requests, though this could mean dozens of async requests.
* Bundle on-the-fly, on request. Under many circumstances, this may not be performant, especially if you're transpiling or making other transformations.

Browserify-splitter lets you leave all the costly parts of bundle generation -- JS parsing, dependency tracing, transpiling, and transforming -- to the build step, and reap the benefits of on-the-fly bundling without sacrificing performance. By combining the plugin with [browserify-extract-registy](https://github.com/cperryk/browserify-extract-registry), you can export the dependency registry during your build and use it at runtime to compute dependencies based on the user's request, concatenate the appropriate modules, and give this dynamically generated bundle to the user.
