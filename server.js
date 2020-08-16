const express = require("express");
const app = express();
const fs = require("fs");
const yelp = require("yelp-fusion");
const sqlite = require("sqlite3").verbose();
const apiKey = process.env.API_KEY;
const WebSocket = require("ws");
const http = require("http");
const fetch = require("node-fetch");

// Going to reset these variables everytime start game button is clicked
let num_votes = 0;
let totalPlayers = 0;
let current_round = 0;
let update_db = 0;
let winner_bool = 0;
let winner;
let isWinnerChosen = false; //SEAN
let got_perm = 0;
let random_perm;
let host_is_joining = 0;

// make all the files in 'public' available
app.use(express.static("public/"));

app.use("/fa", express.static(__dirname + "/node_modules/font-awesome/css"));
app.use(
  "/fonts",
  express.static(__dirname + "/node_modules/font-awesome/fonts")
);

// starting html file
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/public/home.html");
});
/// Creation
let db;

if (fs.existsSync("/tinder_rest.db") == 0){
  db = new sqlite.Database("./tinder_rest.db");
}
else{
  db = sqlite.Database("./tinder_rest.db");
}

// Database
let temp_cmd = "SELECT * FROM TinderTable";
db.run(temp_cmd, function(err, rows) {
  if (err) {
      let cmd =
        "CREATE TABLE TinderTable(rowIdNum INTEGER PRIMARY KEY, id TEXT, name TEXT, picture TEXT, rating TEXT, num_review TEXT, price TEXT, num_likes TEXT, address TEXT)";

      db.run(cmd, function(err, val) {});
    }
});

let temp_user = "SELECT * FROM UserTable";
db.run(temp_cmd, function(err, rows) {
  if (err) {
      let userTable ="CREATE TABLE UserTable(rowIdNum INTEGER PRIMARY KEY, id TEXT)";
      db.run(userTable, function(err, val) {});
    }
});

//Initialize WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  ws.on("message", message => {
    let parsed_message = JSON.parse(message);

    console.log("parsed:", parsed_message);
    ws.send("server echo:" + message);

    if (parsed_message.type == "update_like") {
      let cmd = "SELECT * FROM TinderTable WHERE id =? AND name=?";

      db.all(cmd, parsed_message.id, parsed_message.name, function(err, rows) {
        if (err) {
          console.log("Database reading error", err.message);
        } else {
          let likes = String(parseInt(rows[0].num_likes) + 1);

          //all players liked the same restaurant and winner is chosen
          if (likes == totalPlayers) {
            parsed_message.type = "update_like";
            parsed_message.test = "updatePlusWinner";
            isWinnerChosen = true;

            //DROP TABLES WHEN GAME IS OVER
            let del = "DROP TABLE TinderTable";
            db.run(del, function(err, val) {
              if (err) {
                console.log("error deleting:", err.message);
              }
            });
            let del_user = "DROP TABLE UserTable";
            db.run(del_user, function(err, val) {
              if (err) {
                console.log("error deleting:", err.message);
              }
            });

            message = JSON.stringify(parsed_message);
            broadcast(message);
          }

          cmd = "UPDATE TinderTable SET num_likes = ? WHERE id = ? AND name=?";
          db.all(cmd, likes, parsed_message.id, parsed_message.name, function(
            err,
            rows
          ) {
            if (err) {
              console.log("Database reading error", err.message);
            } else {
              //send websocket notif
              let notif = {
                type: "like_done",
                from: "server"
              };
              notif = JSON.stringify(notif);
              broadcast(notif);
            }
          });
        }
      });
      broadcast(JSON.stringify(parsed_message));
    }

    //player liked or disliked
    if (parsed_message.type == "update_vote") {
      num_votes += 1;

      if (num_votes >= totalPlayers) {
        //when winner is not chosen dont change restaurant
        if (!isWinnerChosen) {
          parsed_message.type = "change_rest";
        }

        num_votes = 0;

        message = JSON.stringify(parsed_message);
        broadcast(message);
      }
    }

    if (parsed_message.type == "updateDatabase") {
      update_db += 1;

      if (update_db <= 1) {
        if (current_round >= 2) {
          // end the game and rando choose a restaurant
          end_game();
        } else {
          let cmd3 = "DELETE FROM TinderTable WHERE id = ? AND num_likes =0";
          db.all(cmd3, randomString, function(err, rows) {
            if (err) {
              console.log("Database reading error", err.message);
            } else {
              // Set all restaurants likes to 0
              let cmd2 = "UPDATE TinderTable SET num_likes = ? WHERE id = ?";
              db.all(cmd2, 0, randomString, function(err, rows) {
                if (err) {
                  console.log("Database reading error", err.message);
                } else {
                  //moved this from /getnextround to Here to guarntee called only once per round
                  current_round += 1;

                  parsed_message.type = "updatedDatabase";
                  broadcast(JSON.stringify(parsed_message));
                  //update_db = 0;
                }
              });
            }
          });
        }
      }
    }

    if (parsed_message.type == "allow_update") {
      update_db = 0;
      got_perm = 0;
    }

    if (parsed_message.type == "show_rest") {
      message = JSON.stringify(parsed_message);
      broadcast(message);
    }

    if (parsed_message.type == "round_over") {
      message = JSON.stringify(parsed_message);
      broadcast(message);
    }

    if (parsed_message.type == "updatedDatabase") {
      message = JSON.stringify(parsed_message);
      broadcast(message);
    }
    if (parsed_message.type == "get_perm") {
      get_random_perm();
    }
    if (parsed_message.type == "host_is_joining") {
      host_is_joining = 1;
    }
  });

  ws.send("connected!");
});

//send a broadcasted message to users
function broadcast(data) {
  console.log("what is being broadcasted:", data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

server.listen(8000, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});

//get player html file
app.get("/player.html", (req, res) => {
  res.writeHead(200, { "Content-type": "text/html" });
  fs.readFile("./public/player.html", null, function(error, data) {
    res.write(data);

    res.end();
  });
});

function get_random_perm() {
  got_perm += 1;
  if (got_perm == 1) {
    let cmd = "SELECT * FROM TinderTable WHERE id =?";
    db.all(cmd, randomString, function(err, rows) {
      if (err) {
        console.log("Database reading error", err.message);
      } else {
        random_perm = shuffle(rows);
        let mes = {
          type: "got_perm"
        };
        broadcast(JSON.stringify(mes));
      }
    });
  } else {
  }
}

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

app.get("/getRandomRestaurant", (req, res) => {
  let id = req.query.id;

  let cmd = "SELECT * FROM TinderTable WHERE id =?";

  db.all(cmd, randomString, function(err, rows) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      console.log("getRandomRestaurant() rows be like: ", rows.length);
      res.json(rows);
    }
  });
});

app.get("/getNextRound", (req, res) => {
  res.json(random_perm);
});

app.get("/get_winner", (req, res) => {
  console.log("winner:", winner);
  res.json(winner);
});

function get_random_winner(rows) {
  let prob = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows[i].num_likes; j++) {
      console.log("pushing:", rows[i]);
      prob.push(rows[i]);
    }
  }
  let randomItem = prob[Math.floor(Math.random() * prob.length)];
  console.log("prob array is: ", prob);
  console.log("randomItem is: ", randomItem);
  // winner = randomItem;
  return randomItem;
}

function end_game() {
  // Broadcast the game has ended
  console.log("inside end_game()");
  let message = {
    type: "end_game",
    from: "server"
  };
  let cmd = "SELECT * FROM TinderTable WHERE id=? ORDER BY num_likes DESC ";
  db.all(cmd, randomString, function(err, rows) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      winner = get_random_winner(rows);
      //delete db here
      console.log("about to delete db");
      let del = "DROP TABLE TinderTable";
      db.run(del, function(err, val) {
        if (err) {
          console.log("error deleting:", err.message);
        }
      });
      let del_user = "DROP TABLE UserTable";
      db.run(del_user, function(err, val) {
        if (err) {
          console.log("error deleting:", err.message);
        }
      });
      broadcast(JSON.stringify(message));
    }
  });
}

//player added to project
app.post("/playerAdded", (req, res) => {
  let id = req.query.id;
  console.log("Inserting player with id:", id);
  totalPlayers += 1;
  // Add user to USER TABLE
  let cmd = "INSERT INTO UserTable(id) VALUES(?)";
  db.run(cmd, id, function(err) {});

  let selectCmd = "SELECT * FROM UserTable WHERE id =?";

  db.all(selectCmd, id, function(err, rows) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      console.log("/playerAdded rows", rows.length);
      if (host_is_joining == 1) {
        let start_game_mes = {
          type: "show_rest",
          from: "server"
        };
        broadcast(JSON.stringify(start_game_mes));
      }
      res.json(rows);
    }
  });
});

app.get("/howManyPlayers", (req, res) => {
  let id = req.query.id;
  let selectCmd = "SELECT * FROM UserTable WHERE id =?";

  db.all(selectCmd, id, function(err, rows) {
    if (err) {
      console.log("Database reading error", err.message);
    } else {
      console.log("amount of users rows", rows.length);
      res.json(rows);
    }
  });
});

// Create id
function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// create random String for home page and create ID for DB
let randomString;
app.get("/getRandomString", (req, res) => {
  //RESTTING GLOBAL VARIABLE EVERYTIME START GAME BUTTON IS clicked
  num_votes = 0;
  totalPlayers = 0;
  current_round = 0;
  update_db = 0;
  winner_bool = 0;
  isWinnerChosen = false;
  winner = "";
  got_perm = 0;
  random_perm = [];
  host_is_joining = 0;

  randomString = makeid(22);
  res.send(randomString);
});

// Database setup
function add_to_database(array) {
  shuffleArray(array);
  let business;
  for (business of array) {
    insertRow(business);
  }
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function insertRow(body) {
  let cmd =
    "INSERT INTO TinderTable(id,name,picture,rating,num_review,price,num_likes,address) VALUES(?,?,?,?,?,?,?,?)";
  let id = randomString;

  let name = body.name;
  let picture = body.image_url;
  let rating = body.rating;
  let num_review = body.review_count;
  let price = body.price;
  let num_likes = 0;
  //create address
  let numOfAddressItems = body.location.display_address.length;
  let displayAddress = body.location.display_address;
  let address = "";

  if (numOfAddressItems > 2) {
    address += displayAddress[0];
    address += ", ";
    address += displayAddress[2];
  } else {
    address += displayAddress[0];
    address += ", ";
    address += displayAddress[1];
  }

  db.run(
    cmd,
    id,
    name,
    picture,
    rating,
    num_review,
    price,
    num_likes,
    address,
    function(err) {}
  );
  db.all("SELECT * FROM TinderTable", function(err, data) {
    if (err) {
      console.log(err);
    } else {
      // dump database
      // console.log(data);
    }
  });
  return id;
}

//get data from Yelp Fusion
app.use(express.json());

app.post("/getApiData", (req, res) => {
  let locationInput = req.body.locationSearch;
  let keywords = req.body.keywordsSearch;
  let radius = 40000; // 25 miles
  const searchRequest = {
    term: keywords, // term (string), defaults to searching across businesses
    location: locationInput, // location (string), required
    radius: radius,
    limit: 16 // get 3 restaurants
  };

  const client = yelp.client(apiKey);

  client
    .search(searchRequest)
    .then(response => {
      // const firstResult = response.jsonBody.businesses[0];
      const firstResult = response.jsonBody.businesses;

      const prettyJson = JSON.stringify(firstResult, null, 4);

      add_to_database(response.jsonBody.businesses);
      res.sendStatus(200);
    })
    .catch(e => {
      //console.log(e);
    });
});

app.get("/getAutoFillJsonData", (req, res) => {
  let url =
    "https://www.yelp.com/developers/documentation/v3/all_category_list/categories.json";

  fetch(url)
    .then(response => response.json())
    .then(out => {
      res.json(out);
    })
    .catch(err => {
      res.sendStatus(400);
      throw err;
    });
});
