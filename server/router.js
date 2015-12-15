var paths = require('./config/paths.js');
var app = require('./server.js');

app.get('/auth/google', paths.googleAuth);

app.post('/user/post/storeclip', paths.storeClip);

app.get('/loadAllClips', paths.loadAllClips);

app.post('/addToCollection', paths.addToCollection);

app.post('/incrementCount', paths.incrementCount);

