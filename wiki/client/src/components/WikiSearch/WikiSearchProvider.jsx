import { createContext, useContext, useReducer } from 'react'

const initialState = {
    loading: false,
    backend: undefined,
    phrase: '',
    page: {},
    suggestions: [],
    list: [],
    article: null,
    user: 'user2',
    expanded: null,
    history: { user1: {}, user2: {} },
}

function wikiSearchReducer(state, action) {
    // console.log('wikiSearchReducer(): state:', state, ', action:', action)
    switch (action.type) {
        case 'setBackend':
            return { ...state, backend: action.payload }
        case 'setUser':
            return { ...state, user: action.payload, expanded: null }
        case 'setExpanded':
            return { ...state, expanded: action.payload, loading: false }
        case 'setPhrase':
            return { ...state, phrase: action.payload }
        case 'toggleHistory':
            return { ...state, expanded: state.expanded === 'history' ? null : 'history' }
        case 'setLoading':
            return { ...state, loading: action.payload }
        case 'setSuggestions':
            return { ...state, suggestions: action.payload, expanded: 'suggestions', loading: false }
        case 'setPage':
            return { ...state, page: action.payload, expanded: null }
        case 'setArticle':
            return { ...state, article: action.payload, expanded: 'article', loading: false }
        case 'setArticleList':
            return { ...state, list: action.payload, expanded: 'list', loading: false }

        case 'addHistory':
            const history = state.history
            const { title, pageid: pageId } = action.payload
            const userHistory = history[state.user]
            userHistory[title] = pageId
            const newHistory = { ...history, userHistory }
            return { ...state, history: newHistory }
        default:
            console.log('reducer(): error: got no action type')
            return state
    }
}

const createWikiSearchActions = (dispatch) => ({
    setBackend(backend) {
        dispatch({ type: 'setBackend', payload: backend })
    },
    setUser(user) {
        dispatch({ type: 'setUser', payload: user })
    },
    setPhrase(phrase) {
        dispatch({ type: 'setPhrase', payload: phrase })
    },
    setPage(page) {
        dispatch({ type: 'setPage', payload: page })
    },
    setExpanded(element) {
        dispatch({ type: 'setExpanded', payload: element })
    },
    toggleHistory() {
        dispatch({ type: 'toggleHistory' })
    },
    setLoading(loading) {
        dispatch({ type: 'setLoading', payload: loading })
    },
    setSuggestions(suggestions) {
        dispatch({ type: 'setSuggestions', payload: suggestions })
    },
    setArticle(article) {
        dispatch({ type: 'setArticle', payload: article })
    },
    setArticleList(list) {
        dispatch({ type: 'setArticleList', payload: list })
    },
    addHistory(page) {
        dispatch({ type: 'addHistory', payload: page })
    },
})

const WikiSearchContext = createContext()

export const WikiSearchProvider = ({ children }) => {
    const [state, dispatch] = useReducer(wikiSearchReducer, initialState)
    const actions = createWikiSearchActions(dispatch)

    return <WikiSearchContext.Provider value={{ state, actions }}>{children}</WikiSearchContext.Provider>
}

export const useWikiSearchContext = () => useContext(WikiSearchContext)
