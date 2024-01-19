import axios from 'axios'
import { getBackenUrl } from './env'

const backendUrl = getBackenUrl()

function getBackendStatus() {
    const url = backendUrl + '/v1/status'
    console.log('getBackendStatus(): url:', url)
    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((res) => {
                console.log('getBackendStatus(): res:', res.data)
                resolve(res.data.server)
            })
            .catch((error) => {
                console.log('getBackendStatus(): error:', error.message)
                reject(error.message)
            })
    })
}

function getWikiTitles(phrase) {
    const url = backendUrl + '/v1/titles?phrase=' + encodeURI(phrase)
    console.log('getWikiTitles(): url:', url)
    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((res) => {
                // console.log('getWikiTitles(): res:', res)
                const data = res.data
                data.unshift({ title: `Full-text search: ${phrase}`, pageid: phrase })
                // console.log('getWikiTitles(): customized:', data)
                resolve(data)
            })
            .catch((error) => {
                console.log('getWikiTitles(): error:', error)
                reject(error.message)
            })
    })
}

function getWikiArticleList(phrase) {
    const url = backendUrl + '/v1/list?phrase=' + encodeURI(phrase)
    console.log('getWikiArticleList(): url:', url)
    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((res) => {
                // console.log('getWikiArticleList(): res:', res)
                const data = res.data
                resolve(data)
            })
            .catch((error) => {
                console.log('getWikiArticleList(): error:', error)
                reject(error.message)
            })
    })
}

function getWikiArticle(pageId) {
    const url = backendUrl + '/v1/page?id=' + encodeURI(pageId)
    console.log('getWikiArticle(): url:', url)
    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((res) => {
                console.log('getWikiArticle(): got bytes:', res.data.length)
                resolve(res.data)
            })
            .catch((error) => {
                console.log('getWikiArticle(): error:', error)
                reject(error.message)
            })
    })
}

export { getWikiTitles, getWikiArticle, getWikiArticleList, getBackendStatus }
