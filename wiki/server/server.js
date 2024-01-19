const util = require('node:util')
const express = require('express')
const logger = require('./logger.js')
const wiki = require('wikipedia')

const app = express()
const cors = require('cors')
const PORT = 4000
const bodyParser = require('body-parser')
const wikiApiUrl = 'https://en.wikipedia.org/w/api.php'

logger.info('start')

app.use(cors())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

app.listen(PORT, function () {
    logger.info('Server is running on Port: ' + PORT)
})

/**
 * /v1/status
 */
app.get('/v1/status', function (req, res) {
    const time = new Date().toISOString()
    logger.info('/status: time: %s', time)
    const data = JSON.stringify({ time: time, server: process.version })
    res.send(data)
})

/**
 * /v1/titles?phrase=Prague
 */
app.get('/v1/titles', function (req, res) {
    const queryJson = JSON.stringify(req.query)
    logger.info('/titles: req query: %s', queryJson)
    ;(async () => {
        try {
            logger.info('/titles: try to perform search...')
            const searchResults = await wiki.search(req.query.phrase)
            logger.info('/titles: got results: %s', Object.entries(searchResults.results).length)
            res.send(JSON.stringify(searchResults.results))
        } catch (error) {
            logger.info(error)
        }
    })()
})

/**
 * https://www.mediawiki.org/wiki/API:Search
 * /v1/list?phrase=Prague
 */
app.get('/v1/list', function (req, res) {
    const queryJson = JSON.stringify(req.query)
    logger.info('/list: req query: %s', queryJson)
    const searchPhrase = req.query.phrase
    logger.info('/list: search phrase: %s', searchPhrase)
    var params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: searchPhrase,
        format: 'json',
        srlimit: 1000,
    })
    fetch(`${wikiApiUrl}?${params}`)
        .then((response) => response.json())
        .then((response) => {
            logger.info('/list: got bytes: %s', JSON.stringify(response).length)
            res.send(response)
        })
        .catch((error) => {
            logger.info('/list: error', error)
        })
})

/**
 * https://www.mediawiki.org/wiki/API:Parsing_wikitext
 * /v1/page?id=5321
 */
app.get('/v1/page', function (req, res) {
    const queryJson = JSON.stringify(req.query)
    logger.info('/page: req query: %s', queryJson)
    const pageId = req.query.id
    var params = new URLSearchParams({
        format: 'json',
        action: 'query',
        prop: 'info',
        pageids: pageId,
        inprop: 'url',
    })
    fetch(`${wikiApiUrl}?${params}`)
        .then((response) => response.json())
        .then((json) => {
            logger.info('/page: got page by id: %s', pageId)
            logger.info(json)
            const fullurl = json.query.pages[pageId].fullurl
            const title = json.query.pages[pageId].title
            logger.info('/page: fullurl: %s', fullurl)
            logger.info('/page: title: %s', title)
            params = new URLSearchParams({
                action: 'parse',
                page: title,
                format: 'json',
            })
            fetch(`${wikiApiUrl}?${params}`)
                .then((response) => response.json())
                .then((json) => {
                    const text = json.parse.text['*']
                    logger.info('/page: original text length: %s', text.length)
                    const prefix = '<a target="wiki" href="https://en.wikipedia.org/'
                    const regex = /<a href="\//gi
                    const processed = text.replaceAll(regex, prefix)
                    logger.info('/page: processed text length: %s', processed.length)
                    res.send(processed)
                })
                .catch((error) => {
                    logger.error('/page: error: %s', error.message)
                })
        })
        .catch((error) => {
            logger.info('/page: error: %s', error)
        })
})
