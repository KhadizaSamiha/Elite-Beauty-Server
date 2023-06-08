const express = require('express');
const app = express();
const cors = require('cors')
// var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();


// middleWare
app.use(cors())
app.use(express.json())

app.get('/', (rwq, res) =>{
    res.send('school is running')
})
app.listen(port, () =>{
    console.log(`app is running on port ${port}`);
})

// vIsIPACE9k8pgPvr eliteDb