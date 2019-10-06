# massage-booking
Node.js Booking App for 2Hats.

## Setup Google Calendar API
Follow the following instructions to setup the API with your Google account and obtain the `credentials.json` file.
https://developers.google.com/calendar/quickstart/nodejs

## Install dependencies
`$ npm install`

## Run
`$ node app.js`

## Endpoints
`GET  /days?year=yyyy&month=mm` - GET bookable days\
`GET  /timeslots?year=yyyy&month=mm&day=dd` - GET available time slots\
`POST  /book?year=yyyy&month=MM&day=dd&hour=hh&minute=mm` - POST book an appointment

NB: Throughout the app times are dealt in UTC however when an event is posted to Google Calendar the event is displayed in local time (AEST). Even if the event's timeZone property is changed to a GMT+0000 time zone the event will still be shown in local time (AEST). When reading events from Google Calendar event times are converted back into UTC.
