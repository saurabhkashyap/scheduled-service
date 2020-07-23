const { aggregate } = require("../helpers/databases/mongodb")
const moment = require('moment')
const async = require('async')
const { addISAQueue, addBillingQueue } = require("../helpers/scheduleTask")
const { query } = require("../helpers/databases/postgresql")
const { sent } = require("../helpers/email")

const exp = {}

exp.sentReminderByDateFromDatabase = async (data) => {
    const datas = await aggregate('reminder', {}, 'arkademy').then(result => {
        result
    })

    const monthYear = moment().format('YYYY-MM')

    const q = async.queue((task) => {
        let firstDate = 23
        if (datas.length > 0) {
            if (datas.listReminder > 0) {
                firstDate = datas.listReminder[0].data
            }
        }

        const dataPreferenceUser = await query(`SELECT * FROM (finance.billing WHERE id_camp_register = $1) AS Billing JOIN finance.payment_preference USING(id_billing)`, [task.id_camp_register], 'arkademy').then(result => {
            return result.rows
        }).catch(error => {
            console.log(error)
            return 'error'
        })

        if (dataPreferenceUser !== 'error') {
            await query(`SELECT * FROM (finance.billing WHERE id_camp_register = $1) AS Billing JOIN finance.payment_preference USING(id_billing) JOIN finance.history_payment AS HP USING(id_preference) WHERE hp.created_at >= '${monthYear}-${firstDate}' AND created_at <= '${moment('${monthYear}-${firstDate}').add(1, 'month')}'`, [task.id_camp_register], 'arkademy').then(result => {
                if (result.rowCount > 0) {
                    const content = emailRemainder(dataPreferenceUser)
                    sent('Arkademy Finance <finance@arkademy.com>', 'Reminder - Pembayaran Income Sharing Arkademy', task.email, content)
                } else {
    
                }
            }).catch(error => {
                console.log(error)
            })
        }
    }, 10)

    q.drain(() => {
        console.log('Sent Reminder Today All Done')
    })

    q.push(data)
}

exp.setNewReminderByDate = async () => {
    const data = await aggregate('reminder', {}, 'arkademy').then(result => {
        result
    })

    if (data.length > 0) {
        const hours = moment(data[0].reminderTime).format('HH:MM:SS')
        const monthYear = moment().format('YYYY-MM')
        const startDate = `${monthYear}-${data.listReminder[0].date}`
        const endMonth = moment(startDate).add(30, 'days').format('YYYY-MM-DD')

        const dataList = await query(`SELECT 
            (
                SELECT 
                    email
                FROM 
                    hiring.talent 
                WHERE 
                    id_talent = CR.id_user
            ),
            (
                SELECT 
                    fullname 
                FROM 
                    hiring.talent 
                WHERE 
                    id_talent = CR.id_user
                ) AS fullname, 
                batch,
                name,
                pay_day,
                monthly_bill,
                CR.id_camp_register
            FROM
            bootcamp.camp_register AS CR 
            JOIN bootcamp.round USING(id_round) 
            JOIN bootcamp.batch USING(id_batch) 
            JOIN bootcamp.track USING(id_track)
            JOIN finance.billing USING(id_camp_register) 
            JOIN finance.payment_preference USING(id_billing) 
            LEFT JOIN (
            SELECT 
            * 
            FROM 
            finance.history_payment 
            WHERE 
            created_at >= '${startDate}' AND created_at <= '${endMonth}'`).then(result => {
            return result.rows
        }).catch(error => {
            console.error(error)
        })
        const q = async.queue((task) => {
            if (moment(startDate).format('DD') > task.date) {
                addISAQueue('ISAPaymentReminder', JSON.stringify(dataList), moment(`${monthYear}-${task.date} ${hours}`).add(1, 'month').valueOf())
            } else {
                addISAQueue('ISAPaymentReminder', JSON.stringify(dataList), moment(`${monthYear}-${task.date} ${hours}`).valueOf())
            }
        }, 5)

        q.drain(() => {
            console.log('Done All Set')
            const dateForNewSetReminder = listReminder[data.listReminder - 1].date
            addISAQueue('TimeForSetNewISAReminder', '', moment(`${monthYear}-${task.date} ${dateForNewSetReminder}`).valueOf())

            return true
        })

        q.push(data.listReminder)
    } else {
        return null
    }
}

const emailRemainder = (dataPreferenceUser) => {
    const listPayment = ``
    dataPreferenceUser.forEach(data => {
        if (data.bank === 'BCA') {
            listPayment += `
            <tr>
                <td>
                <br>
                <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/logo/bca.png" alt="">
                </td>
                <td>
                <p class="text-silver">
                    BCA Virtual Account
                </p>
                <p>
                    <b>${data.account_number}</b>
                </p>
                </td>
            </tr>`
        }

        if (data.bank === 'MANDIRI') {
            listPayment += `
            <tr>
                <td>
                <br>
                <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/logo/mandiri.png" alt="">
                </td>
                <td>
                <p class="text-silver">
                    Mandiri Virtual Account
                </p>
                <p>
                    <b>${data.account_number}</b>
                </p>
                </td>
            </tr>`
        }

        if (data.bank === 'BNI') {
            listPayment += `
            <tr>
                <td>
                <br>
                <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/logo/bni.png" alt="">
                </td>
                <td>
                <p class="text-silver">
                    BNI Virtual Account
                </p>
                <p>
                    <b>${data.account_number}</b>
                </p>
                </td>
            </tr>`
        }
    })

    return `<!doctype html>
    <html>
    
    <head>
      <meta name="viewport" content="width=device-width" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="x-apple-disable-message-reformatting">
      <title>Arkademy</title>
      <style lang="">
        body {
          background-color: #FFFFFF;
          font-family: "Poppins", sans-serif;
          -webkit-font-smoothing: antialiased;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          -ms-text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
        }
    
        table {
          border-collapse: separate;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
          width: 100%;
        }
    
        table td {
          font-family: "Poppins", sans-serif;
          font-size: 14px;
          vertical-align: top;
        }
    
        .body {
          background-color: #FFFFFF;
          width: 100%;
        }
    
        .container {
          display: block;
          margin: 0 auto !important;
          max-width: 600px;
          padding: 10px;
          width: 600px;
        }
    
        .main {
          background: #ffffff;
          border-radius: 20px 20px 0px 0px;
          width: 100%;
          border: 2px solid #F0F0F0;
          padding: 48px;
        }
    
        .align-center {
          text-align: center;
        }
    
        .align-right {
          text-align: right;
        }
    
        .align-left {
          text-align: left;
        }
    
        .logo {
          margin-top: 20px;
          height: 44px;
        }
    
        .text-primary {
          color: #F47E00 !important;
        }
    
        .text-grey {
          color: #8C8C8C !important;
        }
    
        .text-silver {
          color: #BFBFBF !important;
        }
    
        .text-light {
          font-weight: 400 !important;
        }
    
        h1, h2, h3, h4, h5, h6, p {
          color: #434343;
        }
        
        hr {
          border: 1px solid #F0F0F0;
        }
        
        a {
          text-decoration: none;
        }
    
        .button {
          padding: 12px;
          background: grey;
          color: white;
          border-radius: 4px;
          font-weight: 600;
          text-align: center !important;
        }
    
        .button--primary {
          color: white !important;
          background: #F47E00 !important;
        }
    
        .button--block {
          display: block !important;
        }
    
        .footer {
          margin-top: 8px;
        }
    
        .footer__information {
          width: 100%;
          background: #F0F0F0;
          border-radius: 0px 0px 24px 24px;
          padding: 24px 25%;
        }
    
        .footer__bottom-text {
          font-size: 12px;
          line-height: 18px;
          text-align: center;
          color: #8C8C8C;
        }
    
        @media (max-width: 620px) {
          table[class=body] h1 {
            font-size: 28px !important;
            margin-bottom: 10px !important;
          }
    
          table[class=body] p,
          table[class=body] ul,
          table[class=body] ol,
          table[class=body] td,
          table[class=body] span,
          table[class=body] a {
            font-size: 16px !important;
          }
    
          table[class=body] .wrapper {
            padding: 10px !important;
          }
    
          table[class=body] .wrap-content {
            padding: 0 !important;
          }
    
          table[class=body] .container {
            padding: 0 !important;
            width: 100% !important;
          }
    
          table[class=body] .main {
            border-left-width: 0 !important;
            border-radius: 0 !important;
            border-right-width: 0 !important;
          }
    
          .footer__information {
            padding: 24px 15%;
          }
        }
    
        /* devanagari */
        @font-face {
          font-family: "Poppins";
          font-style: normal;
          font-weight: 400;
          src: local("Poppins Regular"), local("Poppins-Regular"), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJbecmNE.woff2) format("woff2");
          unicode-range: U+0900-097F, U+1CD0-1CF6, U+1CF8-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FB;
        }
    
        /* latin-ext */
        @font-face {
          font-family: "Poppins";
          font-style: normal;
          font-weight: 400;
          src: local("Poppins Regular"), local("Poppins-Regular"), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJnecmNE.woff2) format("woff2");
          unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
        }
    
        /* latin */
        @font-face {
          font-family: "Poppins";
          font-style: normal;
          font-weight: 400;
          src: local("Poppins Regular"), local("Poppins-Regular"), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJfecg.woff2) format("woff2");
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }
      </style>
    </head>
    
    <body class="">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
        <tr>
          <td class="container">
            <table role="presentation" class="main">
              <tr>
                <td class="wrapper">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <img src="https://drive.google.com/uc?id=1yhtjdJYpJWzlzaHvPn3TmigoWio6xGBW" class="logo" />
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <br>
                        <div>
                          <h2>
                            Halo, Dwi Nugroho
                          </h2>
                          <h3 class="text-light">
                            Jangan lupa membayar cicilan <i>“Income Sharing”</i> ke Arkademy.
                          </h3>
                        </div>
                        <br>
                        <p>
                          Yuk segera penuhi kewajiban kamu dengan mentransfer ke..
                        </p>
                        <p class="text-silver">
                          Rekening Atas Nama
                        </p>
                        <p>
                          <b>XENDIT</b>
                        </p>
                        <br>
                        <hr>
                        <br>
                        <h3>
                          Bayar Dengan
                        </h3>
                        <table cellpadding="2">
                          ${listPayment}
                        </table>
                        <br>
                        <hr>
                        <br>
                        <p>
                          Klik button dibawah untuk mengirim bukti transfer dan jangan lupa tulis nama lengkapmu di bukti transfer.
                        </p>
                        <br>
                        <a href="#" class="button button--primary button--block">
                          Kirim Bukti Transfer
                        </a>
                        <br>
                        <p class="text-silver">
                          Catatan: Abaikan jika sudah membayar :)
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table role="presentation" class="footer" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td class="footer__information">
                  <table>
                    <tr>
                      <td class="align-center">
                        <a href="https://www.arkademy.com" class="text-grey">
                          Arkademy
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://api.whatsapp.com/send?phone=628111848182" class="text-grey">
                          Bantuan
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://api.whatsapp.com/send?phone=628111848182" class="text-grey">
                          Kontak Kami
                        </a>
                      </td>
                    </tr>
                  </table>
                  <table style="margin-top: 8px;">
                    <tr>
                      <td class="align-center">
                        <a href="https://www.youtube.com/arkademy">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-youtube.png">
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://web.facebook.com/arkademycom/?_rdc=1&_rdr">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-facebook.png">
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://www.instagram.com/arkademy/">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-instagram.png">
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://api.whatsapp.com/send?phone=628111848182">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-whatsapp.png">
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <p class="footer__bottom-text">
                    Jika kamu memiliki pertanyaan, jangan ragu untuk mengirim pesan kepada kami di <b>hello@arkademy.com</b>
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td>&nbsp;</td>
        </tr>
      </table>
    </body>
    
    </html>`
}

exp.setNewBillingQueue = async () => {

    const data = await aggregate('reminder', {}, 'arkademy').then(result => {
        result
    })

    if (data.length > 0) {
        const hours = moment(data[0].billingTime).format('HH:MM:SS')
        const groupingListPayDay = await query(`SELECT pay_day FROM finance.billing GROUP BY 1`, [], 'arkademy').then(result => {
            return result.rows
        }).catch(error => {
            console.log(error)
            return 'error'
        })
    
        const q = async.queue((task) => {
            addBillingQueue('BillingPaymentReminder', JSON.stringify(task), moment(`${moment().format('YYYY-MM')}-${task.pay_day} ${hours}`).valueOf())
        })
    
        q.drain(() => {
            console.log('ALL DONE')
        })
    
        q.push(groupingListPayDay)
    }
}

exp.sentEmailBillingByPayDay = async (data) => {
    await query(`SELECT
    CR.id_camp_register,
    (SELECT email FROM users WHERE id_user = CR.id_user),
    (SELECT monthly_bill FROM camp_duration WHERE id_camp_duration = CR.id_camp_duration),
    monthly_bill AS new_monthly_bill,
    (SELECT * FROM bootcamp.talent_history WHERE id_camp_register = CR.id_camp_register ORDER BY created_at DESC LIMIT 1)
    FROM bootcamp.camp_register AS CR JOIN finance.billing USING(id_camp_register) WHERE pay_day = $1`, [data.pay_day], 'arkademy').then(result => {
        const q = async.queue((task) => {
            const dataPreferenceUser = await query(`SELECT * FROM (finance.billing WHERE id_camp_register = $1) AS Billing JOIN finance.payment_preference USING(id_billing)`, [task.id_camp_register], 'arkademy').then(result => {
                return result.rows
            }).catch(error => {
                console.log(error)
                return 'error'
            })

            let montlyBill = task.monthly_bill

            if (task.new_monthly_bill !== null) {
                montlyBill = task.monthly_bill
            }
            const content = emailBilling(montlyBill, 'random ntar aja', dataPreferenceUser)

            sent('Finance Arkademy <finance@arkademy.com>', task.email, 'Income Sharing Agreement', content)
        })

        q.drain(() => {
            console.log('SENT BILLING TODAY ALL DONE')
        })

        q.push(result.rows)
    }).catch(error => {
        console.log(error)
    })
}

const emailBilling = (monthlyBill, id_billing, dataPreferenceUser, fullname) => {
    const listPayment = ``
    dataPreferenceUser.forEach(data => {
        if (data.bank === 'BCA') {
            listPayment += `
            <tr>
                <td>
                <br>
                <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/logo/bca.png" alt="">
                </td>
                <td>
                <p class="text-silver">
                    BCA Virtual Account
                </p>
                <p>
                    <b>${data.account_number}</b>
                </p>
                </td>
            </tr>`
        }

        if (data.bank === 'MANDIRI') {
            listPayment += `
            <tr>
                <td>
                <br>
                <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/logo/mandiri.png" alt="">
                </td>
                <td>
                <p class="text-silver">
                    Mandiri Virtual Account
                </p>
                <p>
                    <b>${data.account_number}</b>
                </p>
                </td>
            </tr>`
        }

        if (data.bank === 'BNI') {
            listPayment += `
            <tr>
                <td>
                <br>
                <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/logo/bni.png" alt="">
                </td>
                <td>
                <p class="text-silver">
                    BNI Virtual Account
                </p>
                <p>
                    <b>${data.account_number}</b>
                </p>
                </td>
            </tr>`
        }
    })
    return `<!doctype html>
    <html>
    
    <head>
      <meta name="viewport" content="width=device-width" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="x-apple-disable-message-reformatting">
      <title>Arkademy</title>
      <style lang="">
        body {
          background-color: #FFFFFF;
          font-family: "Poppins", sans-serif;
          -webkit-font-smoothing: antialiased;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          -ms-text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
        }
    
        table {
          border-collapse: separate;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
          width: 100%;
        }
    
        table td {
          font-family: "Poppins", sans-serif;
          font-size: 14px;
          vertical-align: top;
        }
    
        .body {
          background-color: #FFFFFF;
          width: 100%;
        }
    
        .container {
          display: block;
          margin: 0 auto !important;
          max-width: 600px;
          padding: 10px;
          width: 600px;
        }
    
        .main {
          background: #ffffff;
          border-radius: 20px 20px 0px 0px;
          width: 100%;
          border: 2px solid #F0F0F0;
          padding: 48px;
        }
    
        .align-center {
          text-align: center;
        }
    
        .align-right {
          text-align: right;
        }
    
        .align-left {
          text-align: left;
        }
    
        .logo {
          margin-top: 20px;
          height: 44px;
        }
    
        .text-primary {
          color: #F47E00 !important;
        }
    
        .text-grey {
          color: #8C8C8C !important;
        }
    
        .text-silver {
          color: #BFBFBF !important;
        }
    
        .text-light {
          font-weight: 400 !important;
        }
    
        h1, h2, h3, h4, h5, h6, p {
          color: #434343;
        }
        
        hr {
          border: 1px solid #F0F0F0;
        }
        
        a {
          text-decoration: none;
        }
    
        .button {
          padding: 12px;
          background: grey;
          color: white;
          border-radius: 4px;
          font-weight: 600;
          text-align: center !important;
        }
    
        .button--primary {
          color: white !important;
          background: #F47E00 !important;
        }
    
        .button--block {
          display: block !important;
        }
    
        .footer {
          margin-top: 8px;
        }
    
        .footer__information {
          width: 100%;
          background: #F0F0F0;
          border-radius: 0px 0px 24px 24px;
          padding: 24px 25%;
        }
    
        .footer__bottom-text {
          font-size: 12px;
          line-height: 18px;
          text-align: center;
          color: #8C8C8C;
        }
    
        @media (max-width: 620px) {
          table[class=body] h1 {
            font-size: 28px !important;
            margin-bottom: 10px !important;
          }
    
          table[class=body] p,
          table[class=body] ul,
          table[class=body] ol,
          table[class=body] td,
          table[class=body] span,
          table[class=body] a {
            font-size: 16px !important;
          }
    
          table[class=body] .wrapper {
            padding: 10px !important;
          }
    
          table[class=body] .wrap-content {
            padding: 0 !important;
          }
    
          table[class=body] .container {
            padding: 0 !important;
            width: 100% !important;
          }
    
          table[class=body] .main {
            border-left-width: 0 !important;
            border-radius: 0 !important;
            border-right-width: 0 !important;
          }
    
          .footer__information {
            padding: 24px 15%;
          }
        }
    
        /* devanagari */
        @font-face {
          font-family: "Poppins";
          font-style: normal;
          font-weight: 400;
          src: local("Poppins Regular"), local("Poppins-Regular"), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJbecmNE.woff2) format("woff2");
          unicode-range: U+0900-097F, U+1CD0-1CF6, U+1CF8-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FB;
        }
    
        /* latin-ext */
        @font-face {
          font-family: "Poppins";
          font-style: normal;
          font-weight: 400;
          src: local("Poppins Regular"), local("Poppins-Regular"), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJnecmNE.woff2) format("woff2");
          unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
        }
    
        /* latin */
        @font-face {
          font-family: "Poppins";
          font-style: normal;
          font-weight: 400;
          src: local("Poppins Regular"), local("Poppins-Regular"), url(https://fonts.gstatic.com/s/poppins/v9/pxiEyp8kv8JHgFVrJJfecg.woff2) format("woff2");
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }
      </style>
    </head>
    
    <body class="">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
        <tr>
          <td class="container">
            <table role="presentation" class="main">
              <tr>
                <td class="wrapper">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <img src="https://drive.google.com/uc?id=1yhtjdJYpJWzlzaHvPn3TmigoWio6xGBW" class="logo" />
                      </td>
                    </tr>
                    <tr>
                      <td class="content">
                        <br>
                        <div>
                          <h2>
                            Halo, ${fullname}
                          </h2>
                          <h2 class="text-light">
                            Berikut tagihan <i>“Income Sharing Arkademy”</i> bulan Desember 2020.
                          </h2>
                        </div>
                        <br>
                        <table cellpadding="2">
                          <tr>
                            <td>
                              <p class="text-silver">
                                Total Tagihan
                              </p>
                              <p>
                                <b>Rp. ${monthlyBill}</b>
                              </p>
                            </td>
                            <td>
                              <p class="text-silver">
                                Nomor Tagihan
                              </p>
                              <p>
                                <b>${id_billing}</b>
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <p class="text-silver">
                                Tanggal Tagihan
                              </p>
                              <p>
                                <b>${moment().format('DD MMMM YYYY')}</b>
                              </p>
                            </td>
                            <td>
                              <p class="text-silver">
                                Tanggal Jatuh Tempo
                              </p>
                              <p>
                                <b>${moment().add(1, 'month').format('DD MMMM YYYY')}</b>
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <p class="text-silver">
                                Rekening Atas Nama
                              </p>
                              <p>
                                <b>XENDIT</b>
                              </p>
                            </td>
                            <td>
                              
                            </td>
                          </tr>
                        </table>
                        <br>
                        <hr>
                        <br>
                        <h3>
                          Rincian Tagihan
                        </h3>
                        <table cellpadding="2">
                          <tr>
                            <td>
                              <p class="text-silver">
                                Deskripsi
                              </p>
                              <p>
                                Fee Penyaluran Talent Trya (Desember 2020)
                              </p>
                            </td>
                            <td>
                              <p class="text-silver">
                                Total
                              </p>
                              <p>
                                <b>Rp ${monthlyBill}</b>
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              
                            </td>
                            <td>
                              <hr>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <p class="text-silver">
                                Subtotal
                              </p>
                            </td>
                            <td>
                              <p>
                                <b>Rp ${monthlyBill}</b>
                              </p>
                            </td>
                          </tr>
                        </table>
                        <br>
                        <hr>
                        <br>
                        <h3>
                          Bayar Dengan
                        </h3>
                        <table cellpadding="2">
                          ${listPayment}
                        </table>
                        <br>
                        <hr>
                        <br>
                        <p>
                          Klik button dibawah untuk mengirim bukti transfer dan jangan lupa tulis nama lengkapmu di bukti transfer.
                        </p>
                        <br>
                        <a href="#" class="button button--primary button--block">
                          Kirim Bukti Transfer
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table role="presentation" class="footer" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td class="footer__information">
                  <table>
                    <tr>
                      <td class="align-center">
                        <a href="https://www.arkademy.com" class="text-grey">
                          Arkademy
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://api.whatsapp.com/send?phone=628111848182" class="text-grey">
                          Bantuan
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://api.whatsapp.com/send?phone=628111848182" class="text-grey">
                          Kontak Kami
                        </a>
                      </td>
                    </tr>
                  </table>
                  <table style="margin-top: 8px;">
                    <tr>
                      <td class="align-center">
                        <a href="https://www.youtube.com/arkademy">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-youtube.png">
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://web.facebook.com/arkademycom/?_rdc=1&_rdr">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-facebook.png">
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://www.instagram.com/arkademy/">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-instagram.png">
                        </a>
                      </td>
                      <td class="align-center">
                        <a href="https://api.whatsapp.com/send?phone=628111848182">
                          <img src="https://email-arkademy.s3-ap-southeast-1.amazonaws.com/icon/ark-whatsapp.png">
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <p class="footer__bottom-text">
                    Jika kamu memiliki pertanyaan, jangan ragu untuk mengirim pesan kepada kami di <b>hello@arkademy.com</b>
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td>&nbsp;</td>
        </tr>
      </table>
    </body>
    
    </html>`
}

module.exports = exp