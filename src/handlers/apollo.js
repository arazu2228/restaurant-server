const { ApolloServer } = require('@apollo/server')
const resolvers = require('../resolvers')
const schema = require('../schema')
const {ApolloServerPluginUsageReportingDisabled} = require('@apollo/server/plugin/disabled')

const createServer = new ApolloServer({
  typeDefs: schema,
  resolvers,
  introspection: true,
  plugins: [ApolloServerPluginUsageReportingDisabled()]
})

module.exports = { apollo: createServer }
