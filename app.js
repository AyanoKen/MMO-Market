require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/MMO-MarketDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const itemSchema = {
  itemName: String,
  itemPrice: Number,
  userName: String,
  userIGN: String,
  userServer: String
};

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const Item = mongoose.model("Item", itemSchema);

app.get("/", function(req, res){
  res.render("home");
});

app.get("/userItems", function(req, res){
  if(req.isAuthenticated()){
    console.log(req.user.email);
  }else{
    res.redirect("/login");
  }
});

app.get("/market", function(req, res){
  res.render("market");
});

app.get("/addItem", function(req, res){
  res.render("newItem");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/addItem", function(req, res){

  let item = new Item({
    itemName: req.body.itemName,
    itemPrice: req.body.itemPrice,
    userName: req.user.username,
    userIGN: req.body.userIGN,
    userServer: req.body.userServer
  });

  item.save();
  res.redirect("/");
});

app.post("/register", function(req, res){
  User.register({username: req.body.username, email: "thekireet@gmail.com"}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/userItems");
      });
    }
  });
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/userItems");
      });
    }
  });
});

app.listen(3000, function(){
  console.log("Server is up and running");
});
