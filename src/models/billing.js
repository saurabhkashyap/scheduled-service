const { query } = require('../../libraries/databases/postgresql')
const async = require('async')
const moment = require('moment')
const randomstring = require("randomstring");
const key = 'xnd_development_6yh1I7fleLkgXGDenQgwuJPgS3qt5hkcJWAr49xI4M1yUeRCdok3HDazlLut8Fy';

const exp = {}

const Xendit = require('xendit-node');
const x = new Xendit({
  secretKey: key,
})

const { Invoice } = x;
const invoiceSpecificOptions = {};
const i = new Invoice(invoiceSpecificOptions);

exp.initiateNewBilling = async () => {
    const listTalent = await query(`SELECT * FROM hiring.talent where status_talent IN ('work', 'pay cut')`, [], 'arkademy').then(result => {
        return result.rows
    })

    let q = async.queue(async (task) => {
        const random = randomstring.generate(5)
        const idBilling = `INV/${task.batch}/${random}/${moment().format('MM')}/${moment().format('YYYY')}`
        checkTalentBilling(task.pay_day).then(result => {
            checkLastHistoryPaymentISATalent(task.id_talent).then(result => {
                insertToDatabase(idBilling, task.id_talent, task.monthly_bill, `${monthYear}-${pay_day}`, moment(`${monthYear}-${pay_day}`).add(30, 'days')).then(result => {

                }).catch(error => {

                })
            }).catch(error => {

            })
        }).catch(error => {

        })
    })

    q.drain(() => {
        console.log('All Done for Scheduling')
    })

    q.push(listTalent)
}

const checkTalentBilling = (pay_day) => {
    const monthYear = moment().format('YYYY-MM')
    return new Promise((resolve, reject) => {
        await query(`SELECT * FROM finance.billing WHERE id_talent = ${task.id_talent} AND billed_on LIKE '%${monthYear}-${pay_day}%'`, [], 'arkademy').then(result => {
            if (result.rowCount > 0) {
                return reject()
            }
            return resolve()
        }).catch(error => {
            console.log(error)
            return reject(error)
        })
    })
}

const checkLastHistoryPaymentISATalent = (id_talent) => {
    return new Promise((resolve, reject) => {
        await query(`SELECT * FROM finance.billing WHERE id_talent = $1 AND payment_status = 'success'`, [id_talent], 'arkademy').then(result => {
            return resolve(result.rowCount)
        }).catch(error => {
            console.log(error)
            return reject(error)
        })
    })
} 

const createInvoice = (id_invoice, email_talent, count_isa, name, amount) => {
    return new Promise((resolve, reject) => {
        i.createInvoice({
            externalID: id_invoice,
            payerEmail: email_talent,
            description: `Pembayaran ISA ke ${count_isa} a/n ${name}`,
            amount: amount,
            shouldSendEmail: true,
            invoiceDuration: 2592000
        }).then(({ id }) => {
            i.getInvoice({
                invoiceID: id
            }).then(result => {
                return resolve(result)
            })
        }).catch(error => {
            return reject(error)
        });
    })
}

const insertToDatabase = (id_billing, id_talent, amount, billed_on, due_date) => {
    return new Promise((resolve, reject) => {
        await query(`INSERT INTO finance.billing (id_billing, id_talent, amount, billed_on, due_date)`, [id_billing, id_talent, amount, billed_on, due_date], 'arkademy').then(result => {
            return resolve()
        }).catch(error => {
            return reject(error)
        })
    })
}

module.exports = exp