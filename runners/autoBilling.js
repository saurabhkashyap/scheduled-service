const { runSentBillingToday } = require('../src/models/billing');
const { sentReminder } = require('../src/models/reminder');

const cron = require('cron').CronJob;

const job = new cron('0 10 25 * *', () => {
    runSentBillingToday()
})

const reminder = new cron('0 10 * * *', () => {
    sentReminder()
})

module.exports = {
    job,
    reminder
}