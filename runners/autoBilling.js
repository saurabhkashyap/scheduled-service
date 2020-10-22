const { runSentBillingToday } = require('../src/models/billing');
const { sentReminder, sentReminderBeforeBilling } = require('../src/models/reminder');

const cron = require('cron').CronJob;

const job = new cron('0 10 25 * *', () => {
    runSentBillingToday()
})

const reminder = new cron('0 10 * * *', () => {
    console.log('RUN REMINDER TODAY')
    sentReminder()
})

const reminderBeforeBilling = new cron('0 10 23 * *', () => {
    sentReminderBeforeBilling()
})

module.exports = {
    job,
    reminder,
    reminderBeforeBilling
}