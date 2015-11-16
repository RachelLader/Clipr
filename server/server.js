/**

 *Server Configuration File

**/

//External Resources
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var port = process.env.PORT || 3000;
var Promise = require('bluebird');
var Promise = require('bluebird');
var request = require('request');
var http = require('http');


var db = require('seraph')({
  server: "http://clipr.sb02.stations.graphenedb.com:24789",
  user: "clipr",
  pass: 'oSvInWIWVVCQIbxLbfTu'
});


var app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(__dirname + '../../app'));
app.use(bodyParser.json());

app.post('/user/post/addNote', function(req, res) {
  console.log('in addNote')
  console.log('url', req.query.url)
    // console.log('url', req.query.user)

  var clipNode;
  db.find({
    clipUrl: req.query.url
  }, function(err, clip) {
    if (err) throw err;
    clipNode = clip;
  });
  console.log(req.query.note)
  db.save({
    note: req.query.note
  }, function(err, noteNode) {
    console.log(' note was saved', noteNode)
    if (err) throw err;
    db.label(noteNode, ['Note'], function(err, labeledNode) {
      if (err) throw err;
      console.log('noteNode', labeledNode)
      console.log('clipNode', clipNode)
    })
    createRelation(noteNode, clipNode, 3, 'belongsTo');
    // createRelation(userNode, noteNode, 3, 'owns');
  })
})

app.post('/user/post/loadNotes', function(req, res) {
  console.log('inloadnotes')

  var cypher = "MATCH(notes)-[:belongsTo]->(clip) WHERE clip.clipUrl='" + req.query.url + "' RETURN notes"

  db.query(cypher, function(err, result) {
    if (err) throw err;
    console.log('NOTESRESULT', result)
  })
})


app.post('/user/post/storeclip', function(req, res) {
  console.log('TITLE: ', req.query.title);
  db.save({
    clipUrl: req.query.url,
    title: req.query.title
  }, function(err, node) {
    if (err) throw err;
    console.log('clipnode', node)
    db.label(node, ['Clip'], function(err) {
      if (err) throw err;
      console.log(node + " was inserted as a Clip into DB");
      createWatsonUrl(node.clipUrl, function(keywords) {
        for (var i = 0; i < 3; i++) {
          storeTags(keywords[i], function(tagNode, relevance) {
            createRelation(node, tagNode, relevance, 'contains');
          })
        }
      })
    })
  })
})

app.get('/loadClips', function(req, res) {
  db.nodesWithLabel('Clip', function(err, results) {
    console.log('server results', results);
    res.send(results);
  });
});


var createRelation = function(clip, tag, relevance, how) {
  console.log('clip:', clip)
  console.log('tag:', tag)
  db.relate(clip, how, tag, {
    relevance: relevance
  }, function(err, relationship) {
    console.log('RELATIONSHIP:', relationship)
  })
}



var createWatsonUrl = function(url, cb) {
  console.log('inside watson')
  var API = '5770c0482acff843085443bfe94677476ed180e5'
  var baseUrl = 'http://gateway-a.watsonplatform.net/calls/'
  var endUrl = 'url/URLGetRankedKeywords?apikey=' + API + '&outputMode=json&url='
  var fullUrl = baseUrl + endUrl + url
  console.log(fullUrl)
  request(fullUrl, function(err, response, body) {
    var bodyParsed = JSON.parse(body);
    console.log('WATSON KEYWORDS:', bodyParsed.keywords)
    cb(bodyParsed.keywords)
  })
}

var storeTags = function(tag, cb) {
  console.log('in storeTags')
  var relevance = tag.relevance;
  db.save({
    tagName: tag.text
  }, function(err, node) {
    if (err) throw err;
    db.label(node, ['Tag'],
      function(err) {
        if (err) throw err;
        console.log(node.tagName + " was inserted as a Topic into DB")
        console.log('TAGNODE:', node)
      })
    cb(node, relevance)
  })
}



app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});




app.listen(port);
console.log('Bits please server is now running at ' + port);