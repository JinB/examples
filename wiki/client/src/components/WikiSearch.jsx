import { useEffect, useReducer } from 'react'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import MoonLoader from 'react-spinners/ClipLoader'
import parse from 'html-react-parser'

import * as ws from '../service/wiki'
import { getMode, getInitState, getBackenUrl } from '../service/env'

import InputForm from './InputForm'
import TitlesList from './TitlesList'
import HistoryList from './HistoryList'
import ArticleList from './ArticleList'
import Description from './Description'

import styles from './WikiSearch.module.css'

export default function WikiSearch() {
    const [state, dispatch] = useReducer(reducer, getInitState())
    useEffect(() => {
        console.log('mode: ', getMode(), ', backend status: ', state.backend)
        ws.getBackendStatus()
            .then((res) => {
                console.log('backend:', res)
                dispatch({ type: 'setBackend', value: res })
            })
            .catch(() => dispatch({ type: 'setBackend', value: false }))
    }, [])

    useEffect(() => {
        // console.log('useEffect(): phrase', state.phrase)
        dispatch({ type: 'setLoading', value: true })
        if (state.phrase) {
            dispatch({ type: 'addHistory', value: state.phrase })
            ws.getWikiTitles(state.phrase)
                .then((res) => dispatch({ type: 'setSuggestions', value: res }))
                .catch((error) => {
                    dispatch({ type: 'setLoading', value: false })
                    console.log('useEffect(): get titles: error:', error)
                })
        } else {
            dispatch({ type: 'show', value: null })
        }
    }, [state.phrase])

    useEffect(() => {
        // console.log('useEffect(): padeId', state.padeId, ', type: ', typeof state.padeId)
        dispatch({ type: 'setLoading', value: true })
        if (state.padeId) {
            if (typeof state.padeId === 'number') {
                ws.getWikiArticle(state.padeId)
                    .then((res) => {
                        dispatch({ type: 'setArticle', value: res })
                    })
                    .catch((error) => {
                        dispatch({ type: 'setLoading', value: false })
                        console.log('useEffect(): get page: error:', error)
                    })
            } else {
                ws.getWikiArticleList(state.padeId)
                    .then((res) => {
                        // console.log('useEffect(): got articles list: ', res)
                        dispatch({ type: 'setArticleList', value: res })
                    })
                    .catch((error) => {
                        dispatch({ type: 'setLoading', value: false })
                        console.log('useEffect(): get list: error:', error)
                    })
            }
        } else {
            dispatch({ type: 'show', value: null })
        }
    }, [state.padeId])

    function reducer(state, action) {
        // console.log('reducer(): state:', state, ', action:', action)
        switch (action.type) {
            case 'setBackend':
                return { ...state, backend: action.value }
            case 'setUser':
                return { ...state, user: action.value, show: null }
            case 'show':
                return { ...state, show: action.value, loading: false }
            case 'setPhrase':
                return { ...state, phrase: action.value }
            case 'toggleHistory':
                return { ...state, show: state.show === 'history' ? null : 'history' }
            case 'setLoading':
                return { ...state, loading: action.value }
            case 'setSuggestions':
                return { ...state, suggestions: action.value, show: 'suggestions', loading: false }
            case 'setPageId':
                return { ...state, padeId: action.value }
            case 'setArticle':
                return { ...state, article: action.value, show: 'article', loading: false }
            case 'setArticleList':
                return { ...state, list: action.value, show: 'list', loading: false }

            case 'addHistory':
                const user = state.user
                const history = state.history
                // console.log('reducer(): addHistory: cur history:', history, ', user:', user)
                if (!history[user].includes(action.value)) {
                    history[user] = [...history[user], action.value]
                }
                const newHistory = { ...state.history, history }
                // console.log('reducer(): addHistory: new history:', newHistory)
                return { ...state, history: newHistory }
            default:
                console.log('reducer(): error: got no action type')
                return state
        }
    }

    return (
        <div className={styles.mainPanel}>
            <Description backend={state.backend} />
            <div className={styles.searchPanel}>
                <div className={styles.userPanel}>
                    <div>User</div>
                    <div className={styles.userRadio}>
                        <RadioGroup row value={state.user} onChange={(e) => dispatch({ type: 'setUser', value: e.target.value })}>
                            <FormControlLabel value="Tom" control={<Radio />} label="Tom" disabled={!state.backend} />
                            <FormControlLabel value="Jana" control={<Radio />} label="Jana" disabled={!state.backend} />
                        </RadioGroup>
                    </div>
                </div>
                <InputForm dispatch={dispatch} disabled={!state.backend} />
                {state.loading && <MoonLoader color="rgb(23, 21, 21)" />}
                {state.show === 'suggestions' && <TitlesList list={state.suggestions} dispatch={dispatch} />}
                {state.show === 'list' && <ArticleList list={state.list} dispatch={dispatch} />}
                {state.show === 'history' && <HistoryList list={state.history[state.user]} dispatch={dispatch} />}
            </div>
            {state.show === 'article' && (
                <div className={styles.articlePanel}>
                    <code>{parse(state.article)}</code>
                </div>
            )}
        </div>
    )
}
