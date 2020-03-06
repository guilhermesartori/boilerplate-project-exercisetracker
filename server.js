const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");

// Set up database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: {
    type: [{ description: String, duration: Number, date: Date }],
    default: []
  }
});
const User = mongoose.model("User", userSchema);

// Server set up
app.use(cors()); // for FCC tests
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//
app.post("/api/exercise/new-user", (req, res) => {
  const user = new User({ username: req.body.username });
  user.save((err, data) => {
    if (err) res.json({ error: "Database error." });
    else res.json({ username: data.username, _id: data._id });
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find()
    .select("username _id")
    .exec((err, data) => {
      if (err) res.json({ error: "Database error." });
      else res.send(data);
    });
});

app.post("/api/exercise/add", (req, res) => {
  const exercise = {
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date == "" ? new Date() : new Date(req.body.date)
  };
  User.findOneAndUpdate(
    { _id: req.body.userId },
    { $push: { exercises: exercise } },
    { new: true },
    (err, data) => {
      if (err) {
        res.json({ error: "Database error." });
      } else {
        res.json({
          username: data.username,
          _id: data._id,
          exercises: data.exercises
        });
      }
    }
  );
});

app.get("/api/exercise/log", (req, res) => {
  User.findById(req.query.userId, (err, data) => {
    if (err) {
      res.send("user not found");
    } else {
      let exercises = data.exercises;
      exercises = exercises.filter(
        value =>
          value.date >=
          (Boolean(req.query.from) ? new Date(req.query.from) : new Date(0))
      );
      exercises = exercises.filter(value =>
        Boolean(req.query.to) ? value.date < new Date(req.query.to) : true
      );
      exercises =
        req.query.limit === undefined
          ? exercises
          : exercises.slice(0, req.query.limit);
      res.json({
        _id: data.id,
        username: data.username,
        exercises: exercises
      });
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
