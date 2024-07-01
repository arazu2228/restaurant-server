const { resolvers } = require('./cm')

module.exports = {
  Query: {
    cm: async (parent, params, context, info) => {
      return resolvers[params.provider].resolveCm(parent, params, context, info)
    },
  },
  Cm: {
    params: async (parent, params, context, info) => {
      return {} //hide the params from being viewed
    },
  },
  // Mutation: {
  //   evictUserCache: async (parent, params, context, info) => {
  //     return evictUserCache(parent, params, context, info)
  //   },
  //   evictAllCache: async (parent, params, context, info) => {
  //     return evictAllCache(parent, params, context, info)
  //   },
  // },
}