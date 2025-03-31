import app from "./app.js";
import Connectdb from "./dbconfig/db.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});
const port = process.env.PORT || 8000;
Connectdb().then(() => {
  app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
  });
});
