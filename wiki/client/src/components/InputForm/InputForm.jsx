import { useCallback, useMemo, useRef, useState } from 'react'
import { debounce } from 'lodash'
import Input from '@mui/material/Input'
import { FaSearch, FaHistory, FaWindowClose } from 'react-icons/fa'

import { useWikiSearchContext } from '../WikiSearch/WikiSearchProvider'
import styles from './InputForm.module.css'

export default function InputForm({ disabled }) {
    const { actions } = useWikiSearchContext()
    const inputRef = useRef()
    const [phrase, setPhraseLocal] = useState('')

    const handleGetSuggestions = useCallback(() => {
        // console.log('handleGetSuggestions(): value: ', inputRef.current.value)
        actions.setPhrase(inputRef.current.value)
    }, [])

    const debouncedSearch = useMemo(() => {
        return debounce(handleGetSuggestions, 500)
    }, [handleGetSuggestions])

    const handleChange = (e) => {
        setPhraseLocal(e.target.value)
        debouncedSearch(e.target.value)
    }

    const handleKeyDown = (e) => {
        if (/^Enter$/.test(e.code)) {
            const value = inputRef.current.value
            console.log('handleClick(): key code:', e.code, 'value:', value)
            actions.setPage({ title: value, pageid: 0 })
        }
    }

    const handleClear = () => {
        setPhraseLocal('')
        actions.setExpanded(null)
    }

    const handleHistory = () => {
        if (!disabled) {
            setPhraseLocal('')
            actions.toggleHistory()
        }
    }

    const handleStartSearch = () => {
        // console.log('handleStartSearch(): start')
        const value = inputRef.current.value
        actions.setPage({ title: value, pageid: 0 })
    }

    return (
        <div className={styles.main}>
            <Input inputRef={inputRef} onChange={handleChange} onKeyDown={handleKeyDown} value={phrase} placeholder="Wiki search..." disabled={disabled} className={styles.input} />
            <FaSearch size={'40px'} title="history" onClick={handleStartSearch} disabled={disabled && !phrase} className={styles.actionButton} />
            <FaWindowClose size={'40px'} title="clear" onClick={handleClear} disabled={disabled && !phrase} className={styles.actionButton} />
            <FaHistory size={'40px'} title="history" onClick={handleHistory} disabled={disabled} className={styles.actionButton} />
        </div>
    )
}
