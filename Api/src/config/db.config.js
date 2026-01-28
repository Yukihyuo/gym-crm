import mongoose from "mongoose";

const connectionOptions = {
    serverSelectionTimeoutMS: 20000, 
    socketTimeoutMS: 45000, 
    maxPoolSize: 10,
};

mongoose
  .connect(process.env.databaseUrl, connectionOptions)
  .then(() => console.log("Connected to MongoDB!"))
  .catch(err => {
      console.error("Error connecting to MongoDB:", err);
      process.exit(1); 
  });

export default mongoose.connection;
