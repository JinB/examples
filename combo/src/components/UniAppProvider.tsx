import React from 'react'
import { createContext, useReducer } from 'react'

export interface IUni {
    alpha_two_code: string
    web_pages: any
    'state-province': string | null
    name: string
    domains: any
    country: string
}
export interface IAction {
    type: string
    payload: any
}
export interface IState {
    info: string | undefined
}
type UniContextType = {
    state: IState
    actions: any
}

const initialState = {
    info: undefined,
}

function applicationReducer(state: IState, action: IAction): IState {
    // console.log('applicationReducer(): state:', state, ', action:', action)
    switch (action.type) {
        case 'setInfo':
            return { ...state, info: action.payload }
        default:
            console.log('reducer(): error: unknown action type:', action.type)
            return state
    }
}

const createApplicationActions = (dispatch: any) => ({
    setInfo(info: any) {
        if (!!info) {
            if (typeof info === 'string') {
                dispatch({
                    type: 'setInfo',
                    payload: info,
                })
            } else {
                dispatch({
                    type: 'setInfo',
                    payload: `${info.name} has been applied to ${info.uni}`,
                })
            }
        } else {
            dispatch({ type: 'setInfo', payload: undefined })
        }
    },
})

export const UniAppContext = createContext<UniContextType>({
    state: initialState,
    actions: null,
})

export const UniAppProvider = ({ children }: { children: any }) => {
    const [state, dispatch] = useReducer(applicationReducer, initialState)
    const actions = createApplicationActions(dispatch)

    return <UniAppContext.Provider value={{ state, actions }}>{children}</UniAppContext.Provider>
}
