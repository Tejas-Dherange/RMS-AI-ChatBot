import mongoose from "mongoose";

const Connectdb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Database Connected succesfully");
    
  } catch (error) {
    console.error("❌ Database Connection failed", error);
    process.exit(1);
  }
};


export default Connectdb;
