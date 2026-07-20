const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '?????',          // Change to your MySQL password
    database: '??????'
});

connection.connect(function(err) {
    if (err) {
        console.log("Database Connection Failed");
        console.log(err);
    } else {
        console.log("Connected to MySQL Database");
    }
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'expenseTrackerSecret',
    resave: false,
    saveUninitialized: true
}));


app.get('/', function(req, res) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('index', {
        user: req.session.user
    });

});

app.get('/login', function(req, res) {
    res.render('login');
});

app.post('/login', function(req, res) {

    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

    connection.query(sql, [email, password], function(err, results) {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (results.length > 0) {

            req.session.user = results[0];

            res.redirect('/');

        } else {

            res.send("Invalid Email or Password");

        }

    });

});

app.get('/register', function(req, res) {
    res.render('register');
});

app.post('/register', function(req, res) {

    const { username, email, password } = req.body;

    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

    connection.query(sql, [username, email, password], function(err, result) {

        if (err) {
            console.log(err);
            return res.send("Registration Failed");
        }

        res.redirect('/login');

    });

});

app.get('/logout', function(req, res) {

    req.session.destroy(function(err) {

        if (err) {
            console.log(err);
        }

        res.redirect('/login');

    });

});

app.listen(port, function () {
  console.log(`Server running at http://localhost:${port}`);
});