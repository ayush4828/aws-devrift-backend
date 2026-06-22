const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    try {
      await mongoose.connection.collection("repositories").dropIndex("name_1");
    } catch(err) {
    }
    process.exit(0);
  });
