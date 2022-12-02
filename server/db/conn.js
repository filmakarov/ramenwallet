const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.ATLAS_URI;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1
});

let dbConnect

module.exports = {
    connectToServer: function (callback) {
      client.connect(function (err, db) {
        if (err || !db) {
          return callback(err);
        }

        dbConnect = db.db(process.env.ATLAS_DB_NAME);
        console.log('Successfully connected to MongoDB.');

        return callback();
      });
    },
  
    getDb: function () {
      return dbConnect;
    },
};