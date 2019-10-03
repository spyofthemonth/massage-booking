const calendar = require("../calendar.js");
const helper = require("../util/helper.js");
const moment = require("moment");
const express = require("express");
const router = express.Router();

/* Sends an array of which days in a given month have available time
slots. (The days which are bookable.) */
router.get("/days", async (req, res) => {
    if (!helper.getMissingParams(req, res, true, true, false, false, false)) {

        /* If the month query string represents a month less than 10 and does
        not have a leading zero character. */
        if (req.query.month.length < 2)
            req.query.month = "0" + req.query.month;

        let days = [];
        const currentDate = new Date();
        const numDays = moment(req.query.year + "-" + req.query.month,
        "YYYY-MM").daysInMonth();

        // If the month has past, there should be no time slots available.
        if ((req.query.month < currentDate.getUTCMonth() + 1
            && req.query.year == currentDate.getUTCFullYear())
            || (req.query.year < currentDate.getUTCFullYear())) {
            for (let i = 1; i <= numDays; i++)
                days[i-1] = {"day": i, "hasTimeSlots": false};
            res.send({"success": true, "days": days});
            return;
        }

        let timeSlotBounds = {};
        /*timeSlotBounds.start = new Date(req.query.year + "-" + req.query.month
        + "-01" + "T08:59:00Z");
        timeSlotBounds.end = new Date(req.query.year + "-" + req.query.month
        + "-" + numDays + "T18:00:00Z");*/

        timeSlotBounds.start = new Date();
        timeSlotBounds.start.setUTCFullYear(req.query.year);
        timeSlotBounds.start.setUTCMonth(req.query.month - 1);
        timeSlotBounds.start.setUTCDate(1);
        timeSlotBounds.start.setUTCHours(8);
        timeSlotBounds.start.setUTCMinutes(59);

        timeSlotBounds.end = new Date();
        timeSlotBounds.end.setUTCFullYear(req.query.year);
        timeSlotBounds.end.setUTCMonth(req.query.month - 1);
        timeSlotBounds.end.setUTCDate(numDays);
        timeSlotBounds.end.setUTCHours(18);

        /* All weekdays start off with the assumption that they have available
        time slots. */
        for (let i = 1; i <= numDays; i++) {
            days[i-1] = {"day": i, "hasTimeSlots": true};

            // Past days in the month should not have any available time slots.
            if (i < currentDate.getUTCDate()
                && currentDate.getUTCMonth() + 1 == req.query.month
                && currentDate.getUTCFullYear() == req.query.year) {
                days[i-1].hasTimeSlots = false;
            }

            let ithDay = new Date(req.query.year + "-" + req.query.month + "-"
            + ((i < 10)? "0" + i : i)); //Add a leading zero if needed.

            // If a weekend it should not have any available time slots.
            if (ithDay.getUTCDay() == 0 || ithDay.getUTCDay() == 6) {
                days[i-1].hasTimeSlots = false;
            }
        }

        // Get all events from the calendar within timeSlotBounds.
        const events = await calendar.authorize(JSON.parse(calendar.content),
        calendar.checkEvents, timeSlotBounds);

        // Initially there are twelve available time slots in a day.
        let numAvailableSlots = 12;
        let iteratingDay;
        events.map(event => {
            let eventDay = moment(event.start.dateTime).utc().toISOString();
            eventDay = (new Date(eventDay)).getUTCDate();

            // If this the first iteration.
            if (iteratingDay == undefined) {
                iteratingDay = eventDay;
            } else if (eventDay > iteratingDay) {
                // If we've reached a new day.
                if (!numAvailableSlots) {
                    /* If the number of appointments on a day equals the number
                    of available time slots (12) there are no available time
                    slots. */
                    days[iteratingDay - 1].hasTimeSlots = false;
                }
                iteratingDay = eventDay;
                numAvailableSlots = 12;
            }
            numAvailableSlots--;
        });
        res.send({"success": true, "days": days});
    }
});

module.exports = router;