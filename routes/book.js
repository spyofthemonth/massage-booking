const calendar = require("../calendar.js");
const helper = require("../util/helper.js");
const express = require("express");
const router = express.Router();

/* Books a new appointment. First checks whether the desired appointment
date meets requirements. */
router.post("/book", async (req, res) => {
    if (helper.getMissingParams(req, res, true, true, true, true, true))
        return;
    
    /* If the month, day, hour, or minute query strings represent a number
    less than 10 and don't have a leading zero character. */
    if (req.query.month.length < 2)
        req.query.month = "0" + req.query.month;
    if (req.query.day.length < 2)
        req.query.day = "0" + req.query.day;
    if (req.query.hour.length < 2)
        req.query.hour = "0" + req.query.hour;
    if (req.query.minute.length < 2)
        req.query.minute = "0" + req.query.minute;

    const startDateTimeStr = req.query.year + "-" + req.query.month + "-" +
    req.query.day + "T" + req.query.hour + ":" + req.query.minute + ":00Z";
    /* Using an ISO String to create both startDateTime and endDateTime
    because there is no easy way to clone a datetime object while keeping
    it in UTC time. Reusing this ISO string is the optimal way. */

    const startDateTime = new Date(startDateTimeStr);
    let endDateTime = new Date(startDateTimeStr);
    endDateTime.setMinutes(startDateTime.getMinutes() + 40);

    const currentDate = new Date();
    // currentDate time needs to be = startDateTime time for comparison later.
    currentDate.setUTCHours(req.query.hour);
    currentDate.setUTCMinutes(req.query.minute);

    const timeSlots =
    await helper.getTimeSlots(req.query.year, req.query.month, req.query.day);

    let availableSlot = false;
    for (let i = 0; i < timeSlots.length; i++) {
        if (startDateTime.toISOString() == timeSlots[i].startTime
            && endDateTime.toISOString() == timeSlots[i].endTime) {
            availableSlot = true;
            break;
        }
    }

    const bookingOnWeekend = (startDateTime.getUTCDay() == 0 ||
                              startDateTime.getUTCDay() == 6 ||
                              endDateTime.getUTCDay() == 0 ||
                              endDateTime.getUTCDay() == 6);

    const daysTillAppointment =
    ((startDateTime.getTime() - (10 * 1000 * 3600) - currentDate.getTime())
    / (1000 * 3600 * 24));

    if (startDateTime < currentDate) {
        // If time is in the past
        res.send({"success": false, "message": "Cannot book time in the past"});
    } else if (daysTillAppointment < 1) {
        // If time is in less than 24 hrs
        res.send({"success": false, "message":
                  "Cannot book with less than 24 hours in advance"});
    } else if (startDateTime.getUTCHours() < 9 || endDateTime.getUTCHours() > 18
               || bookingOnWeekend) {
        // If time is not within 9-6 on a weekday
        res.send({"success": false, "message" :
                  "Cannot book outside bookable timeframe"});
    } else if (!availableSlot) {
        // If it"s not an available time slot.
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
        // Add a new event to the calendar.
        calendar.authorize(JSON.parse(calendar.content),
                           calendar.addEvent, newEvent);
        res.send({"success": true, "startTime": startDateTime.toISOString(),
                  "endTime": endDateTime.toISOString()});

        /* NB: Throughout the app times are dealt in UTC however when an event
        is posted to Google Calendar the event is displayed in local
        time (AEST). Even if the event's timeZone property is changed to a
        GMT+0000 time zone the event will still be shown in local time (AEST).
        When reading events from Google Calendar event times are converted back
        into UTC. */
    }
});

module.exports = router;