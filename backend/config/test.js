const { MongoClient, ServerApiVersion } = require("mongodb");

const uri =
  "mongodb+srv://snehalpoovadan_db_user:qp0skDd2fXgbOKyV@campusconnect.gwrdke6.mongodb.net/?retryWrites=true&w=majority&appName=CampusConnect";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log("✅ Connected Successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();