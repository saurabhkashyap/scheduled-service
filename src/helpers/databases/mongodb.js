const mongoLibrary = {}
const mongodb = require('mongodb').MongoClient
const mongoUrl = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`

mongoLibrary.aggregate = (collection, option, database) => {
    return new Promise((resolve, reject) => {
        mongodb.connect(mongoUrl, (err, db) => {
            if (err) {
                return reject(err)
            }

            db.db(database).collection(collection).aggregate(option).toArray((err, result) => {
                db.close()
                if (err) {
                    return reject(err)
                } else {
                    return resolve(result)
                }
            })
        })
    })
}

mongoLibrary.insertOne = (collection, object, database) => {
    return new Promise((resolve, reject) => {
        mongodb.connect(mongoUrl, (err, db) => {
            if (err) {
                return reject(err)
            }

            db.db(database).collection(collection).insert(object, (err, result) => {
                db.close()
                if (err) {
                    return reject(err)
                } else {
                    return resolve(result)
                }
            })
        })
    })
}

mongoLibrary.updateOne = (collection, query, values, database) => {
    return new Promise((resolve, reject) => {
        mongodb.connect(mongoUrl, (err, db) => {
            if (err) {
                console.log(err)
                return reject(err)
            }

            db.db(database).collection(collection).updateMany(query, { $set: values }, {
                upsert: false
            }, (err, result) => {
                console.log(err)
                db.close()
                if (err) {
                    return reject(err)
                } else {
                    return resolve(result)
                }
            })
        })
    })
}

module.exports = mongoLibrary