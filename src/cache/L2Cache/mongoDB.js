const { MongoClient, ObjectId } = require("mongodb");
// const { cachedLast } = require("../providers/kognitiv/helpers/cache");
const { isString, isStringValue, isDefined } = require("../../utils/type");
let instance = null;
class DB {
  constructor() {
    if (!instance) {
      this._client = null;
      this._connect();
    }
    return instance;
  }
  _connectionString () {
    // return (
    //   "mongodb://" +
    //   process.env.MONGO_DB_USER +
    //   ":" +
    //   process.env.MONGO_DB_PASSWORD +
    //   "@" +
    //   process.env.MONGO_DB_HOST +
    //   "/" +
    //   process.env.MONGO_DB_NAME
    // );
    return (
      "mongodb://mts:FuaHoo9cahpa7wah@mongodb1.mts-online.com:27017,mongodb2.mts-online.com:27017,mongodb3.mts-online.com:27017/?authSource=admin&replicaSet=reps0&readPreference=primary&appname=MongoDB%20Compass&ssl=true"
    )
  }
  async _connect() {
    if (this._client) return;

    const uri = this._connectionString();
    this._client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await this._client.connect();
      console.log("Connected to MongoDB successfully.");
      instance = this; // Set instance on successful connection

      // Setup graceful shutdown
      process.on("SIGINT", () => this.close().then(() => process.exit(0)));
      process.on("SIGTERM", () => this.close().then(() => process.exit(0)));
    } catch (error) {
      console.error("Failed to connect to MongoDB", error);
      process.exit(1);
    }
  }
  async close() {
    if (this._client) {
      await this._client.close();
      console.log("MongoDB connection closed.");
      this._client = null; // Clear the client on close to allow for re-connection
      instance = null; // Reset instance for potential future connections
    }
  }
  async client () {
    if (!this._client) {
      await this._connect();
      }
      return this._client;
    // try {
    //   if (!this._client) {
    //     this._client = new MongoClient(this.connection(), {
    //       useNewUrlParser: true,
    //       useUnifiedTopology: true
    //     });
    //     await this._client.connect();
    //   }
    // } catch (error) {
    //   throw new Error("Mongo Database connection failed!");
    // }
    // return this._client;
  }

  async collection (name) {
    return (await this.client()).db("cm_alpinebits").collection(name);
  }

  prepareOptions(options) {
    ["projection", "sort"].forEach((option) => {
      if (!options[option]) {
        return;
      }
      if (isString(options[option])) {
        //convert comma separated list to indexed object with value=1
        const elements = options[option].split(/\s*,\s*/);
        options[option] = {};
        elements.forEach((element) => {
          if (element.indexOf('!') === 0) {
            options[option][element.substr(1)] = -1;
          } else {
            options[option][element] = 1;
          }
        });
      }
    });
    if (options["writeConcern"] && options["writeConcern"] === true) {
      options["writeConcern"] = { w: "majority", j: true, wtimeout: 5000 };
    }
    return options
  }

  prepareFilter(filter) {
    if (isString(filter) && filter.match(/^[a-z0-9]{24}$/)) {
      filter = new ObjectId(filter);
    }
    if (filter instanceof ObjectId) {
      filter = { _id: filter };
    }
    return filter
  }

  prepareDocument(document) {
    if (isString(document._id) && document._id.match(/^[a-z0-9]{24}$/)) {
      document._id = new ObjectId(document._id);
    }
    return document
  }

  id(_id, keyName) {
    if (isString(_id) && _id.match(/^[a-z0-9]{24}$/)) {
      return isStringValue(keyName) ? {[keyName]: new ObjectId(_id)} : new ObjectId(_id)
    }
    if (!(_id instanceof ObjectId)) {
      throw new Error(`Invalid _id "${_id}"`)
    }
    if (isStringValue(keyName)) {
      return {[keyName]: _id}
    }
    return _id
  }

  idFromTime(time) {
    return ObjectId.createFromTime(time)
  }

  idRange(fromTime, toTime) {
    return { 
      _id: {
        '$gte': this.idFromTime(fromTime),
        '$lte': this.idFromTime(toTime)
      }
    }
  }

  async find(collection, filter = {}, options = {}, asArray = true) {
    const cursor = (await this.collection(collection)).find(this.prepareFilter(filter), this.prepareOptions(options));
    return asArray ? await cursor.toArray() : cursor;
  }

  async findOne (collection, filter = {}, options = {}) {
    const document = (await this.collection(collection)).findOne(this.prepareFilter(filter), this.prepareOptions(options));
    return document;
  }

  /**
   * Update many records in database and return result of the operation.
   */
  async update (collection, filter, update, options = {}) {
    if (Object.keys(update)[0].indexOf("$") !== 0) {
      update = { $set: this.prepareDocument(update) };
    }
    return (await this.collection(collection)).updateMany(
      this.prepareFilter(filter),
      update,
      this.prepareOptions(options)
    );
  }

  async updateOne (collection, filter, update, options = {}) {
    if (Object.keys(update)[0].indexOf("$") !== 0) {
      update = { $set: this.prepareDocument(update) };
    }
    return (await this.collection(collection)).updateOne(this.prepareFilter(filter), update, this.prepareOptions(options));
  }

  async insert (collection, documents, options = {}) {
    documents.map((document) => this.prepareDocument(document))
    const insertResult = (await this.collection(collection)).insertMany(
      documents,
      this.prepareOptions(options)
    );
    if (!insertResult.insertedCount) {
      return insertResult;
    }
    const insertIds = insertResult.insertedIds;
    documents.map((document, index) => (document._id = insertIds[index]));
    return insertResult;
  }

  async insertOne (collection, document, options = {}) {
    return (await this.collection(collection)).insertOne(
      this.prepareDocument(document),
      this.prepareOptions(options)
    );
  }

  async replaceOne (collection, filter, replacement, options = {}) {
    options = this.prepareOptions(options)
    isDefined(options.upsert) || (options.upsert = true); //upsert record by default
    isDefined(options.returnDocument) || (options.returnDocument = 2); //return document after by default
    //console.log('replaceOne', {collection, filter:this.prepareFilter(filter), options, replacement: this.prepareDocument(replacement)})
    return (await this.collection(collection)).findOneAndReplace(
      this.prepareFilter(filter),
      this.prepareDocument(replacement),
      options
    );
  }

  async delete (collection, filter = {}, options = {}) {
    return (await this.collection(collection)).deleteMany(this.prepareFilter(filter), this.prepareOptions(options));
  }

  async deleteOne (collection, filter = {}, options = {}) {
    return (await this.collection(collection)).findOneAndDelete(this.prepareFilter(filter), this.prepareOptions(options));
  }

  lookup (
    pipeline,
    from,
    localField = null,
    foreignField = "_id",
    alias = null,
    many = false
  ) {
    alias || (alias = from);
    localField || (localField = from + "_id");
    pipeline.push({
      $lookup: { from, localField, foreignField, as: alias },
    });
    if (!many) {
      pipeline.push({
        $unwind: {
          path: "$" + alias,
          preserveNullAndEmptyArrays: true,
        },
      });
    }
  }

  async aggregate (collection, pipeline, options = {}, asArray = true) {
    const cursor = (await this.collection(collection)).aggregate(
      pipeline,
      this.prepareOptions(options)
    );
    return asArray ? await cursor.toArray() : cursor;
  }

  async dropIndex (collection, name = null, options = {}) {
    return name
      ? (await this.collection(collection)).dropIndex(name, options)
      : (await this.collection(collection)).dropIndexes(this.prepareOptions(options));
  }

  async createIndex (collection, fields, name, options = {}) {
    return (await this.collection(collection)).createIndex(fields, {...this.prepareOptions(options), name})
  }

  async createIndexes (collection, indexes) {
    for (let key in indexes) {
      let index = {}
      indexes[key].forEach(value => index[value] = 1)
      let indexName = 'idx_' + collection.replace(/\./g, '_') + '_' + key
      (await this.collection(collection)).createIndex(index, {name: indexName})
    }
    return true
  }

};

module.exports = DB

