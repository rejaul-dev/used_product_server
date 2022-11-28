const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken')
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.port || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uugevwk.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const categoriesCollection = client.db("resellUsedLaptop").collection('categories')
    const usersCollection = client.db("resellUsedLaptop").collection('users')


    // save user email and generate jwt
    app.put('/user/:email', async(req, res)=>{
      const email = req.params.email
      const user = req.body
      const filter = {email:email}
      const options = {upsert: true}
      const updatedDoc={
        $set: user,
      }
      const result = usersCollection.updateOne(filter,updatedDoc,options)

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: '1d'
      })
      res.send({result, token})
    })


    app.get('/categories', async(req, res)=>{
      const query = {}
      const categories = await categoriesCollection.find(query).toArray()
      res.send(categories)
    })

    app.get("/categories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const category = await categoriesCollection.findOne(query);
      res.send(category);
    });

  } finally {
  }
}
run(console.log());

app.get("/", async (req, res) => {
  res.send("resell used laptop server is running");
});

app.listen(port, () =>
  console.log(`resell used laptop server running on ${port}`)
);
