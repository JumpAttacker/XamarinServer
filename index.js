"use strict";

const restify = require("restify");
const jwt = require("jsonwebtoken");


const fs = require("fs");

const users = require("./users.json");
const PrivateKey = require("./key.json");

function GetUserByLogin(login, mail) {
    return users.find(x => x.login === login && x.mail === mail);
}

function GetUserByLoginAndPassword({Login, Password}) {
    return users.find(x => x.Login === Login && x.Password === Password);
}

/**
 * @return {boolean}
 */
function IsFree(login, mail) {
    let index = users.findIndex(x => x.Mail === mail && x.Login === login);
    return index >= 0;
}

const server = restify.createServer();
server.use(restify.plugins.bodyParser({mapParams: true}));
server.get("/register/:login", (req, res, next) => {
    console.log(req.params.login);
    let user = GetUserByLogin(req.params.login);
    if (user) {
        console.error(`${req.params.login} user already here`);
        res.send(`${req.params.login} user already here`);
    } else {
        user = {
            login: req.params.login,
            connect: Date.now(),
            clicks: 0
        };
        users.push(user);
        console.log("new player added: ", user);
        res.send(`${req.params.login} successfully logged`);
    }
    next();
});
server.get("/getClicks/:login", (req, res, next) => {
    let user = GetUserByLogin(req.params.login);
    if (user) {
        console.log(`logged:`, user);
        res.send(user);
    } else
        res.send({
            event: "getClick",
            error: true,
            message: "cant find needed user"
        });

    next();
});
/*


*/

server.post("/api/login", function create(req, res, next) {
    let data = req.params;
    console.log(data);
    if (data.Token) {
        jwt.verify(data.Token, PrivateKey, function (err, decoded) {
            if (err) {
                res.send({
                    errorLevel: 2,
                    message: err.message,
                    data: null
                });

                return next();
            }
            console.log("Verify: ", decoded);
            data = decoded;
        });
    }
    let user = GetUserByLoginAndPassword(data);
    if (user) {
        let token = jwt.sign(data, PrivateKey);
        user.token = token;
        let sendObject = {
            errorLevel: 0,
            message: "Successfully logged",
            data: {token, login: user.Login}
        };
        console.log(sendObject);
        res.send(sendObject);
    } else {
        let sendObject = {
            errorLevel: 1,
            message: "Wrong login or password",
            data: null
        };
        console.log(sendObject);
        res.send(sendObject);
    }
    return next();
});

server.post("/api/registration", function create(req, res, next) {
    console.log("registration: ", req.params);
    let {Login, Password, Mail, Sex, Country} = req.params;
    if (Login && Password && Mail && Sex && Country) {
        let alreadyCreated = IsFree(Login, Mail);
        if (alreadyCreated) {
            console.log("Аккаунт с такими данными уже есть");
            res.send({
                errorLevel: 1,
                message: "You can`t create new account with that mail or login",
                data: null
            });
        } else {
            let user = req.params;
            let token = jwt.sign({Login, Password}, PrivateKey);
            user.token = token;
            user.clicks = 0;
            users.push(user);
            let convertedUsers = JSON.stringify(users);
            fs.writeFile("./users.json", convertedUsers, err => {
                if (err) {
                    console.error(err);
                } else {
                    console.log("saved!");
                }
            });
            console.log("Новый пользователь зарегестрирован!");
            res.send({
                errorLevel: 0,
                message: "Successfully created",
                data: {token, login: user.Login}
            });
        }
    } else {
        res.send({errorLevel: 2, message: "Error in registration", object: null});
    }

    return next();
});
server.get("/incClicks/:login", (req, res, next) => {
    let user = GetUserByLogin(req.params.login);
    if (user) {
        console.log(`increase click ${user.clicks}+1 for ${user.login}`);
        user.clicks++;
        res.send(user);
    } else
        res.send({
            event: "getClick",
            error: true,
            message: "cant find needed user"
        });

    next();
});

server.listen(8080, function () {
    console.log("%s listening at %s", server.name, server.url);
});
