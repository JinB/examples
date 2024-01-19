import styles from './TitlesList.module.css'

export default function TitlesList({ list, dispatch }) {
    // console.log('TitlesList(): list:', list)
    const getText = (index, title) => (index ? `${index}. ${title}` : title)

    const getRowStyle = (index) => {
        if (index === 0) {
            return `${styles.row} ${styles.rowTitle}`
        } else {
            return styles.row
        }
    }

    return (
        <div className={styles.main}>
            {list &&
                list.map((cur, index) => (
                    <div
                        key={index}
                        onClick={() => {
                            dispatch({ type: 'setPageId', value: cur.pageid })
                        }}
                        className={getRowStyle(index)}
                    >
                        {getText(index, cur.title)}
                    </div>
                ))}
        </div>
    )
}
