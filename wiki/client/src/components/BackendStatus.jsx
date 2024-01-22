import styled from 'styled-components'
import { useWikiSearchContext } from './WikiSearch/WikiSearchProvider'
import { FaThumbsUp, FaThumbsDown, FaQuestion } from 'react-icons/fa'

const MainDiv = styled.div`
    margin-top: 5px;
    margin-bottom: 5px;
`
export default function BackendStatus() {
    const { state } = useWikiSearchContext()
    const { backend } = state
    const getStatus = () => {
        if (backend === undefined) {
            return (
                <>
                    <FaQuestion color="#1976d2" size={20} /> unknown
                </>
            )
        } else if (backend.server === null) {
            return (
                <>
                    <FaThumbsDown color="darkred" size={20} /> OFF - please ask the mantainer to run the backend
                </>
            )
        } else {
            return (
                <>
                    <FaThumbsUp color="#1976d2" size={20} /> ON
                </>
            )
        }
    }

    return <MainDiv>Backend status: {getStatus()}</MainDiv>
}
