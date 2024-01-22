import { useWikiSearchContext } from '../WikiSearch/WikiSearchProvider'
import styles from './HistoryList.module.css'

export default function HistoryList() {
    const { state, actions } = useWikiSearchContext()
    const history = state.history[state.user]
    // console.log('HistoryList(): history:', history)
    const getTitle = () => (!Object.keys(history).length ? 'No history yet' : 'Search history')
    return (
        <div className={styles.main}>
            <div className={styles.rowTitle}>{getTitle()}</div>
            {Object.keys(history).length > 0 &&
                Object.keys(history).map((title, index) => (
                    <div
                        key={index}
                        onClick={() => {
                            actions.setPage({ title: title, pageid: history[title] })
                        }}
                        className={styles.row}
                    >
                        {title}
                    </div>
                ))}
        </div>
    )
}
