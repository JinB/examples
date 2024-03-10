import React, { FC, useContext, useEffect, useRef } from 'react'
import { Snackbar, SnackbarContent } from '@mui/material'
import { UniAppContext } from './UniAppProvider'

export const Alert = () => {
    const { state, actions } = useContext(UniAppContext)
    const handleAlertClose = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return
        }

        actions.setInfo(false)
    }
    const backgroundColor = state.info && state.info.startsWith('Non-existing university: ') ? 'darkred' : 'teal'
    return (
        <Snackbar
            open={!!state.info}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            autoHideDuration={2000}
            onClose={handleAlertClose}
            // message={state.info}
        >
            <SnackbarContent
                style={{
                    backgroundColor: backgroundColor,
                }}
                message={<span id="info-snackbar">{state.info}</span>}
            />
        </Snackbar>
    )
}
