# Hamburger.js

A thread first Promise execution DSL.

## Example

We will solve the [async-problem](https://github.com/plaid/async-problem):

> Given a path to a directory containing an index file, index.txt, and zero or more other files, read the index file (which contains one filename per line), then read each of the files listed in the index concurrently, concat the resulting strings (in the order specified by the index), and write the result to stdout.

A solution:

```javascript
const fs = require('fs')
const path = require('path')
const hamburger = require('hamburger')

const Promise = require('bluebird')
const _ = require('lodash')

const readFile = Promise.promisify(fs.readFile)

const concatFiles = (dir) =>
  hamburger
  ()
    (dir)
    (path.join, 'index.txt')
    (readFile, {encoding: 'utf8'})
    (_.split, '\n')
    (_.filter)
    (_.map, _.unary(_.partial(path.join, dir)))
    (_.map, _.partial(readFile, _, {encoding: 'utf8'}))
    (Promise.all)
    (_.join, '')
  ()

const main = () => {
  concatFiles(process.argv[2])
  .then(data => {
      process.stdout.write(data)
      process.exit(0)
    },
    err => {
      process.stderr.write(String(err) + '\n')
      process.exit(1)
    })
}

if (process.mainModule.filename === __filename) main()
```

## Discussion

Here is `concatFiles` again, but annotated:

```javascript
/**
 * concatFiles accepts a directory and returns
 * a Promise solving the async-problem described above.
 */
function concatFiles(dir){
  // Call hamburger with no args to start a chain
  // which returns functions that accept tasks to
  // run. The returned function will continue returning
  // functions until called with no arguments. Once
  // called with no arguments, the tasks will be run in
  // the order defined threading the result of each function
  // call as the the first argument of the next task
  return hamburger()

    // If the first argument in a task is not a function
    // it is resolved as a Promise. Once resolved, it is
    // threaded into the first argument of the next task
    // Here `dir` is a String, so it is resolved directly.
    (dir)

    // The first argument is a function, so it is called
    // with the result of the previous task as the first
    // argument and any additional arguments following the
    // first, i.e, `path.join(dir, 'input.txt)`. The result
    // of this function is threaded to the first argument
    // of the next task
    (path.join, 'index.txt')

    // `readFile` is a promisified version of `fs.readFile`.
    // Since it is a function, it is called with the result
    // of the previous task arguments:
    //
    // readFile(path.join(dir, 'input.txt'))
    //
    // This returns a promise which will be resolved before
    // threading into the next task
    (readFile, {encoding: 'utf8'})

    // Since the previous task returned a promise, it must
    // be resolved. The result is threaded into the first
    // argument of the next task:
    //
    // readFile(path.join(dir, 'input.txt'))
    //  .then((result) => _.split(result, '\n')
    //
    // This results in an array of lines in the file
    (_.split, '\n')

    // The array of lines is threaded into `_.filter(lines)`
    // to remove any empty lines.
    (_.filter)

    // We have an array of file names, map this array using
    // a function that joins the directory before the filename
    // We are using `_.unary` here because `_.map` includes
    // the array index, which we want to ignore in `join`.
    //
    // _.map(fileNames, (fileName) => path.join(dir, fileName))
    //
    (_.map, _.unary(_.partial(path.join, dir)))

    // We now have an array of fully qualified file paths
    // Map this again using the promisified `readFile`
    //
    // _.map(filePaths, (filePath) =>
    //    readFile(filePath, {encoding: 'utf8'}))
    //
    // This will return an array of promises. Each promise
    // is reading a file and the files are read in parallel
    (_.map, _.partial(readFile, _, {encoding: 'utf8'}))

    // We have an array of Promises, await with `Promise.all`:
    //
    // Promise.all(arrayOfReadFilePromises)
    //
    // This returns a new Promise that  awaits all `readFile`
    // promises to complete. The returned promise will be
    // resolved with an array of file contents as UTF8 strings.
    (Promise.all)

    // Join the array of file contents
    //
    // Promise.all(arrayOfReadFilePromises)
    //   .then((contentsArray) => _.join(contentsArray, ''))
    //
    (_.join, '')

    // We are done adding tasks, call with no-args to end the
    // chain and return a Promise of the result of the final task.
  ()
}
```

## Tasks

The function chaining is sugar for building an array of tasks. Each task
is defined as an array.

- If the first argument of the array is not a function, it is resolved as a
Promise and threaded as the first argument of the next task.
- If the first argument of the array is a function,
it is executed with the result of the previous task as the first argument and
any additional arguments defined in the array as additional arguments.
- If the first argument is `undefined`, i.e. the function is called with
no arguments, it is not added as a task. Instead the first task is executed
and a Promise is returned for the result of the entire task chain.

Here is the example again with tasks explicitly created without the function
chaining sugar:

```javascript
function concatFiles(dir){
  // create a thunk of tasks
  var burger = hamburger([
    [dir],
    [path.join, 'index.txt'],
    [readFile, {encoding: 'utf8'}],
    [_.split, '\n'],
    [_.filter],
    [_.map, _.unary(_.partial(path.join, dir))],
    [_.map, _.partial(readFile, _, {encoding: 'utf8'})],
    [Promise.all],
    [_.join, '']
  ])

  // execute the thunk of tasks and return the Promise
  return burger()
}
```
Note the first task will not be run until the thunk is executed (by calling with no arguments) and any subsequent task will not run until prior tasks have completed. The returned thunk can be executed multiple times with all tasks executed again.  This can be used for rerunning the same tasks that may have side effects, e.g. a request to a web service that changes over time.  In our example, we could re-execute the task chain if the contents of the files change over time.

```javascript
function concatFilesThunk(dir){
  // create a thunk of tasks
  var burger = hamburger([
    [dir],
    [path.join, 'index.txt'],
    [readFile, {encoding: 'utf8'}],
    [_.split, '\n'],
    [_.filter],
    [_.map, _.unary(_.partial(path.join, dir))],
    [_.map, _.partial(readFile, _, {encoding: 'utf8'})],
    [Promise.all],
    [_.join, '']
  ])

  // return the reusable thunk
  return burger
}

var thunk = concatFilesThunk(dir)

// re-execute the task chain multiple times
thunk().then((result1) => {})
thunk().then((result2) => {})
```
