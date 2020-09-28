const { query } = require("../helpers/databases/postgresql")
const { emailReminder } = require("./email")
const async = require('async')
const { sent } = require("../helpers/email")

const exp = {}

exp.sentReminder = () => {
    return new Promise((resolve, reject) => {
        const getBillingMaturity = getDataMaturity()
        let queue = async.queue((task, cb) => {
            console.log(task)
            const emailGenerate = emailReminder({
                fullname: task.realname,
                list_bank: task.available_banks
            })

            let subject = 'Reminder 1 / 2 / 3 / 4 - Pembayaran Income Sharing Arkademy'

            if (task.maturity === 3) {
                subject = 'Reminder 1 - Pembayaran Income Sharing Arkademy'
            } else if (task.maturity === 7) {
                subject = 'Reminder 2 - Pembayaran Income Sharing Arkademy'
            } else if (task.maturity === 14) {
                subject = 'Reminder 3 - Pembayaran Income Sharing Arkademy'
            } else if (task.maturity === 21) {
                subject = 'Reminder 4 - Pembayaran Income Sharing Arkademy'
            }

            sent('Arkademy Finance <finance@arkademy.com>', [task.email], subject, emailGenerate).then(result => {
                cb()
            }).catch(error => {
                console.log(error)
                cb()
            })
        }, 5)

        queue.drain(() => {
            return resolve()
        })

        queue.push(getBillingMaturity)
    })
}

const getDataMaturity = () => {
    query(`
        SELECT *  FROM (SELECT
            id_talent,
            realname,
            (
                SELECT batch FROM bootcamp.batch WHERE id_batch = talent.id_batch
            ),
            (
                SELECT track.name FROM bootcamp.batch JOIN bootcamp.track USING(id_track) WHERE id_batch = talent.id_batch
            ),
            pay_day,
            EXTRACT(days FROM age(current_date, billing.billed_on)) + 1 AS maturity,
            amount::money::numeric::float8,
            payment_information
        FROM 
            finance.billing AS billing JOIN hiring.talent USING(id_talent) WHERE payment_status IS NULL) as billing WHERE maturity IN ('3', '7', '14', '21')
        `, [], 'arkademy').then(result => {
            return result.rows
        })
}

module.exports = exp