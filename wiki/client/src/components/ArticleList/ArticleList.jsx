import { FixedSizeList } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import parse from 'html-react-parser'

import { useWikiSearchContext } from '../WikiSearch/WikiSearchProvider'
import styles from './ArticleList.module.css'

export default function ArticleList() {
    const { state, actions } = useWikiSearchContext()
    const { list } = state
    const { body, time } = list
    const { searchinfo: searchInfo, search } = body
    // console.log('ArticleList(): search:', search)

    const renderRow = ({ index, style }) => (
        <div className={styles.row} style={{ ...style }}>
            <div
                onClick={() => {
                    actions.setPage(search[index])
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
                    Hits: {searchInfo.totalhits}, showing: {search.length}, load time: {`${time}ms`}
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
