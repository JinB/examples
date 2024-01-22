import React from 'react'
import styled from 'styled-components'
import { useWikiSearchContext } from './WikiSearch/WikiSearchProvider'
import BackendStatus from './BackendStatus'

const InfoSpan = styled.span`
    text-align: left;
`
const StatusSpan = styled.span`
    text-align: ${window.innerWidth < 400 ? 'center' : 'left'};
`

export default function Description() {
    const { state } = useWikiSearchContext()
    const backendServerVersion = state.backend ? state.backend.server : ''
    return (
        <div>
            <h3>High-Performance Wikipedia Search and Analysis Tool</h3>
            <InfoSpan>
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
                        Frontend: React v{React.version}, Material UI, Axios; backend: Node {backendServerVersion}
                    </li>
                    <li>React hooks utilized: useContext, useReducer, useState, useEffect, useRef, useCallback, useMemo</li>
                    <li>
                        Performance is optimized by debouncing during typing, with fast suggestions of the ten first hits.
                        <br />
                        Full-text search returns the first 500 results displayed in a virtualized list.
                        <br />
                        The application is compiled with optimization provided by Vite. The search history for each user is kept in the state.
                        <br />
                        Response body size is decreased by gzip, the backend caches Wiki's response (~30x faster repeated loading).
                        <br />
                        The backend is managed by PM2 process management with the ability to enforce load balancing.
                    </li>
                    <li>All the work was developed by Eugenio Besson. Feel free to provide your feedback or suggest any improvements</li>
                </ul>
                <h4>Proof of Concept demo</h4>
            </InfoSpan>
            <StatusSpan>
                <BackendStatus />
            </StatusSpan>
        </div>
    )
}
