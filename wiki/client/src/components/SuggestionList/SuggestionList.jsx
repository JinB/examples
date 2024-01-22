import { useWikiSearchContext } from '../WikiSearch/WikiSearchProvider'
import styles from './SuggestionList.module.css'

export default function SuggestionList() {
    const { state, actions } = useWikiSearchContext()
    const { suggestions } = state
    const history = state.history[state.user]
    // console.log('SuggestionList(): suggestions:', suggestions)
    // console.log('SuggestionList(): history:', history)
    const getText = (index, title) => (index ? `${index}. ${title}` : `Full-text search: ${title}`)

    const getRowStyle = (index, title) => {
        const color = Object.keys(history).some((cur) => cur === title) ? styles.visited : styles.unvisited
        if (index === 0) {
            return `${styles.row} ${styles.unvisited} ${styles.rowTitle}`
        } else {
            return `${styles.row} ${color}`
        }
    }

    return (
        <div className={styles.main}>
            {suggestions.length > 0 &&
                suggestions.map((cur, index) => (
                    <div
                        key={index}
                        onClick={() => {
                            actions.setPage(cur)
                        }}
                        className={getRowStyle(index, cur.title)}
                    >
                        {getText(index, cur.title)}
                    </div>
                ))}
            {suggestions.length == 0 && <div>Nothing found</div>}
        </div>
    )
}
