require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
  userServer: String,
  buyerIGN: String,
  buyerUsername: String,
  itemStatus: String
};

const reportSchema = {
  reportType: String,
  reportDetails: String,
  reportedBy: String
}

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  googleId: String,
  admin: Boolean
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);
const Item = mongoose.model("Item", itemSchema);
const Report = mongoose.model("Report", reportSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/MMO-Market",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({googleId: profile.id, username: profile.displayName, email: profile._json.email}, function (err, user) {
      return done(err, user);
    });
  }
));

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
  if(req.isAuthenticated()){
    Item.find({itemStatus: "up"}, function(err, results){
      if(err){
        console.log(err);
      }else{
        res.render("market", {
            items: results
        });
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.get("/addItem", function(req, res){
  if(req.isAuthenticated()){
    res.render("newItem");
  }else{
    res.redirect("/login");
  }
});

app.get("/myItems", function(req, res){
  if(req.isAuthenticated()){
    Item.find({userName: req.user.username}, function(err, results){
      if(err){
        console.log(err);
      }else{
        res.render("userItems", {
          items: results
        });
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.get("/myOffers", function(req, res){
  if(req.isAuthenticated()){
    Item.find({buyerUsername: req.user.username}, function(err, results){
      if(err){
        console.log(err);
      }else{
        res.render("userOffers", {items: results});
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.get("/report", function(req, res){
  if(req.isAuthenticated()){
    res.render("report");
  }else{
    res.redirect("/login");
  }
});

app.get("/reports", function(req, res){
  if(req.isAuthenticated() && req.user.admin){
    Report.find({}, function(err, results){
      if(err){
        console.log(err);
      }else{
        res.send(results);
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.get('/auth/google', passport.authenticate('google', { scope: [ 'email', 'profile' ] }));

app.get( '/auth/google/MMO-Market',
    passport.authenticate( 'google', {
        successRedirect: '/',
        failureRedirect: '/login'
}));

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

app.post("/market", function(req, res){

  Item.findOne({_id: req.body.button}, function(err, result){
    if(err){
      console.log(err);
    }else{
      if(result.itemStatus == "up"){
        result.buyerIGN = req.user.username;
        result.buyerUsername = req.user.username;
        result.itemStatus = "down";

        result.save();
        res.redirect("/market");
      }else{
        res.redirect("/market");
      }
    }
  });
});

app.post("/marketQuery", function(req, res){
  if(req.body.query == ""){
    Item.find({itemStatus: "up"}, function(err, results){
      if(err){
        console.log(err);
      }else{
        res.render("market", {
            items: results
        });
      }
    });
  }else{
    Item.find({itemName: req.body.query, itemStatus: "up"}, function(err, results){
      if(err){
        console.log(err);
      }else{
        res.render("market", {
            items: results
        });
      }
    });
  }
});

app.post("/addItem", function(req, res){
  let item = new Item({
    itemName: req.body.itemName,
    itemPrice: req.body.itemPrice,
    userName: req.user.username,
    userIGN: req.body.userIGN,
    userServer: req.body.userServer,
    itemStatus: "up"
  });

  item.save();
  res.redirect("/");
});

app.post("/report", function(req, res){
  let report = new Report({
    reportType: req.body.reportType,
    reportDetails: req.body.reportDetails,
    reportedBy: req.user.username
  });

  report.save();
  res.redirect("/");
});

app.post("/register", function(req, res){
  User.register({username: req.body.username, email: "thekireet@gmail.com", admin: false}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
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
        res.redirect("/");
      });
    }
  });
});

app.listen(3000, function(){
  console.log("Server is up and running");
});



// TODO:
// Create functionality to close an item from sale in the "My Items on sale" Route
// Create a new variable in the Mongoose Item Schema called "Open" which says if the item can be closed for sale
// Create an automatic garbage collection system which deletes all the closed items in the database after a certain amount of time
