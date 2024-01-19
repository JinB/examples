import { useCallback, useMemo, useRef, useState } from 'react'
import { debounce } from 'lodash'
import Input from '@mui/material/Input'
import { FaSearch, FaHistory, FaWindowClose } from 'react-icons/fa'

import styles from './InputForm.module.css'

export default function InputForm({ dispatch, disabled }) {
    const inputRef = useRef()
    const [phrase, setPhrase] = useState('')

    const handleGetSuggestions = useCallback(() => {
        // console.log('handleGetSuggestions(): value: ', inputRef.current.value)
        dispatch({ type: 'setPhrase', value: inputRef.current.value })
    }, [])

    const debouncedSearch = useMemo(() => {
        return debounce(handleGetSuggestions, 500)
    }, [handleGetSuggestions])

    const handleChange = (e) => {
        setPhrase(e.target.value)
        debouncedSearch(phrase)
    }

    const handleKeyDown = (e) => {
        if (/^Enter$/.test(e.code)) {
            const value = inputRef.current.value
            console.log('handleClick(): key code:', e.code, 'value:', value)
            dispatch({ type: 'setPageId', value: value })
        }
    }

    const handleClear = () => {
        setPhrase('')
        dispatch({ type: 'show', value: null })
    }

    const handleHistory = () => {
        if (!disabled) {
            setPhrase('')
            dispatch({ type: 'toggleHistory' })
        }
    }

    const handleStartSearch = () => {
        // console.log('handleStartSearch(): start')
        const value = inputRef.current.value
        dispatch({ type: 'setPageId', value: value })
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
