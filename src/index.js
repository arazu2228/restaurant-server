const { apollo } = require('./handlers/apollo')
const { startStandaloneServer } = require('@apollo/server/standalone')
const context = require('./handlers/context')
const {cpus} = require("os")
const cluster = require("cluster")

if(cluster.isPrimary){
  for(let i = 0; i < cpus().length; i++){
    cluster.fork()
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`)
  })
} else {
  startStandaloneServer(apollo, {
    listen: 3000,
    context,
  }).then(({ url }) => {
    console.log(`CM Apollo server ready at ${url}, Worker ${process.pid} started`)
  })
}
