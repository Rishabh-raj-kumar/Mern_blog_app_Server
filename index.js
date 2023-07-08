const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleWare = multer({ dest: "uploads/" });
const fs = require("fs");
const app = express();
//to fetch credential in client side.
app.use(cors({ credentials: true, origin :"https://mern-blog-app-frontend-alpha.vercel.app",}));
app.use(express.json());
app.use(cookieParser());
//to load image in frontend properly..
app.use("/uploads", express.static(__dirname + "/uploads"));

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/user");
const Post = require("./models/Post");

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("database connected");
  })
  .catch((err) => {
    console.log("something went wrong maybe" + err);
  });

const conn = mongoose.connection;
const salt = bcrypt.genSaltSync(10);
const secret = "vjejejdj3e3992639egddg23y3923329";

conn.on("connect", () => {
  console.log("connected");
});

app.get("/", (req, res) => {
  res.send("hello");
});

app.post("/register", async (req, res) => {
  console.log(req.body);

  try {
    //if user is not present in databse..
    //create  a new user.
    const { username, password, email } = req.body;

    const UserDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
      email,
    });

    res.json(UserDoc);
  } catch (err) {
    res.status(400).json(err);
  }
});

app.post("/login", async (req, res) => {
  const { email, username, password } = req.body;
  const userDoc = await User.findOne({ email });
  const passOk = bcrypt.compareSync(password, userDoc.password);

  if (passOk) {
    jwt.sign({ username, id: userDoc._id }, secret, {}, (error, token) => {
      if (error) throw error;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
      console.log(res.cookie)
    });
  } else {
    res.status(400).send("error");
  }
});

app.get("/profile", (req, res) => {
  console.log(req.cookies)
  // const { token } = req.cookies;

  // jwt.verify(token, secret, {}, (error, info) => {
  //   if (error) throw error;
  //   res.json(info);
  // });
  // console.log(token);
  // res.json(req.cookies);
});

app.get("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

//add the Post in database..
app.post("/post", uploadMiddleWare.single("file"), async (req, res) => {
  //we have to add webp extension to our file.
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);
  // console.log(req.file)

  const { token } = req.cookies;
  //we will first fetch logined user..
  jwt.verify(token, secret, {}, async (error, info) => {
    if (error) throw error;
    const { title, summary, content } = req.body;
    const PostDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author : info.id
    });
    res.json(PostDoc);
  });
});

//now will fetch the post which was added in database..
app.get("/post", async (req, res) => {
  // we will extract username from author objectId.
  res.json(await Post.find().populate('author',['username'])
  .limit(20))
});

//fetch data in a single page..
app.get('/post/:id',async(req,res) =>{
   const {id} = req.params;
   res.json(await Post.findById(id).populate('author',['username']));
})

app.listen(process.env.PORT, () => {
  console.log(`listening on Port http://localhost:${process.env.PORT}`);
});
