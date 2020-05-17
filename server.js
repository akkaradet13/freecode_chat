'use strict';

const express     = require('express');
const session     = require('express-session');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const auth        = require('./app/auth.js');
const routes      = require('./app/routes.js');
const mongo       = require('mongodb').MongoClient;
const passport    = require('passport');
const cookieParser= require('cookie-parser')
const app         = express();
const http        = require('http').Server(app);
const sessionStore= new session.MemoryStore();
const cors = require('cors');
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');

/* Make sure to add the following variables to your .env file!

SESSION_SECRET=(random number)
DATABASE=(your database url)
GITHUB_CLIENT_ID=(authorize this app with github and get these two variables)
GITHUB_CLIENT_SECRET=(authorize this app with github and get these two variables)

*/

// Documentation for mongodb here
// http://mongodb.github.io/node-mongodb-native/3.2/api/

// Do not put this under fccTesting(app)
// otherwise your tests won't pass
app.use(cors());

fccTesting(app); //For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  key: 'express.sid',
  store: sessionStore,
}));


mongo.connect(process.env.DATABASE, (err, client) => {
    if(err) console.log('Database error: ' + err);
    // Since mongodb v3, the callback function was changed from (err, db)
    // to (err, client) and your database is in client.db
    const db = client.db('chat');
    // Input your database name above
    auth(app, db);
    routes(app, db);
      
    http.listen(process.env.PORT || 3000);
  
  io.use(passportSocketIo.authorize({
      cookieParser: cookieParser,
      key:          'express.sid',
      secret:       process.env.SESSION_SECRET,
      store:        sessionStore
    }));

  
    //start socket.io code
    let currentUsers = 0;
    io.on('connection', socket => {
      console.log('user ' + socket.request.user.name + ' connected');
      currentUsers ++;
      
      io.emit('user', {name: socket.request.user.name,currentUsers: currentUsers,connected:true});
      
      socket.on('chat message',(message) => {
        io.emit('chat message', {name:socket.request.user.name, message:message})
      })
      
      socket.on('disconnect', () => { 
        currentUsers --;
        
        io.emit('user', {name: socket.request.user.name,currentUsers: currentUsers,connected:false});
      });
    });
  
    

    //end socket.io code
  
  
});