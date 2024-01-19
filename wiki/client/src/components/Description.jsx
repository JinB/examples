import React from 'react'
import BackendStatus from './BackendStatus'
import { MODE, VERSION, getBackenUrl, getMode } from '../service/env'
import { VersionProvider } from './VersionProvider'
import FetchVersion from './FetchVersion'
import styled from 'styled-components'

const Info = styled.span`
    text-align: left;
`
const Status = styled.span`
    text-align: ${window.innerWidth < 400 ? 'center' : 'left'};
`

export default function Description({ backend }) {
    return (
        <div>
            <h3>High-Performance Wikipedia Search and Analysis Tool v{VERSION}</h3>
            <Info>
                <h4>The task</h4>
                <ul>
                    <li>
                        Construct a minimalistic, single-page React application that searches and presents
                        <br />
                        Wikipedia results emphasizing swift performance and secure interactions.
                        <br />
                        Keep track of the search history for each user.
                        <br />
                        Create a minimalist responsive user interface with visual feedback during data fetching
                    </li>
                    <li>
                        Requirements: Develop a Node.js server to manage Wikipedia API interactions from multiple users
                        <br /> Utilize React hooks for frontend state control.
                    </li>
                </ul>
                <h4>The solution</h4>
                <ul>
                    <li>
                        Frontend: Reаct v{React.version}, Material UI, Axios; backend: Node {backend ? backend : ''}
                    </li>
                    <li>React hooks utilized: useReducer, useEffect, useRef, useCallback, useMemo</li>
                    <li>
                        Performance is optimized by debouncing during typing, with fast suggestions of the ten first hits.
                        <br />
                        Full-text search returns the first 500 results displayed in a virtualized list.
                        <br />
                        The application is compiled with optimization provided by Vite, and the search history for each user is kept in the state
                    </li>
                    <li>The application was developed by Eugenio Besson. Feel free to provide your feedback or suggest any improvements</li>
                </ul>
                <h4>Proof of Concept demo</h4>
                <VersionProvider>
                    <FetchVersion url={`${getBackenUrl()}/v1/status`} />
                </VersionProvider>
            </Info>
            {getMode() === MODE.development && (
                <Status>
                    <BackendStatus backend={backend} />
                </Status>
            )}
        </div>
    )
}
