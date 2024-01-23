const util = require('node:util')
const express = require('express')
const useragent = require('express-useragent')
const logger = require('./logger.js')
const wiki = require('wikipedia')
const compression = require('compression')
const cors = require('cors')
const bodyParser = require('body-parser')
let cache = require('./cache.js')

const BUILD = 'v0.05'
const PORT = 4000

const wikiApiUrl = 'https://en.wikipedia.org/w/api.php'
const wikiUrlForwardSlash = 'https://en.wikipedia.org/'

logger.info('start')

const app = express()
app.use(useragent.express())
app.use(compression())
app.use(cors())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

app.listen(PORT, () => {
    logger.info('server is running on port: %s', PORT)
})
logger.info('node version: %s', process.version)
/**
 * /v1/status
 */
app.get('/v1/status', (req, res) => {
    const time = new Date().toISOString()
    const userAgent = req.useragent
    const agent = userAgent.isMobile ? 'mobile' : userAgent.isDesktop ? 'desktop' : 'undefined'
    logger.info('/status: time: %s, user agent: %s', time, agent)
    const data = JSON.stringify({ server: process.version, build: BUILD })
    res.send(data)
})

const fullTextSearchParams = (phrase) =>
    new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: phrase,
        format: 'json',
        srlimit: 1000,
    })

/**
 * /v1/titles?phrase=Prague
 */
app.get('/v1/titles', async (req, res) => {
    logger.info('/titles: req query: %s', JSON.stringify(req.query))
    try {
        const phrase = req.query.phrase
        logger.info('/titles: try to perform search: phrase')
        const searchResults = await wiki.search(phrase)
        logger.info('/titles: got results: %s', Object.entries(searchResults.results).length)
        res.send(JSON.stringify(searchResults.results))
        // put full-text search result into cache
        fetch(`${wikiApiUrl}?${fullTextSearchParams(phrase)}`)
            .then((res) => res.json())
            .then((json) => cache.actions.store(cache.LIST, phrase.toLowerCase(), json))
    } catch (error) {
        logger.info('/titles: caught error: %s', error.message)
    }
})

/**
 * https://www.mediawiki.org/wiki/API:Search
 * /v1/list?phrase=Prague
 */
app.get('/v1/list', async (req, res) => {
    logger.info('/list: req query: %s', JSON.stringify(req.query))
    logger.info('/list: cache: %s', cache.actions.dump(cache.LIST))
    try {
        const phrase = req.query.phrase
        logger.info('/list: search phrase: %s', phrase)
        if (cache.storage[cache.LIST].has(phrase.toLowerCase())) {
            logger.info('/list: return cached page')
            res.send(cache.storage[cache.LIST].get(phrase.toLowerCase()))
            return
        }
        const response = await fetch(`${wikiApiUrl}?${fullTextSearchParams(phrase)}`)
        const json = await response.json()
        logger.info('/list: got bytes: %s', JSON.stringify(json).length)
        cache.actions.store(cache.LIST, phrase.toLowerCase(), json)
        res.send(json)
    } catch (error) {
        logger.info('/list: caught error: %s', error.message)
    }
})

/**
 * https://www.mediawiki.org/wiki/API:Parsing_wikitext
 * /v1/page?id=5321
 */
app.get('/v1/page', async (req, res) => {
    logger.info('/page: req query: %s', JSON.stringify(req.query))
    logger.info('/page: cache: %s', cache.actions.dump(cache.PAGES))
    try {
        const pageId = req.query.id
        if (cache.storage[cache.PAGES].has(pageId)) {
            logger.info('/page: return cached page')
            res.send(cache.storage[cache.PAGES].get(pageId))
            return
        }
        const params1 = new URLSearchParams({
            format: 'json',
            action: 'query',
            prop: 'info',
            pageids: pageId,
            inprop: 'url',
        })

        const response1 = await fetch(`${wikiApiUrl}?${params1}`)
        const json1 = await response1.json()
        const fullUrl = json1.query.pages[pageId].fullurl
        const title = json1.query.pages[pageId].title
        logger.info('/page: fullUrl: %s', fullUrl)
        logger.info('/page: title: %s', title)
        const params2 = new URLSearchParams({
            action: 'parse',
            page: title,
            format: 'json',
        })
        const response2 = await fetch(`${wikiApiUrl}?${params2}`)
        const json2 = await response2.json()
        const text = json2.parse.text['*']
        logger.info('/page: original text length: %s bytes', text.length)
        const prefix = `<a target="wiki" href="${wikiUrlForwardSlash}`
        const regex = /<a href="\//gi
        const processed = text.replaceAll(regex, prefix)
        logger.info('/page: processed text length: %s bytes', processed.length)
        cache.actions.store(cache.PAGES, pageId, processed)
        res.send(processed)
    } catch (error) {
        logger.error('/page: caught error: %s', error.message)
    }
})
