/* The code from this file has been adapted from the Google Calendar API
Node.js Quickstart Guide.*/

const fs = require("fs");
const readline = require("readline");
const {google} = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
// The file token.json stores the user"s access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Calendar API.
  module.exports.content = content;
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param {Object} additionalArg The extra argument for addEvent or checkEvents
 * functions.
 */
function authorize(credentials, callback, additionalArg) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  return new Promise(resolve => {
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      resolve(callback(oAuth2Client, additionalArg));
    });
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


/**
* Add an event to the primary calendar. Print the link to the event to
* the console or an error otherwise.
* @param {google.auth.OAuth2} auth The OAuth2 client to get token for.
* @param {Object} event The event object to be added to the calendar.
**/
function addEvent(auth, event) {
  const calendar = google.calendar({version: "v3", auth});
  calendar.events.insert({
    auth: auth,
    calendarId: "primary",
    resource: event
  }, (error, event) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log("Event created %s", event.data.htmlLink);
  });
}

/**
* Returns a promise that contains an array of events within a given timeslot.
* @param {google.auth.OAuth2} auth The OAuth2 client to get token for.
* @param {Object} An object with two properties (start and end) which indicate
* the bounds of the time slot the events we want to check need to fall within.
* @return {Promise} Promise object representing an array of events.
**/
function checkEvents(auth, timeSlot) {
  const calendar = google.calendar({version: "v3", auth});
  console.log(timeSlot);
  return new Promise(resolve => {
    calendar.events.list({
      calendarId: "primary",
      timeMin: timeSlot.start,
      timeMax: timeSlot.end,
      singleEvents: true,
      orderBy: "startTime"
    }, (error, res) => {
      if (error) {
        console.log(error);
        return;
      }
      const events = res.data.items;
      resolve(events);
    });
  });
}

module.exports.authorize = authorize;
module.exports.addEvent = addEvent;
module.exports.checkEvents = checkEvents;