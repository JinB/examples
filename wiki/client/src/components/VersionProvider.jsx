import { createContext, useContext, useReducer } from 'react'

const initialState = {
    error: null,
    version: null,
}

const SUCCESS = 'SUCCESS'
const ERROR = 'ERROR'

function versionReducer(state, action) {
    switch (action.type) {
        case SUCCESS:
            return {
                error: null,
                version: action.payload,
            }
        case ERROR:
            return {
                error: action.payload,
                version: null,
            }
        default:
            return state
    }
}

const createVersionActions = (dispatch) => ({
    setSuccess(success) {
        dispatch({
            type: SUCCESS,
            payload: success,
        })
    },
    setError(error) {
        dispatch({
            type: ERROR,
            payload: error,
        })
    },
})

const VersionContext = createContext()

export const VersionProvider = ({ children }) => {
    const [state, dispatch] = useReducer(versionReducer, initialState)

    const actions = createVersionActions(dispatch)

    return <VersionContext.Provider value={{ state, actions }}>{children}</VersionContext.Provider>
}

export const useVersionContext = () => useContext(VersionContext)
