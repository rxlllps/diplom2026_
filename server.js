// Load environment variables from .env (optional — sensible defaults are used if absent)
require('dotenv').config();

// BASE SETUP
// =============================

// CALL THE PACKAGES -----------
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var path        = require('path');
var User        = require('./app/models/user');
var Booking     = require('./app/models/booking');
var Room        = require('./app/models/room');
var { MongoMemoryServer } = require('mongodb-memory-server');

// APP CONFIGURATION
// =============================
// use body parser so we can grab information from POST requests.
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// configure our app to handle CORS requests.
app.use(function(req,res,next){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST');
    res.setHeader('Access-Control-Allow-Headers','X-Requested-With,content-type,Authorization');
    next();
});

// log all requests to the console.
app.use(morgan('dev'));

// Set mongoose strictQuery to suppress deprecation warning
mongoose.set('strictQuery', false);

// set static files location
// used for the requests that our frontend will make
app.use(express.static(__dirname + '/public'));

// ROUTES FOR OUR API   
// ==============================


// API ROUTES ------------------
var apiRoutes = require('./app/routes/api')(app,express);
app.use('/api',apiRoutes);

// MAIN CATCHALL ROUTE
// SEND USERS TO FRONTEND
// has to be registered after API ROUTES
app.get('*',function(req,res){
    res.sendFile(path.join(__dirname + '/public/app/views/index.html'));
});

// START THE SERVER (with in-memory MongoDB — no Docker / install needed)
// ==============================
async function startServer() {
    // Spin up an in-memory MongoDB instance.
    // Data lives only while the server is running and resets on restart.
    var mongod = await MongoMemoryServer.create();
    var uri = mongod.getUri();

    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('Connected to in-memory MongoDB');

    await seedRooms();
    await seedDemoUser();

    var port = process.env.PORT || 8080;
    var server = app.listen(port, function () {
        console.log('Magic happens on port ' + port);
    });

    // Friendly message instead of a raw stack trace when the port is taken
    server.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            console.error('\nПорт ' + port + ' уже занят (возможно, сервер уже запущен в другом окне).');
            console.error('Закройте тот процесс или запустите на другом порту:  PORT=3000 npm start\n');
        } else {
            console.error('Ошибка запуска сервера:', err);
        }
        process.exit(1);
    });
}

// Seed the karaoke rooms on every start (the in-memory DB is empty each run).
// 2x Double (2), 3x Quad (4), 3x Grande (8), 2x Énorme (12) — per the venue description.
async function seedRooms() {
    var count = await Room.countDocuments();
    if (count > 0) return;

    await Room.insertMany([
        { name: 'Fox Double #1', capacity: 2 },
        { name: 'Fox Double #2', capacity: 2 },
        { name: 'Fox Quad #1',   capacity: 4 },
        { name: 'Fox Quad #2',   capacity: 4 },
        { name: 'Fox Quad #3',   capacity: 4 },
        { name: 'Fox Grande #1', capacity: 8 },
        { name: 'Fox Grande #2', capacity: 8 },
        { name: 'Fox Grande #3', capacity: 8 },
        { name: 'Fox Énorme #1', capacity: 12 },
        { name: 'Fox Énorme #2', capacity: 12 }
    ]);
    console.log('Seeded 10 karaoke rooms');
}

// Seed a fixed demo account so the app can be logged into right after `npm start`
// (the in-memory DB is empty each run). Use new User().save() — not insertMany —
// so the password-hashing pre('save') hook runs.
async function seedDemoUser() {
    var exists = await User.findOne({ username: 'demo' });
    if (exists) return;

    var demo = new User({
        name: 'Демо Пользователь',
        username: 'demo',
        password: 'demo12345',
        email: 'demo@example.com',
        age: '2000-01-01',
        address: 'Demo street 1',
        phone_number: '0000000000'
    });
    await demo.save();
    console.log('Seeded demo user (login: demo / password: demo12345)');
}

startServer().catch(function (err) {
    console.error('Failed to start server:', err);
});
