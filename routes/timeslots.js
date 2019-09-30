const helper = require("../util/helper.js");
const express = require("express");
const router = express.Router();

/* Sends an array of available time slots for a given date. */
router.get("/timeslots", async (req, res) => {
    if (!helper.getMissingParams(req, res, true, true, true, false, false)) {

        /* If the month or day query strings represent a number less than 10
        and don't have a leading zero character. */
        if (req.query.month.charAt(0) != 0 && req.query.month < 10)
            req.query.month = "0" + req.query.month;
        if (req.query.day.charAt(0) != 0 && req.query.day < 10)
            req.query.day = "0" + req.query.day;

        const givenDate = new Date(req.query.year + "-" + req.query.month +
        "-" + req.query.day + "T09:00:00Z");
        const currentDate = new Date();
        // We set hours to 9 so time is equal to givenDate.
        currentDate.setHours(9);

        const bookingOnWeekend = (givenDate.getUTCDay() == 0 ||
        givenDate.getUTCDay() == 6);

        if (givenDate < currentDate || bookingOnWeekend) {
            res.send({"success": true, "timeSlots": []});
        } else {
            const timeSlots =
            await helper.getTimeSlots(req.query.year, req.query.month,
            req.query.day);
            res.send({"success": true, "timeSlots": timeSlots});
        }
    }
});

module.exports = router;