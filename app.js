const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '????',      // Change to your MySQL password
    database: '????'      // Change to your database name
});

connection.connect(function (err) {
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

// Home Page
app.get('/', function (req, res) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('index', {
        user: req.session.user
    });

});

// Login Page
app.get('/login', function (req, res) {
    res.render('login');
});

// Login
app.post('/login', function (req, res) {

    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

    connection.query(sql, [email, password], function (err, results) {

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

// Admin Login
app.post('/admin/login', function (req, res) {

    const { email, password } = req.body;

    const sql = "SELECT * FROM admins WHERE email = ? AND password = ?";

    connection.query(sql, [email, password], function (err, results) {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (results.length > 0) {

            req.session.admin = results[0];

            res.redirect('/admin');

        } else {

            res.send("Invalid Admin Email or Password");

        }

    });

});

// Register Page
app.get('/register', function (req, res) {
    res.render('register');
});

// Register
app.post('/register', function (req, res) {

    const { username, email, password } = req.body;

    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

    connection.query(sql, [username, email, password], function (err, result) {

        if (err) {
            console.log(err);
            return res.send("Registration Failed");
        }

        res.redirect('/login');

    });

});

// Add Expense 
// Add Expense Page
app.get('/addExpense', function (req, res) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('addExpense', {
        error: null
    });
});


// Add Expense
app.post('/addExpense', function (req, res) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    const title = req.body.title;
    const amount = req.body.amount;
    const category = req.body.category;
    const expenseDate = req.body.expense_date;
    const description = req.body.description;

    if (!title || !amount || !category || !expenseDate) {
        return res.status(400).render('addExpense', {
            error: 'Please complete all required fields.'
        });
    }

    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).render('addExpense', {
            error: 'Amount must be greater than $0.'
        });
    }

    const sql = `
        INSERT INTO expenses
        (title, amount, category, expense_date, description)
        VALUES (?, ?, ?, ?, ?)
    `;

    connection.query(
        sql,
        [title, numericAmount, category, expenseDate, description],
        function (err, result) {

            if (err) {
                console.log(err);

                return res.status(500).render('addExpense', {
                    error: 'Unable to add expense. Please try again.'
                });
            }

            res.redirect('/expenses');
        }
    );
});

// Admin Dashboard
app.get('/admin', function (req, res) {

    if (!req.session.admin) {
        return res.redirect('/login');
    }

    res.render('admin', {
        admin: req.session.admin
    });

});

// View Expenses
app.get('/expenses', function (req, res) {

    if (!req.session.user && !req.session.admin) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT
            id,
            title,
            amount,
            category,
            expense_date,
            description
        FROM expenses
        ORDER BY expense_date DESC, id DESC
    `;

    connection.query(sql, function (err, results) {

        if (err) {
            console.error('View Expenses SQL Error:', err);
            return res.send('Database Error');
        }

        res.render('expenses', {
            expenses: results
        });
    });
});

// View Individual Expense
app.get('/expenses/:id', function (req, res) {

    if (!req.session.user && !req.session.admin) {
        return res.redirect('/login');
    }

    const expenseId = req.params.id;

    const sql = `
        SELECT
            id,
            title,
            amount,
            category,
            expense_date,
            description
        FROM expenses
        WHERE id = ?
    `;

    connection.query(sql, [expenseId], function (err, results) {

        if (err) {
            console.error('View Expense SQL Error:', err);
            return res.send('Database Error');
        }

        if (results.length === 0) {
            return res.status(404).send('Expense not found.');
        }

        res.render('viewExpense', {
            expense: results[0]
        });
    });
});

// Delete Expense
app.get('/deleteExpense/:id', function (req, res) {

    const expenseId = req.params.id;

    const sql = "DELETE FROM expenses WHERE id = ?";

    connection.query(sql, [expenseId], function (err, result) {

        if (err) {
            console.log(err);
            return res.send("Error deleting expense.");
        }

        res.redirect('/expenses');

    });

});

// Edit Expense Page (GET)
app.get('/editExpense/:id', function (req, res) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    const expenseId = req.params.id;

    const sql = "SELECT * FROM expenses WHERE id = ?";

    connection.query(sql, [expenseId], function (err, results) {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (results.length === 0) {
            return res.send("Expense not found.");
        }

        res.render('editExpense', {
            expense: results[0]
        });

    });

});

// Update Expense (POST)
app.post('/editExpense/:id', function (req, res) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    const expenseId = req.params.id;
    const { title, amount, category } = req.body;

    const sql = "UPDATE expenses SET title = ?, amount = ?, category = ? WHERE id = ?";

    connection.query(sql, [title, amount, category, expenseId], function (err, result) {

        if (err) {
            console.log(err);
            return res.send("Error updating expense.");
        }

        res.redirect('/expenses');

    });

});

// Logout
app.get('/logout', function (req, res) {

    req.session.destroy(function (err) {

        if (err) {
            console.log(err);
        }

        res.redirect('/login');

    });

});

app.listen(port, function () {
    console.log(`Server running at http://localhost:${port}`);
});
