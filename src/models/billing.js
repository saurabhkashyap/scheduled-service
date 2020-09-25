const exp = {}

const moment = require('moment')
const async = require('async')
const cryptoRandomString = require('crypto-random-string')

const { query } = require('../helpers/databases/postgresql')

const Xendit = require('xendit-node')
const { emailBilling } = require('./email')
const { sent } = require('../helpers/email')

const x = new Xendit({
    // secretKey: 'xnd_development_5pHeCBV0Bf4YyfllOQih43OcUwcEwB3Fdwcmlsv9Epa36j5rtbYCsuFqKgFI1ur'
    secretKey: process.env.XENDIT_KEY
})

const { Invoice } = x;
const invoiceSpecificOptions = {};
const i = new Invoice(invoiceSpecificOptions);


exp.runSentBillingToday = () => {
    return new Promise(async (resolve, reject) => {
        console.log('Starting')
        const dataTalent = await query(`SELECT * FROM (SELECT *, (SELECT batch FROM bootcamp.batch WHERE id_batch = talent.id_batch) AS real_batch FROM hiring.talent WHERE  status_talent = 'work' AND status_payment IN ('active', 'paycut')) AS data WHERE real_batch IN ('8', '9')`, [], 'arkademy').then(result => {
            return result.rows
        }).catch(error => {
            return reject(error)
        })

        let queue = async.queue(async (task) => {
            const randomCode = cryptoRandomString({length: 10})
            const idBilling = `INV/${task.real_batch}/${randomCode}/${moment().format('MM')}/${moment().format('YYYY')}`

            let monthlyBill = 0
            if (task.status_payment === 'paycut') {
                monthlyBill = await getMonthlyPayCutLastHistory(task.id_talent)
            } else {
                monthlyBill = await getMonthlyBillByCampDuration(task.id_camp_duration)
                
            }

            console.log(monthlyBill)

            let dataInvoice = null

            if (monthlyBill !== 0) {
                dataInvoice = await createInvoice(idBilling, task.email, monthlyBill, task.realname)
            }

            if (dataInvoice !== null) {
                console.log('Run Generate Email')
                await insertDataBillingToInvoice(idBilling, monthlyBill, task.id_talent, dataInvoice, dataInvoice.created).then(async result => {
                    console.log('Generate Email')
                    const email = emailBilling({
                        id_billing: idBilling,
                        fullname: task.realname,
                        amount: monthlyBill,
                        monthYear: moment().format('MMMM YYYY'),
                        billed_on: moment(dataInvoice.created).format('DD MMMM YYYY'),
                        due_date: moment(dataInvoice.expiry_date).format('DD MMMM YYYY'),
                        list_bank: dataInvoice.available_banks,
                        invoice_url: dataInvoice.invoice_url
                    })
                    console.log('Sent Email')
                    const dataEmail = await sent('Finance Arkademy <finance@arkademy.com>', [task.email], `Income Sharing Agreement (Tagihan Tanggal: ${moment().format('DD MMMM YYYY')})`, email)
                    console.log('record email')
                    await insertEmailData({
                        id_email: dataEmail.id_email,
                        id_billing: idBilling,
                        to: task.email,
                        from: 'Finance Arkademy <finance@arkademy.com>',
                        content: email
                    })
                }).catch(error => {
                    
                })
            }
        }, 3)

        queue.drain(() => {
            return resolve()
        })

        queue.push(dataTalent)
    })
}

const getMonthlyPayCutLastHistory = (id_talent) => {
    return new Promise((resolve, reject) => {
        query(`SELECT * FROM hiring.talent_histories WHERE id_talent = $1 AND status = 'paycut' ORDER BY created_at DESC`, [id_talent], 'arkademy').then((result) => {
            if (result.rowCount > 0) {
                try {
                    return resolve(result.rows[0].information.new_monthly_bill)
                } catch (error) {
                    return resolve(null)
                }    
            }
            return resolve(null)
        }).catch(error => {
            return resolve(null)
        })
    })
}

const getMonthlyBillByCampDuration = (id_camp_duration) => {
    return new Promise((resolve, reject) => {
        query(`SELECT monthly_bill::money::numeric::float8 FROM bootcamp.camp_duration WHERE id_camp_duration = $1`, [id_camp_duration], 'arkademy').then((result) => {
            if (result.rowCount > 0) {
                return resolve(result.rows[0].monthly_bill)
            }
            return resolve(null)
        }).catch(error => {
            return resolve(null)
        })
    })
}

const createInvoice = (id_billing, email_talent, amount, fullname) => {
    return new Promise((resolve, reject) => {
        i.createInvoice({
            externalID: id_billing,
            payerEmail: email_talent,
            description: `Income Sharing Agreement (Tagihan Tanggal: ${moment().format('DD MMMM YYYY')}) a/n ${fullname}`,
            amount: amount,
            invoiceDuration: 2592000
        }).then(({ id }) => {
            i.getInvoice({
                invoiceID: id
            }).then(result => {
                return resolve(result)
            })
        }).catch(error => {
            return resolve(null)
        });
    })
}

const insertDataBillingToInvoice = (id_billing, amount, id_talent, payment_information, billed_on) => {
    return new Promise((resolve, reject) => {
        // console.log([id_billing, amount, id_talent, payment_information])
        query(`INSERT INTO finance.billing (id_billing, amount, billed_on, id_talent, payment_information) VALUES($1, $2, $3, $4, $5)`, [id_billing, amount, billed_on, id_talent, payment_information], 'arkademy')
        .then((result) => {
            if (result.rowCount > 0) {
                return resolve(null)
            }

            return reject()
        }).catch(error => {
            console.log(error)
            return reject()
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