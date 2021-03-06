const exp = {}

const request = require('request')
require('dotenv').config()

exp.sent = (from, to, subject, content) => {
    return new Promise((resolve, reject) => {
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
            return resolve({
                id_email: body[0].meta.messageId,
                email: body,
                content: content
            })
        })
    })
}

module.exports = exp