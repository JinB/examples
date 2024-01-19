const VERSION = '0.04'
const MODE = { development: 'development', production: 'production' }

const getMode = () => {
    const href = window.location.href
    // console.log('getMode(): href:', href)
    return /localhost/.test(href) ? MODE.development : MODE.production
}

const getBackenUrl = () => {
    if (getMode() === MODE.development) {
        return 'http://localhost:4000'
    } else {
        return 'https://wiki.4dates.net'
    }
}

function getInitState() {
    return { loading: false, backendStatus: undefined, server: undefined, phrase: '', padeId: null, suggestions: [], list: [], article: null, user: 'Jana', show: null, history: { Tom: [], Jana: [] } }
}

export { VERSION, MODE, getMode, getBackenUrl, getInitState }
