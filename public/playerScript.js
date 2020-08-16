"use strict";
// Elements
let name = document.getElementById("name");
let price = document.getElementById("price");
let num_reviews = document.getElementById("num_reviews");
let num_votes = document.getElementById("num_votes");
let img = document.getElementById("img");
let view1 = document.getElementById("view1");
let main = document.getElementById("main");
let address = document.getElementById("address");
let noButton = document.getElementById("outer-no");
let yesButton = document.getElementById("outer-yes");
let noButtonMobile = document.getElementById("no");
let yesButtonMobile = document.getElementById("yes");

// Variables
let userAlreadyVoted = false;
let data;
let interval = null;
let restaurantArray;
let numOfPlayers = 0;
let index = 0;
let liked = 0;

// Winner Logic
let winnerHeader = document.getElementById("winnerHeader");
winnerHeader.style.display = "none";

// Ratings
let star1 = document.getElementById("star-1");
let star2 = document.getElementById("star-2");
let star3 = document.getElementById("star-3");
let star4 = document.getElementById("star-4");
let star5 = document.getElementById("star-5");

function setRatingStars(currentRestaurant) {
  console.log("rating:", currentRestaurant.rating);
  let rating = currentRestaurant.rating;

  if (rating == "0.5") {
    star1.className = "fas fa-star-half-alt";
  } else if (rating == "1") {
    star1.className = "fas fa-star";
  } else if (rating == "1.5") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star-half-alt";
  } else if (rating == "2") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star";
  } else if (rating == "2.5") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star";
    star3.className = "fas fa-star-half-alt";
  } else if (rating == "3") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star";
    star3.className = "fas fa-star";
  } else if (rating == "3.5") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star";
    star3.className = "fas fa-star";
    star4.className = "fas fa-star-half-alt";
  } else if (rating == "4") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star";
    star3.className = "fas fa-star";
    star4.className = "fas fa-star";
  } else if (rating == "4.5") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star";
    star3.className = "fas fa-star";
    star4.className = "fas fa-star";
    star5.className = "fas fa-star-half-alt";
  } else if (rating == "5") {
    star1.className = "fas fa-star";
    star2.className = "fas fa-star";
    star3.className = "fas fa-star";
    star4.className = "fas fa-star";
    star5.className = "fas fa-star";
  }
}

// Websocket
const url = "wss://ten-coal-infinity.glitch.me";
const connection = new WebSocket(url); // Subscribing to be a client -> URL based

// Websocket - messages
function sendNewMsg() {
  let e = document.getElementById("ws_test");
  let msgObj = {
    type: "message",
    from: "a player",
    msg: e.value
  };
  
  connection.send(JSON.stringify(msgObj));
  e.value = null;
}

function roundOver() {
  let msgObj = {
    type: "round_over",
    from: "A player"
  };
  
  connection.send(JSON.stringify(msgObj));
}

connection.onopen = () => {
  // When a player joins, count them
  playerAdded();
  connection.send(JSON.stringify({ type: "hello player" }));
};

connection.onerror = error => {
  console.log(`WebSocket error: ${error}`);
};

connection.onmessage = event => {
  let msgObj = JSON.parse(event.data);
  
  // Show restaurant
  if (msgObj.type == "show_rest") {
    numOfPlayers = getHowManyPlayers();
    getRandomRestaurantsFromServer();
  }
  
  // Player likes restaurant then update UI with number of likes on current restaurant
  if (msgObj.type == "update_like") {
    num_votes.textContent = String(parseInt(num_votes.textContent) + 1);
  }
  
  // Once liking is done, update the number of total votes
  if (msgObj.type == "like_done" && liked == 1) {
    updateVote();
    liked = 0;
  }

  // Winner has been chosen so display it
  if (msgObj.test == "updatePlusWinner") {
    displayWinner(restaurantArray[index]);
  }
  
  // When everyone has voted, advance to the next restaurant
  if (msgObj.type == "change_rest") {
    userAlreadyVoted = false;
    index += 1;
    if (index >= restaurantArray.length) {
      roundOver();
      index = 0;
    }
    else {
      displayRestaurant(restaurantArray[index]);
    }
  }
  
  // The round is over, so update the database i.e. get rid of restaurants with no likes
  // then reset the number of likes on all of them to 0
  if (msgObj.type == "round_over") {
    update_db();
  }
  
  // Database has been updated, so have players get the remaining restaurants in a random permutation
  if (msgObj.type == "updatedDatabase") {
    let msg = {
      type: "get_perm",
      from: "A player"
    };
  
    connection.send(JSON.stringify(msg));
  }
  
  // Get that array from server and display
  if(msgObj.type == "got_perm"){
    getNextRound();
  }
  
  // Done when players have gone through 3 rounds total
  if (msgObj.type == "end_game") {
    get_winner();
  }
};

// Display the winning restaurant
function displayWinner(winningRestaurant) {
  view1.style.display = "none";
  main.style.display = "flex";

  img.src = winningRestaurant.picture;
  name.textContent = winningRestaurant.name;
  price.textContent = winningRestaurant.price;
  setRatingStars(winningRestaurant);
  address.textContent = winningRestaurant.address;
  num_votes.textContent = String(winningRestaurant.num_likes);

  // Hide buttons:
  setTimeout(function() {
    yesButton.style.display = "none";
  }, 450);

  yesButtonMobile.style.display = "none";
  noButton.style.display = "none";
  noButtonMobile.style.display = "none";
  winnerHeader.style.display = "flex";
}

function get_winner() {
  const xhr = new XMLHttpRequest();
  let randomString = window.location.search.split("=")[1];
  xhr.open(
    "GET",
    "https://ten-coal-infinity.glitch.me/get_winner?id=" + randomString,
    true
  );
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.onloadend = function(e) {
    console.log("get_winner called: ", JSON.parse(xhr.responseText));
    displayWinner(JSON.parse(xhr.responseText));
  };
  xhr.send();
}

function update_db() {
  let msgObj = {
    type: "updateDatabase",
    from: "A player"
  };
  connection.send(JSON.stringify(msgObj));
}

function getNextRound() {
  index = 0;
  const xhr = new XMLHttpRequest();
  let randomString = window.location.search.split("=")[1];
  xhr.open(
    "GET",
    "https://ten-coal-infinity.glitch.me/getNextRound?id=" + randomString,
    true
  );
  img.src = "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.pinterest.com%2Fpin%2F80853755789865527%2F&psig=AOvVaw1H8yhrH0s2Ad7IJBXkhurX&ust=1591304888070000&source=images&cd=vfe&ved=0CAIQjRxqFwoTCIiTnOjG5ukCFQAAAAAdAAAAABAD";
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.onloadend = function(e) {
    restaurantArray = JSON.parse(xhr.responseText);
    displayRestaurant(restaurantArray[index]);
    console.log("Displaying this restaurant: ", restaurantArray[index]);
    let msgObj = {
      type: "allow_update",
      from: "A player"
    };
    connection.send(JSON.stringify(msgObj));
  };
  xhr.send();
}

// Add player
function playerAdded() {
  const xhr = new XMLHttpRequest();
  let randomString = window.location.search.split("=")[1];
  xhr.open(
    "POST",
    "https://ten-coal-infinity.glitch.me/playerAdded?id=" + randomString,
    true
  );
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.onloadend = function(e) {};
  xhr.send();
}

// Get total number of players from the server
function getHowManyPlayers() {
  const xhr = new XMLHttpRequest();
  let randomString = window.location.search.split("=")[1];
  xhr.open(
    "GET",
    "https://ten-coal-infinity.glitch.me/howManyPlayers?id=" + randomString,
    true
  );
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.onloadend = function(e) {
    let numOfUsers = 0;
    let user;
    let users = JSON.parse(xhr.responseText);
    for (user of users) {
      numOfUsers += 1;
    }
    return numOfUsers;
  };
  xhr.send();
}

// getRandomRestaurantFromServer() gets random restaurants from the server
function getRandomRestaurantsFromServer() {
  const xhr = new XMLHttpRequest();
  let randomString = window.location.search.split("=")[1];
  xhr.open(
    "GET",
    "https://ten-coal-infinity.glitch.me/getRandomRestaurant?id=" +
      randomString,
    true
  );
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.onloadend = function(e) {
    restaurantArray = JSON.parse(xhr.responseText);
    displayRestaurant(restaurantArray[index]);
  };
  xhr.send();
}

// Display restaurant gotten from server
function displayRestaurant(currentRestaurant) {
  console.log("displayRestaurant restaurant: ", currentRestaurant);
  view1.style.display = "none";
  main.style.display = "flex";
  img.src = currentRestaurant.picture;
  name.textContent = currentRestaurant.name;
  price.textContent = currentRestaurant.price;
  setRatingStars(currentRestaurant);
  address.textContent = currentRestaurant.address;
  num_votes.textContent = String(currentRestaurant.num_likes);
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// User did not like restaurant
noButton.addEventListener("click", async function() {
  if (userAlreadyVoted == false) {
    console.log("I don't like this restaurant");
    updateVote();
    userAlreadyVoted = true;
  } else {
    console.log("user already voted, dont double click you nub");
  }

  noButton.style.display = "none";

  setTimeout(function() {
    noButton.style.display = "flex";
  }, 300);
});

noButtonMobile.addEventListener("click", async function() {
  if (userAlreadyVoted == false) {
    console.log("I don't like this restaurant");
    updateVote();
    userAlreadyVoted = true;
  } else {
    console.log("user already voted, dont double click you nub");
  }

  noButtonMobile.style.color = "grey";

  setTimeout(function() {
    noButtonMobile.style.color = "#ff6b6b";
  }, 500);
});

function updateVote() {
  let id = getParameterByName("id");
  let msgObj = {
    type: "update_vote",
    from: "A player",
    id: id
  };
  
  connection.send(JSON.stringify(msgObj));
}

function updateLike() {
  let randomString = window.location.search.split("=")[1];
  let id = getParameterByName("id");
  let msgObj = {
    type: "update_like",
    from: "A player",
    id: id,
    name: restaurantArray[index].name,
    test: "123"
  };
  
  connection.send(JSON.stringify(msgObj));
}

// User likes restaurant
yesButton.addEventListener("click", async function() {
  if (userAlreadyVoted == false) {
    liked = 1;
    updateLike();
    // updateVote();
    userAlreadyVoted = true;
  } else {
    console.log("user already voted, dont double click you nub");
  }

  yesButton.style.display = "none";

  setTimeout(function() {
    yesButton.style.display = "flex";
  }, 300);
});

yesButtonMobile.addEventListener("click", async function() {
  if (userAlreadyVoted == false) {
    liked = 1;
    // this await call to an async function makes it so that we dont call update vote until we get the response back from updateLike()
    updateLike();
    //updateVote();
    userAlreadyVoted = true;
  } else {
    console.log("user already voted, dont double click you nub");
  }

  yesButtonMobile.style.color = "grey";

  setTimeout(function() {
    yesButtonMobile.style.color = "#ff6b6b";
  }, 500);
});
