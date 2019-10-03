const calendar = require("../calendar.js");
const moment = require("moment");

/**
* Get an array of available time slots for a given date. Will remove any
* time slots that are taken by existing appointments.
* @param {string} year The year represented as a string of four digits.
* @param {string} month The month represented as a string of two digits.
* @param {string} date The date respresented as a string of two digits.
* @return {Array} An array of time slots where each time slot is an object
* with two properties: startTime and endTime.
**/
async function getTimeSlots(year, month, date) {
    let dateTime = new Date(year + "-" + month + "-" + date + "T09:00:00Z");
    /* Using the set methods causes issues hence an ISO string was used. */
    let timeSlots = [];
    let timeSlotBounds = {};

    /* In an empty weekday there are twelve 40 min time slots. If it's the
    first or last time slot these are stored in the timeSlotBounds object
    to be passed to the authorize function. */
    for (let i = 0; i < 12; i++) {
        let timeSlot = {};
        timeSlot.startTime = dateTime.toISOString();

        if (i == 0) {
            dateTime.setMinutes(dateTime.getMinutes() - 1);
            //set startTime
            timeSlotBounds.startTime = dateTime.toISOString();
            dateTime.setMinutes(dateTime.getMinutes() + 1);
        }

        dateTime.setMinutes(dateTime.getMinutes() + 40);
        timeSlot.endTime = dateTime.toISOString();

        if (i == 11) {
            dateTime.setMinutes(dateTime.getMinutes() - 1);
            //set endTime
            timeSlotBounds.endTime = dateTime.toISOString();
            dateTime.setMinutes(dateTime.getMinutes() + 1);
        }

        dateTime.setMinutes(dateTime.getMinutes() + 5);
        timeSlots.push(timeSlot);
    }

    // Get all events from the calendar within timeSlotBounds.
    const events = await calendar.authorize(JSON.parse(calendar.content),
    calendar.checkEvents, timeSlotBounds);
    /* Any time slot with an existing appointment is removed from the array
    to be returned. */
    events.map(event => {
        let eventStartTime = moment(event.start.dateTime).utc().toISOString();
        for (let i = 0; i < timeSlots.length; i++) {
            if (eventStartTime == timeSlots[i].startTime) {
                console.log("Removed " + timeSlots[i].startTime);
                timeSlots.splice(i, 1);
                break;
            }
        }
    });

    return timeSlots;
}

/**
* Return whether there are any missing query string parameters for the
* given HTTP request.
* Sends a response displaying which query string parameters are missing.
* @param {Object} req An object representing the HTTP request
* @param {Object} res An object represenitng the HTTP response
* @params {boolean} year, month, day hour, minute A boolean representing
* whether the respective parameter is included in the request.
* @return {boolean} A boolean value representing whether or not there are any
* missing parameters.
**/
function getMissingParams(req, res, year, month, day, hour, minute) {
    let missingParams = [];
    /* If the parameter is part of the request and is either blank or not
    defined at all. */
    if ((year) && (req.query.year == "" || req.query.year == undefined)) {
        missingParams.push(" year");
    }
    if ((month) && (req.query.month == "" || req.query.month == undefined)) {
        missingParams.push(" month");
    }
    if ((day) && (req.query.day == "" || req.query.day == undefined)) {
        missingParams.push(" day");
    }
    if ((hour) && (req.query.hour == "" || req.query.hour == undefined)) {
        missingParams.push(" hour");
    }
    if ((minute) && (req.query.minute == "" || req.query.minute == undefined)) {
        missingParams.push(" minute");
    }
    // A response is sent indicating which parameters the request is missing.
    if (missingParams.length) {
        let message = "Request is missing parameter(s):";
        for (let i = 0; i < missingParams.length; i++)
            message += missingParams[i];
        res.send({"success": false, "message": message});
        return true;
    }
    return false;
}

module.exports.getTimeSlots = getTimeSlots;
module.exports.getMissingParams = getMissingParams;