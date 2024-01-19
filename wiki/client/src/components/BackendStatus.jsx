import styled from 'styled-components'
import { FaThumbsUp, FaThumbsDown, FaQuestion } from 'react-icons/fa'

const Main = styled.div`
    margin-top: 5px;
    margin-bottom: 5px;
`
export default function BackendStatus({ backend: backend }) {
    const getStatus = () => {
        if (backend === undefined) {
            return (
                <>
                    <FaQuestion color="#1976d2" size={20} /> unknown
                </>
            )
        } else if (backend === false) {
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

    return <Main>Backend status: {getStatus()}</Main>
}
