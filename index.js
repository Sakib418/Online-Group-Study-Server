const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3000;
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
//app.use(cors());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

require('dotenv').config();


// iftekher
// pZOSLv38IjT6iMCR



const verifyToken = (req, res, next) => {
  
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access, no token provided' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).send({ message: 'Token expired' });
      }
      return res.status(401).send({ message: 'Invalid token' });
    }

    
    req.user = decoded; 
    next();
  });
};

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


   // Auth related API's
   app.post('/jwt',async (req,res) => {
    const user = req.body;
    const token = jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'1h'});
    res
    .cookie('token',token,  {
      httpOnly:true,
      secure: false, //if https then it should be true;
    })
    .send({success:true});
   })
     
   // Assignment Related API's
   const assignmentsCollection = client.db('OnlineGroupStudy').collection('Assignments');
   const assignmentSubmition = client.db('OnlineGroupStudy').collection('SubmitedAssignments');
   
   app.post('/CreateAssignment',async(req,res) => {
    const assignment = req.body;
    const result = await assignmentsCollection.insertOne(assignment);
    res.send(result);
   })

   app.get('/AllAssignments', async(req,res) => {
    
    const { difficulty } = req.query;

    let filter = {};
    if (difficulty) {
        filter = { DifficultyLevel: difficulty };
    }



    const cursor = assignmentsCollection.find(filter);
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

   //Assignment Submition related apis
 
   app.post('/AssignmentSubmition',async(req,res) => {
    const assignment = req.body;
    const result = await assignmentSubmition.insertOne(assignment);
    res.send(result);
   })
  //  assignmentSubmition
  //  assignmentsCollection
  app.get('/GetAssignmentDataByEmail/:email',verifyToken, async (req, res) => {
    const email = req.params.email;
    
    if(req.user.email !== req.params.email){
      return res.status(403).send({message: 'forbidden access'});
    }
    

    try {
        const result = await assignmentSubmition.aggregate([
           
            { $match: { SubmiterEmail: email } },

            
            {
                $addFields: {
                    AssignmentID: { $toObjectId: "$AssignmentID" }
                }
            },

           
            {
                $lookup: {
                    from: 'Assignments', 
                    localField: 'AssignmentID',    
                    foreignField: '_id',         
                    as: 'assignmentDetails'      
                }
            },

            
            { $unwind: { path: '$assignmentDetails', preserveNullAndEmptyArrays: true } },

           
            {
                $project: {
                    _id: 0,
                    AssignmentTitle: '$assignmentDetails.Assignmenttitle',
                    GoogleDocsLink: '$GooleDocsLink',
                    Notes: '$Notes',
                    Status: '$Status',
                    Feedback: '$Feedback',
                    ObtainedMarks: '$ObtainedMarks',
                    AssignmentMarks: '$assignmentDetails.AssignmentMarks'
                }
            }
        ]).toArray();

        console.log('Aggregated Result:', result);  
        res.json(result);  
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

app.get('/GetPendingAssignment',verifyToken, async (req, res) => {
  

  try {
    console.log('Token',req.cookies);
      const result = await assignmentSubmition.aggregate([
         
        

          
          {
              $addFields: {
                  AssignmentID: { $toObjectId: "$AssignmentID" }
              }
          },

         
          {
              $lookup: {
                  from: 'Assignments', 
                  localField: 'AssignmentID',    
                  foreignField: '_id',         
                  as: 'assignmentDetails'      
              }
          },

          
          { $unwind: { path: '$assignmentDetails', preserveNullAndEmptyArrays: true } },

          {
            $match: {
                $or: [
                    { ObtainedMarks: { $eq: 0 } },
                    { ObtainedMarks: { $eq: null }, },
                    { ObtainedMarks: { $eq: "" } }
                ]
            }
        },
          {
              $project: {
                  _id: '$_id',
                  AssignmentTitle: '$assignmentDetails.Assignmenttitle',
                  GoogleDocsLink: '$GooleDocsLink',
                  Notes: '$Notes',
                  Status: '$Status',
                  Feedback: '$Feedback',
                  ObtainedMarks: '$ObtainedMarks',
                  AssignmentMarks: '$assignmentDetails.AssignmentMarks',
                  SubmitedBy: '$SubmitedBy',
                  SubmiterEmail: '$SubmiterEmail'

              }
          }
      ]).toArray();

      console.log('Aggregated Result:', result);  
      res.json(result);  
  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send({ error: "Internal Server Error" });
  }
});

// app.patch('/MarkedAssignment/:id',async(req,res) => {
//   const id = req.params.id;
//   const filter = { _id: new ObjectId(id) };
//   const updatedSubmition = req.body;
//   console.log(updatedSubmition);
//   const MarkedAssignment = {
//     $set: {
//       Feedback: updatedSubmition.Feedback,
//       ObtainedMarks: updatedSubmition.ObtainedMarks
//     }
//   };
//   const result = await assignmentSubmition.updateOne(filter, MarkedAssignment);
//   res.send(result);
//  })

app.patch('/MarkedAssignment/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedSubmition = req.body;
  //const updatedSubmition = req.body;
  console.log(updatedSubmition);
  const MarkedAssignment = {
    $set: {
      Feedback: updatedSubmition.feedback,
      ObtainedMarks: updatedSubmition.marks,
      Status:'Completed'
    }
  };

  try {
    const result = await assignmentSubmition.updateOne(filter, MarkedAssignment);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});


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