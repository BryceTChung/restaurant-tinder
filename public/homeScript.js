"use strict";
// ----VIEW 1 items -----
let mainViewOne = document.getElementById("mainViewOne");
let mainViewTwo = document.getElementById("mainViewTwo");
let startGameBtn = document.getElementById("startGameBtn");

// ----VIEW 2 items -----
let linkToShare = document.getElementById("linkToShare");
let getRestaurantsBtn = document.getElementById("getRestaurantsBtn");
let inputLocation = document.getElementById("search1Input");
let inputKeywords = document.getElementById("search2Input");
let input = document.getElementsByTagName("input")[0];
// Session unique id
let randomString ="";

// Websocket 
const url = "wss://ten-coal-infinity.glitch.me";
const connection = new WebSocket(url);

function sendNewMsg() {
  let msgObj = {
    //type: "show_rest",
    type: "host_is_joining",
    from: "the host"
  };
  connection.send(JSON.stringify(msgObj));
}

connection.onopen = () => {
  connection.send(JSON.stringify({ type: "hello player" }));
};

connection.onerror = error => {
  console.log(`WebSocket error: ${error}`);
};

connection.onmessage = event => {
  let msgObj = JSON.parse(event.data);
  if (msgObj.type == "message") {
    console.log(msgObj.from + ": " + msgObj.msg);
  } else {
    console.log("msg.type != 'message'");
  }
};

// Init view 2 display to be off -> turned on when they click button
function start() {
  mainViewTwo.style.display = "none";
}

// Switch from view1 to view2
startGameBtn.addEventListener("click", () => {
  // Display view 2
  mainViewOne.style.display = "none";
  mainViewTwo.style.display = "flex";

  // Setup link for view 2
  const xhr = new XMLHttpRequest();
  
  // Made randomStr global
  randomString = "";

  xhr.open("GET", "https://ten-coal-infinity.glitch.me/getRandomString", true);
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.onloadend = function(e) {
    randomString = xhr.responseText;
    linkToShare.textContent =
      "https://ten-coal-infinity.glitch.me/player.html?id=" + randomString;
    linkToShare.href =
      "https://ten-coal-infinity.glitch.me/player.html?id=" + randomString;
  };
  xhr.send();
});

// GET request to Yelp Business API
getRestaurantsBtn.addEventListener("click", () => {
  getRestaurantsBtn.style.backgroundColor = "gray";

  const xhr = new XMLHttpRequest();
  let yelpApiParams = {
    locationSearch: inputLocation.value,
    keywordsSearch: inputKeywords.value
  };

  
  if(yelpApiParams.locationSearch.length <= 0 || yelpApiParams.keywordsSearch.length <= 0 ) {
    alert("Enter values for both search params pleasseee");
    
    setTimeout(function() {
      getRestaurantsBtn.style.color = "white";
    }, 300);
    
  }
  else {
    let data = JSON.stringify(yelpApiParams);
    //Set to POST because we want to send JSON, GET request can only send data via query string which is annoying so no ty
    xhr.open("POST", "https://ten-coal-infinity.glitch.me/getApiData", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    xhr.onloadend = function(e) {
      console.log("inside onload");
      sendNewMsg();
      window.location.replace("https://ten-coal-infinity.glitch.me/player.html?id="+ randomString);
    };
    //window.location.replace("https://ten-coal-infinity.glitch.me/player.html?id="+ randomString);
    //window.open("https://ten-coal-infinity.glitch.me/player.html?id="+ randomString);
    xhr.send(data);
    
    
  }
});
    

start();