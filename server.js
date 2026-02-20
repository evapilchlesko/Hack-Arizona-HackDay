var express = require("express")
var app = express();
var path = require('path')
var crypto = require('crypto')

var {MongoClient} = require('mongodb');
var client = new MongoClient('mongodb://localhost:27017/')

var rootFolder = path.join(__dirname, '/')

async function connectDB() {
    if (!client.topology || !client.topology.isConnected()) {
        console.log("Connecting to MongoDB...");
        await client.connect();
    }
    return client.db('storeFront');
}

function getUser(userObj) {
    /* Returns a user object retrieved from database if one can be found. If user cannot be found, function returns null*/    
    return new Promise(function(resolve, reject) {
        connectDB()
        .then(function(database) {
            var coll = database.collection('users')
            return coll.findOne(userObj)
        })
        .then(function (user) {
            console.log("User retrieved:", user)
            resolve(user || null)
        })
        .catch(function(error) {
            console.log(error)
            reject(error)
        })
    })
}

function getUserList() {
    return new Promise(function(resolve, reject) {
        connectDB()
        .then(function(database) {
            var coll = database.collection('users');
            return coll.find().toArray();
        })
        .then(function(userList) {
            return resolve(userList.length ? userList : null); 
        })
        .catch(function(error) {
            console.error("Error retrieving users:", error);
            reject(error);
        })

    })
}

function addUser(userObj) {
    console.log(userObj)
    connectDB()
    .then(function(database) {
        var coll = database.collection('users');
        return coll;
    })
    .then(async function(coll) {
        user = await coll.findOne({username: userObj.username})
        if (user) {
            console.log(`User ${user.username} already exists`);
            return user;
        } else {
            console.log(`New user ${userObj.username} added`);
            return coll.insertOne(userObj);
        }
    })
    .catch(function(error) {
        console.error(error);
        return null;
    })
}


function removeUser(userObj) {
    /* If user exists, remove from collection 'users' inside database 'storeFront'*/
    let coll
    connectDB()
    .then(function (database) {
        coll = database.collection('users')
        return coll.findOne(userObj)
    })
    .then(function (user) {
        if(user) {
            console.log("User " + user.username + " deleted")
            return coll.deleteOne(user)
        }
        else {
            console.log("User Not Found")
        }
    })
    .catch(function(error) {
        console.error(error);
    })
}

function getSellerProducts(sellerObj) {
    /*
    This function returns all objects sold by a given seller given an obj with their username in it.
    */
    return new Promise(function(resolve, reject) {
        connectDB()
        .then(function(database) {
            var coll = database.collection('products');
            console.log("Seller Obj to search for:" + JSON.stringify(sellerObj))
            return coll.find(sellerObj).toArray();
        })
        .then(function(prodList) {
            console.log("Items retrieved:", prodList);
            resolve(prodList);
        })
        .catch(function(error) {
            console.error("Error retrieving seller products:", error);
            reject(error);
        })
    });
}

function getAllProducts() {
    return new Promise((resolve, reject) => {
        connectDB()
        .then(database => {
            coll = database.collection("products")
            return coll.find().toArray()
        })
        .then(products => {
            console.log("products:", products)
            resolve(products)
        })
        .catch(err => console.error(err))
    })
}

function addProduct(productObj) {
    /*
    This function takes a product object containing the fields to insert and then creates a new object within the database.
    */
    let coll
    return new Promise((resolve, reject) => {
        connectDB()
        .then(function (database) {
            coll = database.collection('products')
            return coll.findOne({prodName: productObj.prodName})
        })
        .then(function (product){
            if(product) {
                console.log("Item " + productObj.prodName + " Already Exists")
                reject("Product already exists")
            } else {
                console.log("New Item " + productObj.prodName + " Added")
                return coll.insertOne(productObj)
            }
        })
        .then(async function () {
            resolve(await coll.findOne(productObj)) // return the new product
        })
        .catch(function(error) {
            console.error(error);
            reject(error)
        })
    })    
}

function removeProduct(productObj) {
    /*
    This function takes a product object containing the search terms and then finds that object within the database and removes it.
    */
    let coll
    console.log(productObj)
    return new Promise((resolve, reject) => {
        connectDB()
        .then(function (database) {
            coll = database.collection('products')
            return coll.findOne(productObj)
        })
        .then(function (product) {
            if(product) {
                console.log("Item " + product.prodName + " deleted")
                coll.deleteOne(product)
                resolve("Success")
            }
            else {
                console.log("Product Not Found")
                reject("Not found")
            }
        })
        .catch(function(error) {
            console.error(error);
            reject(error)
        })
    })
}

app.get('/', function(req, res){
    res.sendFile(path.join(rootFolder, 'login.html'))
})

app.get('/login', function(req, res){   // keeping this for now so that I don't have to edit the other pages
    res.sendFile(path.join(rootFolder, 'login.html'))
})

app.get('/store', function(req, res){
    res.sendFile(path.join(rootFolder, 'store.html'))
})

app.get('/signup', function(req, res){
    res.sendFile(path.join(rootFolder, 'signup.html'))
})

app.get('/style.css', function (req, res) {
    res.sendFile(path.join(rootFolder, 'style.css'))
})

app.get('/sellerInfo', function(req, res){
    // This function retrieves the list of all object sold by a seller given their name
    var sellerObj = {"username" :req.query.username}
    getSellerProducts(sellerObj)
    .then(function (listOfItems) {
        return res.json(listOfItems)
    })
    .catch(function(error) {
        console.log("Unable to retrieve seller items due to" + error);
    })
})

app.get('/removeUser', function(req, res) {
    var userToRmv = req.query.username
    userObj = {"username" : userToRmv}
    removeUser(userObj)
})

app.get('/admin_home', function(req, res) {
    res.sendFile(path.join(rootFolder, 'admin_home.html'))
})

app.get('/getUsers', function(req, res){
    // This function retrieves the list of all users for the admin to add and remove
    var checkusername = req.query.username
    var userObj = {username : checkusername}
    getUser(userObj)
    .then(function(user) {
        if(user.usertype == "admin") {
            getUserList()
            .then(function (userList) {
                if(userList == null) {
                    res.json(null)
                } else {
                    res.json(userList)
                }
            })
            .catch(function(error) {
                console.log("Unable to retrieve seller items due to" + error);
                res.status(500).json({ error: "Failed to retrieve user list" });
        
            })
        } else {
            alert("Invalid permissions")
            res.sendFile(path.join(rootFolder, 'login.html'))
        }
    })
    .catch(function(error) {
        console.log(error)
    })
})

app.get('/getProducts', function(req, res) {
    // Gets a list of all products from all sellers
    getAllProducts()
    .then(products => {
        res.json(products)
    })
    .catch(err => console.error(err))
})

app.get('/sellerPage', function(req, res) {
    res.sendFile(path.join(rootFolder, 'editProducts.html'))
})

app.get('/checkout', function(req, res) {
    res.sendFile(path.join(rootFolder, 'checkout.html'))
})

app.post('/deleteProduct', express.json(), function(req, res) {
    console.log("POST body:", req.body)
    var prodToDel = {"_id" : req.body._id};
    removeProduct(req.body)
    .then(function () {
        console.log("Product removed")
        res.status(200).send("Success")
    })
    .catch(function (error) {
        console.log(error)
    })
    
})

app.post('/addProduct', express.json(), function(req, res) {
    console.log("POST body:", JSON.stringify(req.body))
    var prodToAdd = {prodDesc: req.body.desc, prodName : req.body.name, username: req.body.seller, price: req.body.price};
    console.log("product to add:", prodToAdd)
    addProduct(prodToAdd)
    .then(function (product) {
        console.log("Product Added: ", product)
        res.send(product)
    })
    .catch(function(error) {
        console.log(error)
    })
})

app.post('/loginAction', express.urlencoded({'extended':true}), function(req, res){
    var loginName = req.body.username
    var hashedPW = crypto.createHash('sha256').update(req.body.password).digest('hex')

    console.log("Info sent to server on login: " + JSON.stringify(req.body))

    var userObj = {"username" : loginName, "password" : hashedPW}
    console.log("POST:", JSON.stringify(userObj))
    getUser(userObj)
    .then(function (user) {
        if(user == null) {
            res.sendFile(path.join(rootFolder, 'noUser.html'))
        } else {
            console.log("user from login: " + user.usertype)
            if(user.usertype == "user") {
                res.sendFile(path.join(rootFolder, 'store.html'))
            } else if(user.usertype == "seller"){
                res.sendFile(path.join(rootFolder, 'editProducts.html'))
            } else if(user.usertype == "admin"){
                res.sendFile(path.join(rootFolder, 'admin_home.html'))
            } else {
                res.sendFile(path.join(rootFolder, 'noUser.html'))
            }
        }
    })
    .catch(function (error) {
        console.log(error)
    })
    
})
app.get('/logout', function(req, res) {
    res.sendFile(path.join(rootFolder, 'logout.html'))
})

app.post('/create_account', express.urlencoded({'extended':true}), function(req, res) {
    var loginName = req.body.username
    var hashedPW = crypto.createHash('sha256').update(req.body.password).digest('hex')
    var userAccountType = req.body.accountType
    var userObj = {username : loginName, password : hashedPW, usertype : userAccountType}
    addUser(userObj)
    res.sendFile(path.join(rootFolder, 'signupSuccess.html'))
})

app.listen(8080, function(){
    console.log('Server running at localhost:8080/')
})