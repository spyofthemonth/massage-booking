const calendar = require("./calendar.js"),
      book = require("./routes/book.js"),
      days = require("./routes/days.js"),
      timeslots = require("./routes/timeslots.js"),
      moment = require("moment"),
      express = require("express"),
      app = express();

app.use("", days, timeslots, book);

const server = app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on port " + server.address().port);
});