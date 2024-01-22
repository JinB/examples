import { useEffect } from 'react'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import MoonLoader from 'react-spinners/ClipLoader'
import parse from 'html-react-parser'

import * as ws from '../../service/wiki'
import InputForm from '../InputForm/InputForm'
import SuggestionList from '../SuggestionList/SuggestionList'
import HistoryList from '../HistoryList/HistoryList'
import ArticleList from '../ArticleList/ArticleList'
import Description from '../Description'

import styles from './WikiSearch.module.css'
import { useWikiSearchContext } from './WikiSearchProvider'

export default function WikiSearch() {
    const { state, actions } = useWikiSearchContext()

    useEffect(() => {
        ws.getBackendStatus().then(actions.setBackend).catch(actions.setBackend)
    }, [])

    useEffect(() => {
        // console.log('useEffect(): phrase: phrase', state.phrase)
        if (state.phrase) {
            actions.setLoading(true)
            ws.getWikiTitles(state.phrase).then(actions.setSuggestions)
        } else {
            actions.setExpanded(null)
        }
    }, [state.phrase])

    useEffect(() => {
        if (Object.keys(state.page).length) {
            // console.log('useEffect(): page: value', state.page)
            actions.setLoading(true)
            const pageId = state.page.pageid
            const title = state.page.title
            actions.addHistory(state.page)
            const loadStart = new Date().getTime()
            if (pageId) {
                ws.getWikiArticle(pageId).then((body) => actions.setArticle({ body: body, time: new Date().getTime() - loadStart }))
            } else {
                ws.getWikiArticleList(title).then((body) => actions.setArticleList({ body: body, time: new Date().getTime() - loadStart }))
            }
        } else {
            actions.setExpanded(null)
        }
    }, [state.page])

    const inputDisabled = state.backend && state.backend.server ? false : true

    return (
        <div className={styles.mainPanel}>
            <Description backend={state.backend} />
            <div className={styles.searchPanel}>
                <div className={styles.userPanel}>
                    <div>User</div>
                    <div className={styles.userRadio}>
                        <RadioGroup row value={state.user} onChange={(e) => actions.setUser(e.target.value)}>
                            <FormControlLabel value="user1" control={<Radio />} label="User 1" disabled={inputDisabled} />
                            <FormControlLabel value="user2" control={<Radio />} label="User 2" disabled={inputDisabled} />
                        </RadioGroup>
                    </div>
                </div>
                <InputForm disabled={inputDisabled} />
                {state.loading && <MoonLoader color="rgb(23, 21, 21)" />}
                {state.expanded === 'suggestions' && <SuggestionList />}
                {state.expanded === 'list' && <ArticleList />}
                {state.expanded === 'history' && <HistoryList />}
            </div>
            {state.expanded === 'article' && (
                <div className={styles.articlePanel}>
                    <p>
                        <i>Load time: {state.article.time}ms</i>
                    </p>
                    <code>{parse(state.article.body)}</code>
                </div>
            )}
        </div>
    )
}
