import styles from './TitlesList.module.css'

export default function HistoryList({ list, dispatch }) {
    // console.log('HistoryList(): list:', list)
    const getTitle = () => (!list.length ? 'No history yet' : 'Search history')
    return (
        <div className={styles.main}>
            <div className={styles.rowTitle}>{getTitle()}</div>
            {list &&
                list.map((cur, index) => (
                    <div
                        key={index}
                        onClick={() => {
                            dispatch({ type: 'setPageId', value: cur })
                        }}
                        className={styles.row}
                    >
                        {cur}
                    </div>
                ))}
        </div>
    )
}
