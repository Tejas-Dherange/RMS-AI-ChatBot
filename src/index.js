import app from "./app.js";
import Connectdb from "./dbconfig/db.js";
import dotenv from "dotenv";

dotenv.config({
  path: "../.env",
});
const port = process.env.PORT || 8000;
Connectdb().then(() => {
  app.listen(prompt, () => {
    console.log(`App is lisstening on port ${port}`);
  });
});
