const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.port || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("resell used laptop server is running");
});

app.listen(port, ()=> console.log(`resell used laptop server running on ${port}`))
