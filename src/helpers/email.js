const exp = {}

const request = require('request')
const { ClientBase } = require('pg')
require('dotenv').config()

exp.sent = (from, to, subject, content) => {
    return new Promise((resolve, reject) => {
        console.log(process.env.URL_EMAIL)
        request.post(`http://${process.env.URL_EMAIL}/email/custom`, {
            json: {
                to: to,
                from: from,
                subject: subject,
                html: Buffer.from(content).toString('base64')
            }
        }, (err, result, body) => {
            if (err !== null) {
                return reject(err)
            }

            console.log(body[0])
            return resolve({
                id_email: body[0].meta.messageId,
                email: body,
                content: content
            })
        })
    })
}

module.exports = exp