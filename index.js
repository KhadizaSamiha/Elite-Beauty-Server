const express = require('express');
const app = express();
const cors = require('cors')
// var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();


// middleWare
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion } = require('mongodb');
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
        await client.connect();

        const classesCollection = client.db("eliteDb").collection("classes");
        const usersCollection = client.db("eliteDb").collection("users")

        // class related apis
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })
        // users related apis
        app.post('/users', async(req, res) =>{
            const user = req.body;
            const query = {email : user.email}
            const existingUser = await usersCollection.findOne(query)
            if(existingUser){
                return res.send({message : "user already exist"})
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
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

