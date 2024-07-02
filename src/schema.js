module.exports = `
  scalar JSON
 
  type Cm {
    params: JSON #all the shared data objects will reside here
  }


  # ======================= cm query =======================

  type Query {
    cm(userId: String!, provider: String!, language: String!): Cm
  }

  # ======================= cm cache mutation =======================

  type Mutation {
    # evictUserCache(userId: String!): String
    # evictAllCache: String
  }
`;
