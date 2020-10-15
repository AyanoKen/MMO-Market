const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"))

app.get("/", function(req, res){
  res.render("home");
});

app.get("/market", function(req, res){
  res.render("market");
});

app.get("/addItem", function(req, res){
  res.render("newItem");
});

app.listen(3000, function(){
  console.log("Server is up and running");
});
