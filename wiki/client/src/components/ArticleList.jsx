import { useRef } from 'react'
import { FixedSizeList } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import parse from 'html-react-parser'

import styles from './ArticleList.module.css'

export default function ArticleList({ list, dispatch }) {
    const listRef = useRef()
    const searchInfo = list.query.searchinfo
    const search = list.query.search
    // console.log('ArticleList(): search:', search)

    const renderRow = ({ index, style }) => (
        <div className={styles.row} style={{ ...style }}>
            <div
                onClick={() => {
                    dispatch({ type: 'setPageId', value: search[index].pageid })
                }}
                className={styles.rowTitle}
            >
                {index + 1}: {search[index].title}
            </div>
            <div className={styles.rowStats}>Words count: {search[index].wordcount}</div>
            <div className={styles.rowArticle}>{parse(search[index].snippet)}</div>
        </div>
    )

    const dumpWindowSize = (w, h) => {
        // console.log('dumpSize(): width:', w, ', height:', h)
    }

    return (
        <div className={styles.main}>
            {!searchInfo.totalhits ? (
                <div>No results</div>
            ) : (
                <div>
                    Total hits: {searchInfo.totalhits}, showing first: {search.length}
                </div>
            )}
            <div className={styles.list}>
                <AutoSizer>
                    {({ height, width }) => (
                        <>
                            {dumpWindowSize(width, height)}
                            <FixedSizeList width={width} height={height} itemCount={search.length} itemSize={150}>
                                {renderRow}
                            </FixedSizeList>
                        </>
                    )}
                </AutoSizer>
            </div>
        </div>
    )
}
