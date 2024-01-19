import { useState } from 'react'
import axios from 'axios'
import IconButton from '@mui/material/IconButton'
import { useVersionContext } from './VersionProvider'
import styled from 'styled-components'
import { FaSearch } from 'react-icons/fa'

const Main = styled.div`
    display: flex;
    flex-direction: column;
`
const GetButton = styled.button`
    width: 150px;
    height: 20px;
`

const FetchVersion = ({ url }) => {
    const { state, actions } = useVersionContext()
    const [btnClicked, setBtnClicked] = useState(false)

    console.log('FetchVersion(): url:', url)
    const fetchVersion = (url) =>
        axios
            .get(url)
            .then((res) => {
                const { data } = res
                const version = data.server
                console.log('fetchVersion(): version:', version)
                actions.setSuccess(version)
                setBtnClicked(true)
            })
            .catch((e) => {
                actions.setError(e)
            })

    const btnText = btnClicked ? 'Done' : 'Get backend version'
    console.log('FetchVersion(): state:', state)

    return (
        <Main>
            <GetButton type="button" onClick={() => fetchVersion(url)} disabled={btnClicked}>
                Get backend version
            </GetButton>
            {state.version && <> Backend server version: {state.version}</>}
            {state.error && <> Impossible to get backend version</>}
        </Main>
    )
}

export default FetchVersion
