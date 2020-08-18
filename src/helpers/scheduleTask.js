const exp = {}
const schedule = require('node-schedule')
// const { initiateNewBilling } = require('../models/billing')

const Queue = require('bull')
const { aggregate } = require('./databases/mongodb')

const billingQueue = new Queue('ISA Billing', {
    redis: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST,
    }
})

const reminderQueue = new Queue('ISA REMINDER', {
    redis: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST,
    }
})

const runNewBilling = schedule.scheduleJob({
    hour: 23,
    minute: 12,
    date: 18
}, () => {
    const { initiateNewBilling } = require('../models/billing')
    initiateNewBilling()
})

const runPaymentReminder = () => {
    const { createReminderDate } = require('../models/reminder')

    aggregate('reminder', [
        
    ], 'arkademy').then(result => {
        let dates = []
        result.forEach(value => {
            try {
                const date = parseInt(value.listReminder)
                dates.push(date)
            } catch (error) {
                
            }
        })
        schedule.scheduleJob({
            hour: 10,
            minute: 00,
            date: dates
        }, () => {
            // const { initiateNewBilling } = require('../models/billing')
            // initiateNewBilling()
            createReminderDate()
        })
    }).catch(error => {
        Sentry.captureException('Get Billing Reminder', error);
        return reject(error)
    })
}

reminderQueue.process(async job => {
    data = job.data
})

billingQueue.process(async job => {
    data = job.data
    const { createInvoice } = require('../models/billing')
    const { sent } = require('./email')
    const { emailBilling } = require('../models/email')
    const moment = require('moment')
    createInvoice(data).then(result => {
        const email = emailBilling({
            id_billing: data.id_billing,
            fullname: result.realname,
            amount: formatRupiah(data.amount),
            monthYear: moment().format('MMMM YYYY'),
            billed_on: moment().format('DD MMMM YYYY HH:mm'),
            due_date: moment(result.expiry_date).format('DD MMMM YYYY HH:mm'),
            list_bank: result.available_banks
        })

        sent('Finance Arkademy <finance@arkademy.com>', [result.payer_email], result.description, email).then(result => {
            console.log('Success Sent')
        }).catch(error => {
            console.log(error)
        })
    }).catch(error => {
        console.log('Failed Create Invoice', error)
        // console.log(error)
    })
})

function formatRupiah(angka){
    if (!angka) {
        return '';
    }
    const number = angka.toString();
    const sisa 	= number.length % 3;
    var rupiah 	= number.substr(0, sisa);
    const ribuan 	= number.substr(sisa).match(/\d{3}/g);
        
    if (ribuan) {
        const separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    return rupiah;
}


module.exports = {
    billingQueue,
    runNewBilling,
    runPaymentReminder
}