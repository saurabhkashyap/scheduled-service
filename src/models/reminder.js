const { query } = require("../helpers/databases/postgresql")
const async = require('async')

const exp = {}

exp.createReminderDate = () => {
    return new Promise(async (resolve, reject) => {
        const data = await query(`SELECT * FROM hiring.talent WHERE status_talent = 'work' AND status_payment IN ('active', 'paycut') AND status_payment != 'paid off' AND email = 'agungwar00@gmail.com'`, [
            
        ], 'arkademy').then(result => {
            return result.rows
        }).catch(error => {
            return null
        })

        const q = async.queue(async (task) => {
            const billing = await query(`SELECT * FROM finance.billing WHERE id_talent = $1 AND payment_status != 'Sattlement'`, [task.id_user], 'arkademy').then(result => {

            }).catch(error => {
                
            })

            const payment = await query(`SELECT`)
        })

        q.drain(() => {

        })

        q.push(data)
    })
}

module.exports = exp