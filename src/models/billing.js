const { query } = require('../helpers/databases/postgresql')
const async = require('async')
const moment = require('moment')
const randomstring = require("randomstring");
const key = 'xnd_development_6yh1I7fleLkgXGDenQgwuJPgS3qt5hkcJWAr49xI4M1yUeRCdok3HDazlLut8Fy';
const scheduleTask = require('../helpers/scheduleTask')

const exp = {}

const Xendit = require('xendit-node');
const x = new Xendit({
  secretKey: key,
})

const { Invoice } = x;
const invoiceSpecificOptions = {};
const i = new Invoice(invoiceSpecificOptions);

exp.initiateNewBilling = async () => {
    const listTalent = await query(`SELECT *, (
        SELECT monthly_bill::money::numeric::float8 FROM bootcamp.camp_duration WHERE id_camp_duration = t.id_camp_duration
    ) FROM hiring.talent AS t where status_talent IN ('work', 'pay cut') AND email = 'agungwar00@gmail.com'`, [], 'arkademy').then(result => {
        return result.rows
    }).catch(error => {
        // console.log(error)
    })

    let q = async.queue(async (task) => {
        const random = randomstring.generate(5)
        const monthYear = moment().format('YYYY-MM')
        const idBilling = `INV/${task.batch}/${random}/${moment().format('MM')}/${moment().format('YYYY')}`
        checkTalentBilling(task.id_talent, task.pay_day).then(result => {
            insertToDatabase(idBilling, task.id_talent, task.monthly_bill, `${monthYear}-${task.pay_day}`, moment(`${monthYear}-${task.pay_day}`).add(30, 'days')).then(result => {
                // scheduleTask.billingQueue.add(result, {
                //     delay: moment(`${monthYear}-${task.pay_day} 10:00:00`).valueOf() - moment().valueOf()
                // })
                scheduleTask.billingQueue.add(result, {
                    delay: 2000
                })
            }).catch(error => {
                console.log(error)
            })
        }).catch(error => {
            // console.log(error)
        })
    })

    q.drain(() => {
        console.log('All Done for Scheduling')
    })

    q.push(listTalent)
}

const checkTalentBilling = (id_talent, pay_day) => {
    const monthYear = moment().format('YYYY-MM')
    return new Promise(async (resolve, reject) => {
        await query(`SELECT * FROM finance.billing WHERE id_talent = ${id_talent} AND billed_on::text LIKE '%${monthYear}-${pay_day}%'`, [], 'arkademy').then(result => {
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

exp.createInvoice = ({id_billing, id_talent, amount, billed_on, due_date}) => {
    return new Promise(async (resolve, reject) => {
        const datalTalent = await query(`SELECT email, realname FROM hiring.talent WHERE id_talent = $1`, [id_talent], 'arkademy').then(result => {
            if (result.rowCount > 0) {
                return {
                    email: result.rows[0].email,
                    realname: result.rows[0].realname
                }
            }
        }).catch(error => {
            reject(error)
        })

        const countISABilling = await query(`SELECT count(*) FROM finance.billing WHERE id_talent = $1 AND id_billing != $2`, [id_talent, id_billing], 'arkademy').then(result => {
            return result.rowCount
        }).catch(error => {
            reject(error)
        })

        i.createInvoice({
            externalID: id_billing,
            payerEmail: datalTalent.email,
            description: `Pembayaran ISA ke ${countISABilling+1} a/n ${datalTalent.realname}`,
            amount: amount,
            // shouldSendEmail: true,
            invoiceDuration: 2592000
        }).then(({ id }) => {
            i.getInvoice({
                invoiceID: id
            }).then(result_inv => {
                updateBillingInformation(id_billing, result_inv).then(result => {
                    result_inv.realname = datalTalent.realname
                    return resolve(result_inv)
                }).catch(error => {
                    return reject(error)
                })
            }).catch(error => {
                
                reject(error)
            })
        }).catch(error => {
            console.log('error create invoice',error)
            return reject(error)
        });
    })
}

const insertToDatabase = (id_billing, id_talent, amount, billed_on, due_date) => {
    return new Promise(async (resolve, reject) => {
        await query(`INSERT INTO finance.billing (id_billing, id_talent, amount, billed_on, due_date) VALUES($1, $2, $3, $4, $5) RETURNING id_billing, id_talent, amount::money::numeric::float8, billed_on, due_date`, [id_billing, id_talent, amount, billed_on, due_date], 'arkademy').then(result => {
            if (result.rowCount > 0) {
                return resolve(result.rows[0])
            }
            return reject()
        }).catch(error => {
            console.log('error on insert DB')
            return reject(error)
        })
    })
}

const updateBillingInformation = (id_billing, information, due_date) => {
    return new Promise(async (resolve, reject) => {
        await query(`UPDATE finance.billing SET payment_information = $1, due_date = $3 WHERE id_billing = $2`, [JSON.stringify(information), id_billing, due_date], 'arkademy').then(result => {
            if (result.rowCount > 0) {
                return resolve(result.rows[0])
            }
            return reject()
        }).catch(error => {
            console.log('ERROR WHEN UPDATE')
            return reject(error)
        })
    })
}

module.exports = exp