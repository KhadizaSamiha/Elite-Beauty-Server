const express = require('express');
const app = express();
const cors = require('cors')
var jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

const port = process.env.PORT || 5000;


// middleWare
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rfvro52.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const classesCollection = client.db("eliteDb").collection("classes");
        const usersCollection = client.db("eliteDb").collection("users");
        const paymentCollection = client.db("eliteDb").collection("payment")

        // jwt api
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })

            res.send({ token })
        })
        // verify admin 
        // const verifyAdmin = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email }
        //     const user = await usersCollection.findOne(query);
        //     if (user?.role !== 'admin') {
        //       return res.status(403).send({ error: true, message: 'forbidden message' });
        //     }
        //     next();
        //   }

        // ................
        // class related apis

        // get all classes
        app.get('/classesAll', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })

        // get approved class
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find({ status: 'approved' }).toArray();
            res.send(result);
        })

        // addClass
        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await classesCollection.insertOne(newClass);
            res.send(result);

        })
        // manage Classes get
        app.get('/classesPending', async (req, res) => {
            const result = await classesCollection.find({ status: 'pending' }).toArray();
            res.send(result);
        })
        // manage classes patch by id
        app.patch('/classesApprove/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: "approve"
                },
            }
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result)
        })
        app.patch('/classesDeny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: "deny"
                },
            }
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result)
        })
        // myClass get api by email
        app.get('/classes/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        })
        // sort classes for popularclasses section
        app.get('/classesPopular', async (req, res) => {
            const query = {};
            const options = {
                sort: { "enrolledStudents": -1 }
            }
            const result = await classesCollection.find(query, options).toArray();
            res.send(result);
        })

        // .......................
        // users related apis
        app.post('/users', async (req, res) => {
            const user = req.body;

            // verify jwt 
            // const decodedEmail = req.decoded.email;
            // if (user.email !== decodedEmail) {
            //     return res.status(403).send({ error: true, message: 'forbidden access' })
            // }

            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "admin"
                },
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "instructor"
                },
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })
        app.get('/users/instructor', async (req, res) => {
            const result = await usersCollection.find({ role: 'instructor' }).toArray();
            res.send(result);
        })

        //   ...............
        // payment related apis

        app.post('/payment', async (req, res) => {
            const SelectedClass = req.body;
            const result = await paymentCollection.insertOne(SelectedClass);
            res.send(result);
        })
        app.get('/paymentSelected', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        app.delete('/paymentDelete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await paymentCollection.deleteOne(query);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('school is running')
})
app.listen(port, () => {
    console.log(`app is running on port ${port}`);
})

