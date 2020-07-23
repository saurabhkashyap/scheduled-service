const exp = {}

exp.example = (req, res) => {
    res.json({
        error: 'error',
        result: 'ok'
    });
}

module.exports = exp;