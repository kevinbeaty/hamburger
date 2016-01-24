# Hamburger.js

A thread first Promise execution DSL.

## Example

We will solve the [async-problem](https://github.com/plaid/async-problem):

> Given a path to a directory containing an index file, index.txt, and zero or more other files, read the index file (which contains one filename per line), then read each of the files listed in the index concurrently, concat the resulting strings (in the order specified by the index), and write the result to stdout. 

### Ramda

Documentation WIP...

```javascript
const fs = require('fs')
const path = require('path')
const hamburger = require('hamburger')

const Promise = require('bluebird')
const R = require('ramda')
const S = require('sanctuary')

const join = R.curryN(2, path.join)
const readFile = R.curry(R.flip(Promise.promisify(fs.readFile)))

const concatFiles = (dir) =>
  hamburger
  ()
    (join(dir, 'index.txt'))
    (readFile({encoding: 'utf8'}))
    (S.lines)
    (R.map(join(dir)))
    (R.map(readFile({encoding: 'utf8'})))
    (Promise.all)
    (R.join(''))
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

### Lodash

```javascript
const _ = require('lodash')

const readFile = _.ary(Promise.promisify(fs.readFile), 2)
const join = _.ary(path.join, 2)

const concatFiles = (dir) =>
  hamburger
  ()
    (dir)
    (join, 'index.txt')
    (readFile, {encoding: 'utf8'})
    (_.split, '\n')
    (_.filter)
    (_.map, _.partial(join, dir))
    (_.map, _.partial(readFile, _, {encoding: 'utf8'}))
    (Promise.all)
    (_.join, '')
  ()
```

```javascript
const readUTF8 = _.partial(_.ary(Promise.promisify(fs.readFile), 2), _, {encoding: 'utf8'})
const join = _.curry(path.join, 2)

const concatFiles = (dir) =>
  hamburger
  ()
    (join(dir, 'index.txt'))
    (readUTF8)
    (_.split, '\n')
    (_.filter)
    (_.map, _.unary(join(dir)))
    (_.map, readUTF8)
    (Promise.all)
    (_.join, '')
  ()
```
