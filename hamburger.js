module.exports = hamburger
function hamburger(tasks){
  tasks = tasks && tasks.slice() || []
  return function(){
    if(arguments.length){
      tasks.push([].slice.call(arguments))
      return hamburger(tasks)
    } else if(tasks.length){
      return runNext(tasks)
    }
  }
}

function runNext(tasks){
  tasks = tasks.slice()
  var task = tasks.shift().slice()
  return new Promise(function(resolve, reject){
    try {
      var fn = task.shift()
      if(typeof fn === 'function'){
        resolve(fn.apply(null, task))
      } else {
        resolve(fn)
      }
    } catch(err){
      reject(err)
    }
  }).then(function(result){
    if(tasks.length){
      tasks[0] = tasks[0].slice()
      tasks[0].splice(1, 0, result)
      return runNext(tasks)
    }
    return result
  })
}
