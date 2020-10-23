const { query } = require("../helpers/databases/postgresql")
const { emailReminder, emailReminderBeforeBilling } = require("./email")
const async = require('async')
const { sent } = require("../helpers/email")

const exp = {}

exp.sentReminder = () => {
    return new Promise(async (resolve, reject) => {
        const getBillingMaturity = await getDataMaturity()
        // console.log(getBillingMaturity)
        let queue = async.queue(async (task, cb) => {
            const emailGenerate = emailReminder({
                fullname: task.realname,
                list_bank: task.payment_information.available_banks
            })

            let subject = 'Reminder 1 / 2 / 3 / 4 - Pembayaran Income Sharing Arkademy'

            if (task.maturity === 3) {
                subject = 'Reminder 1 - Pembayaran Income Sharing Arkademy'
            } else if (task.maturity === 5) {
                subject = 'Reminder 2 - Pembayaran Income Sharing Arkademy'
            } else if (task.maturity === 7) {
                subject = 'Reminder 3 - Pembayaran Income Sharing Arkademy'
            } else if (task.maturity === 14) {
                subject = 'Reminder 4 - Pembayaran Income Sharing Arkademy'
            } else if (task.maturity === 21) {
                subject = 'Reminder 5 - Pembayaran Income Sharing Arkademy'
            }

            sent('Arkademy Finance <finance@arkademy.com>', [task.email], subject, emailGenerate).then(async result => {
                await insertEmailData({
                    id_email: result.id_email,
                    id_billing: task.external_id,
                    to: task.email,
                    from: 'Finance Arkademy <finance@arkademy.com>',
                    content: emailGenerate
                })
            }).catch(error => {
                console.log(error)
                // cb()
            })
        }, 5)

        queue.drain(() => {
            return resolve()
        })

        queue.push(getBillingMaturity)
    })
}

exp.sentReminderBeforeBilling = () => {
    console.log('REMINDER h-2 auto billing')
    return new Promise(async (resolve, reject) => {
        const dataTalent = await query(`SELECT * FROM (SELECT *, (SELECT batch FROM bootcamp.batch WHERE id_batch = talent.id_batch) AS real_batch FROM hiring.talent WHERE  status_talent = 'work' AND status_payment IN ('active', 'paycut', 'pending')) AS data WHERE real_batch IN ('8', '9', '10', '11', '12')`, [], 'arkademy').then(result => {
            return result.rows
        }).catch(error => {
            return reject(error)
        })

        let q = async.queue((task) => {
            const email = emailReminderBeforeBilling({
                fullname: task.realname
            })

            sent('Arkademy Finance <finance@arkademy.com>', [task.email], `Reminder - Pembayaran Income Sharing Agreement`, email).then(async result => {
                await insertEmailData({
                    id_email: result.id_email,
                    id_billing: task.external_id,
                    to: task.email,
                    from: 'Finance Arkademy <finance@arkademy.com>',
                    content: email
                })
                console.log('sent to', task.email)
            }).catch(error => {
                console.log(error)
                // cb()s
            })
        }, 5)

        q.drain(() => {
            return resolve()
        })

        q.push(dataTalent)
    })
}

const getDataMaturity = () => {
    return new Promise((resolve, reject) => {
        query(`
        SELECT *  FROM (SELECT
            id_talent,
            realname,
            email,
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
            finance.billing AS billing JOIN hiring.talent USING(id_talent) WHERE payment_status IS NULL) as billing WHERE maturity IN ('3', '5', '7', '14', '21')
        `, [], 'arkademy').then(result => {
            // console.log(result)
            return resolve(result.rows)
        }).catch(error => {
            return reject(error)
        })
    })
}

const insertEmailData = ({
    id_email,
    id_billing,
    to,
    from,
    content
}) => {
    return new Promise((resolve, reject) => {
        query(`INSERT INTO ark_email.email_billing (id_email, id_billing, receiver, sender, content) VALUES($1, $2, $3, $4, $5)`, [id_email, id_billing, to, from, content], 'arkademy').then(result => {
            console.log(result.rowCount)
            return resolve()
        }).catch(err => {
            console.log(err)
            return reject(err)
        })
    })
}

module.exports = exp