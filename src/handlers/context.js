const db = require('../cache/L2Cache/mongoDB')

const context = ({ req }) => {
  return {
    db: new db(),
  }
}

module.exports = context
