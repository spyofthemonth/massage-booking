const calendar = require('./index.js');
const express = require('express');
const moment = require('moment');
const app = express();

/* Get an array of available time slots for a given date. 
Will remove any time slots that are taken by existing appointments. */
async function getTimeSlots(year, month, date) {
    let dateTime = new Date(year + '-' + month + '-' + date + 'T09:00:00Z');
    let dateTimeCopy = new Date(dateTime.getTime());
    dateTimeCopy.setMinutes(dateTimeCopy.getMinutes() - 1);
    let timeSlots = [];
    let timeSlotBounds = {};

    for (let i = 0; i < 12; i++) {
        let timeSlot = {};

        timeSlot.startTime = dateTime.toISOString();
        if (!i) timeSlotBounds.startTime = dateTimeCopy.toISOString();

        dateTime.setMinutes(dateTime.getMinutes() + 40);
        dateTimeCopy.setMinutes(dateTimeCopy.getMinutes() + 40);
        timeSlot.endTime = dateTime.toISOString();
        if (i == 11) timeSlotBounds.endTime = dateTimeCopy.toISOString();

        dateTime.setMinutes(dateTime.getMinutes() + 5);
        dateTimeCopy.setMinutes(dateTimeCopy.getMinutes() + 5);

        timeSlots.push(timeSlot);
    }

    const events = await calendar.authorize(JSON.parse(calendar.content), calendar.checkEvents, timeSlotBounds);
    events.map(event => {
        let eventStartTime = moment(event.start.dateTime).utc().toISOString();
        for (let i = 0; i < timeSlots.length; i++) {
            if (eventStartTime == timeSlots[i].startTime) {
                console.log('Removed ' + timeSlots[i].startTime);
                timeSlots.splice(i, 1);
                break;
            }
        }
    });

    return timeSlots;
}

/* Return whether there are any missing query string parameters for the given HTTP request.*/
function getMissingParams(req, res, year, month, day, hour, minute) {
    let missingParams = [];
    if ((year) && (req.query.year == '' || req.query.year == undefined)) {
        missingParams.push(' year');
    }
    if ((month) && (req.query.month == '' || req.query.month == undefined)) {
        missingParams.push(' month');
    }
    if ((day) && (req.query.day == '' || req.query.day == undefined)) {
        missingParams.push(' day');
    }
    if ((hour) && (req.query.hour == '' || req.query.hour == undefined)) {
        missingParams.push(' hour');
    }
    if ((minute) && (req.query.minute == '' || req.query.minute == undefined)) {
        missingParams.push(' minute');
    }

    if (missingParams.length) {
        let message = 'Request is missing parameter(s):';
        for (let i = 0; i < missingParams.length; i++)
            message += missingParams[i];
        res.send({"success": false, "message": message});
        return true;
    } 
    return false;
}

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

/* Sends an array of which days in a given month have available times slots (are bookable). */
app.get('/days', async (req, res) => {
    if (!getMissingParams(req, res, true, true, false, false, false)){
        const numDays = moment(req.query.year + '-' + req.query.month, 'YYYY-MM').daysInMonth();
        let days = [];
        let timeSlotBounds = {};
        timeSlotBounds.start = new Date(req.query.year + '-' + req.query.month + '-01' + 'T08:59:00Z');
        timeSlotBounds.end = new Date(req.query.year + '-' + req.query.month + '-' + numDays + 'T18:00:00Z');

        // All days start off with the assumption that they have available time slots.
        for (let i = 1; i <= numDays; i++) {
            days[i-1] = {"day": i, "hasTimeSlots": true};
        }
        const events = await calendar.authorize(JSON.parse(calendar.content), calendar.checkEvents, timeSlotBounds);
        let numAvailableSlots = 12;
        let currentDay;
        events.map(event => {
            let d = moment(event.start.dateTime).utc().toISOString();
            d = (new Date(d)).getUTCDate();
            if (currentDay == undefined) {
                currentDay = d;
            } else if (d > currentDay) {
                if (!numAvailableSlots) {
                    /* If the number of appointments on a day equals the number of available time slots (12)
                    there are no available time slots. */
                    days[currentDay - 1].hasTimeSlots = false;
                }
                currentDay = d;
                numAvailableSlots = 12;
            }
            numAvailableSlots--;
        });
        res.send({"success": true, "days": days});
    }
});

/* Sends an array of available time slots for a given date. */
app.get('/timeslots', async (req, res) => {
    if (!getMissingParams(req, res, true, true, true, false, false)){
        const timeSlots = await getTimeSlots(req.query.year, req.query.month, req.query.day);
        res.send({"success": true, "timeSlots": timeSlots});
    }
});

/* Books a new appointment. First checks whether the desired appointment date meets requirements. */
app.post('/book', async (req, res) => {
    const startDateTimeStr = req.query.year + '-' + req.query.month + '-' + req.query.day + 'T' + req.query.hour + ':' + req.query.minute + ':00Z';
    const startDateTime = new Date(startDateTimeStr);
    let endDateTime = new Date(startDateTimeStr);
    endDateTime.setMinutes(startDateTime.getMinutes() + 40);
    const currentDate = new Date();

    const timeSlots = await getTimeSlots(req.query.year, req.query.month, req.query.day);
    let availableSlot = false;
    for (let i = 0; i < timeSlots.length; i++) {
        if (startDateTime.toISOString() == timeSlots[i].startTime && endDateTime.toISOString() == timeSlots[i].endTime) {
            availableSlot = true;
            break;
        }
    }

    if (startDateTime < currentDate) {
        // If time is in the past
        res.send({"success": false, "message": "Cannot book time in the past"});
    } else if (((startDateTime.getTime() - (10 * 1000 * 3600) - currentDate.getTime()) / (1000 * 3600 * 24)) < 1) {
        // If time is in less than 24 hrs
        res.send({"success": false, "message": "Cannot book with less than 24 hours in advance"});
    } else if (startDateTime.getUTCHours() < 9 || endDateTime.getUTCHours() > 18) { //NB: 2Hats site has contradicting info (ends at 5 or 6pm?)
        // If time is not within 9-6
        res.send({"success": false, "message" : "Cannot book outside bookable timeframe"});
    } else if (!availableSlot) {
        // If it's not an available time slot.
        res.send({"success": false, "message": "Invalid time slot"});
        calendar.bookingFull = false;
    } else {
        let newEvent = {
            "summary": "Appointment",
            "start": {
            },
            "end": {
            }
        };
        newEvent.start.dateTime = startDateTime.toISOString();
        newEvent.end.dateTime = endDateTime.toISOString();
        calendar.authorize(JSON.parse(calendar.content), calendar.addEvent, newEvent);
        res.send({"success": true, "startTime": startDateTime.toISOString(), "endTime": endDateTime.toISOString()});

        /* NB: Throughout the app times are dealt in UTC however when an event is posted to Google Calendar
        the event is displayed in local time (AEST). Even if the event's timeZone property is changed to a
        GMT+0000 time zone the event will still be shown in local time (AEST). When reading events from Google Calendar
        event times are converted back into UTC. */
    }
    
});

app.listen(3000);