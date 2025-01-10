const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors());
app.use(express.json());
require('dotenv').config();

// iftekher
// pZOSLv38IjT6iMCR


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aine5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


   // Assignment Related API's
   const assignmentsCollection = client.db('OnlineGroupStudy').collection('Assignments');
   
   
   app.post('/CreateAssignment',async(req,res) => {
    const assignment = req.body;
    const result = await assignmentsCollection.insertOne(assignment);
    res.send(result);
   })

   app.get('/AllAssignments', async(req,res) => {
    const cursor = assignmentsCollection.find();
    const result = await cursor.toArray();
    res.send(result);
   })
   
   app.delete('/DeleteAssignments/:id',async(req,res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await assignmentsCollection.deleteOne(query);
    res.send(result);
  }) 
  
  
  app.get('/GetAssignment/:id', async(req,res)=>{
    const id = req.params.id;
    console.log(`ID = ${id}`);
    const query = {_id: new ObjectId(id)};
    const campaign = await assignmentsCollection.findOne(query);
    res.send(campaign);
  })

  app.put('/UpdateAssignment/:id',async(req,res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)}
    const options = {upsert: true};
    const updatedAssignment = req.body;
    const Assignment = {
      $set: {
      imageURL:updatedAssignment.imageURL,
      Assignmenttitle:updatedAssignment.Assignmenttitle,
      DifficultyLevel:updatedAssignment.DifficultyLevel,
      Description:updatedAssignment.Description,
      AssignmentMarks:updatedAssignment.AssignmentMarks,
      AssignmentDate:updatedAssignment.AssignmentDate
      }
    }
    const result = await assignmentsCollection.updateOne(filter,Assignment,options)
    res.send(result);
   })

  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);



app.get('/' ,(req,res) => {
    res.send('job is falling from the sky')


})

app.listen(port, () => {
    console.log(`Job is waiting at: ${port}`)
})