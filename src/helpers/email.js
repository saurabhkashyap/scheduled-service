const exp = {}

const request = require('request')

exp.sent = (from, to, subject, content) => {
    return new Promise((resolve, reject) => {
        request.post(`http://127.0.0.1:8808/email/custom`, {
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
                email: body,
                content: content
            })
        })
    })
}

module.exports = exp