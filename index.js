const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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

// verifyToken
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoriesCollection = client
      .db("resellUsedLaptop")
      .collection("categories");
    const productsCollection = client
      .db("resellUsedLaptop")
      .collection("products");
    const usersCollection = client.db("resellUsedLaptop").collection("users");

    app.get("/category", async (req, res) => {
      const query = {}
      const result = await categoriesCollection.find(query).toArray()
      console.log(result)
      res.send(result)
    });

    app.get("/product-categories/:name", async (req, res) => {
      const name = req.params.name;
      console.log(name);
      const query = { name: name };
      const option = await productsCollection.find(query).toArray();
      console.log(option);
      res.send(option);
    });


    app.get('/products', async(req, res)=>{
      const query ={}
      const products = await productsCollection.find(query).toArray()
      res.send(products)
    })

    // app.get("/category/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const cursor = productsCollection.filter((p) => p.category_id === id);
    //   const category_Product = await cursor.toArray();
    //   res.send(category_Product);
    // });

    // generate jwt
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1d",
        });
        return res.status(403).send({ accessToken: token });
      }
      console.log(user);
      res.send({ accessToken: "token" });
    });

    // get all users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // checking admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // save user to database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // update admin
    app.put("/users/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ Message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
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
