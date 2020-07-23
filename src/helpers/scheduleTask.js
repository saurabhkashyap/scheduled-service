const exp = {}
const Queue = require('bull');
const { sentReminderByDateFromDatabase, setNewReminderByDate, sentEmailBillingByPayDay } = require('../models/finance');

const isaQueue = new Queue('ISA', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

const billingQueue = new Queue('Billing', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

exp.addISAQueue = (context, data, schedule) => {
    const datas = {
        context: context,
        data: data
    }
    const option = {
        delay: schedule,
        limiter: {
            max: 100,
            duration: 5000
        }
    }
    isaQueue.add(datas, option)
}

exp.addBillingQueue = (context, data, schedule) => {
    const datas = {
        context: context,
        data: data
    }
    const option = {
        delay: schedule,
        limiter: {
            max: 100,
            duration: 5000
        }
    }
    billingQueue.add(datas, option)
}

isaQueue.process(async job => { 
    try {
        job = JSON.parse(job.data)
    } catch (error) {
        job = job
    }
    if (job.context === 'ISAPaymentReminder') {
        await sentReminderByDateFromDatabase(job)
    }

    if (job.context === 'TimeForSetNewISAReminder') {
        await setNewReminderByDate()
    }

    if (job.context === '') {

    }
})

billingQueue.process(async job => {
    try {
        job = JSON.parse(job.data)
    } catch (error) {
        job = job
    }
    if (job.context === 'BillingPaymentReminder') {
        await sentEmailBillingByPayDay(job)
    }

    if (job.context === '') {

    }
})

module.exports = exp