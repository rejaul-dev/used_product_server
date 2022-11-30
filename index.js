const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_KEY);

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
    const bookingsCollection = client
      .db("resellUsedLaptop")
      .collection("bookings");

    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/product-categories/:name", async (req, res) => {
      const name = req.params.name;
      console.log(name);
      const query = { name: name };
      const option = await productsCollection.find(query).toArray();
      console.log(option);
      res.send(option);
    });

    app.get("/products", async (req, res) => {
      const query = {};
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    // get data from bookings
    app.get("/bookings",verifyJWT, async (req, res) => {
      const email = req.query.email;
      // const decodedEmail =req.decoded.email;
      // if(email !== decodedEmail){
      //   return res.status(403).send({message: 'forbidden access'})
      // }
      // console.log("token",req.headers.authorization)
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    // post data to database from modal
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    // stripe payment
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // app.post("/payments", async (req, res) => {
    //   const payment = req.body;
    //   const result = await paymentsCollection.insertOne(payment);
    //   const id = payment.bookingId;
    //   const filter = {_id: ObjectId(id)}
    //   const updatedDoc ={
    //     $set:{
    //       paid: true,
    //       transactionId: payment.transactionId
    //     }
    //   }
    //   const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
    //   res.send(result);
    // });


    // generate jwt
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "2d",
        });
        return res.status(403).send({ accessToken: token });
      }
      console.log(user);
      res.send({ accessToken: "token" });
    });

    // get category name
    app.get("/categoryName", async (req, res) => {
      const query = {};
      const result = await categoriesCollection
        .find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    // get all users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // checking admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
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
    app.put("/users/admin/:id",verifyJWT, async (req, res) => {
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

    app.get("/sellerProducts", async (req, res) => {
      const email = req.query.email;
      // const decodedEmail =req.decoded.email;
      // if(email !== decodedEmail){
      //   return res.status(403).send({message: 'forbidden access'})
      // }
      // console.log("token",req.headers.authorization)
      const query = { email: email };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    // delete product
    app.delete("/productDelete", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter).toArray();
      res.send(result);
    });

    // add products
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
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
