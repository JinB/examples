import axios from 'axios'
import { backendUrl, VERSION } from './env'

const getBackendStatus = async () => {
    const url = backendUrl + '/v1/status'
    console.log('getBackendStatus(): url:', url)
    try {
        const { data } = await axios.get(url)
        data['client'] = `v${VERSION}`
        console.log('getBackendStatus(): data:', data)
        return data
    } catch (error) {
        console.log('getBackendStatus(): error:', error.message)
        return { server: null, build: null }
    }
}

const getWikiTitles = async (phrase) => {
    const url = backendUrl + '/v1/titles?phrase=' + encodeURI(phrase)
    console.log('getWikiTitles(): url:', url)
    try {
        const { data } = await axios.get(url)
        // console.log('getWikiTitles(): data:', data)
        data.unshift({ title: phrase, pageid: 0 })
        // console.log('getWikiTitles(): customized data:', data)
        return data
    } catch (error) {
        console.log('getWikiTitles(): caught error:', error.message)
        return []
    }
}

const getWikiArticleList = async (phrase) => {
    const url = backendUrl + '/v1/list?phrase=' + encodeURI(phrase)
    console.log('getWikiArticleList(): url:', url)
    try {
        const { data } = await axios.get(url)
        const { query } = data
        // console.log('getWikiArticleList(): return:', query)
        return query
    } catch (error) {
        console.log('getWikiArticleList(): caught error:', error)
        return []
    }
}

const getWikiArticle = async (pageId) => {
    const url = backendUrl + '/v1/page?id=' + encodeURI(pageId)
    console.log('getWikiArticle(): url:', url)
    try {
        const { data } = await axios.get(url)
        return data
    } catch (error) {
        console.log('getWikiArticle(): caught error:', error)
        return 'Nothing loaded'
    }
}

export { getWikiTitles, getWikiArticle, getWikiArticleList, getBackendStatus }
