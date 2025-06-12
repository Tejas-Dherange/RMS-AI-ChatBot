import app from "./app.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
}); 

const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
  });