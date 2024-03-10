import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { UniAppProvider } from './components/UniAppProvider'
import UniApp1 from './components/UniApp1'
import UniApp2 from './components/UniApp2'
import './App.css'

const queryClient = new QueryClient()

function App() {
    return (
        <div className="App" data-testid="app-page">
            <header className="header">University application</header>
            <header className="header2">
                Reactive component to handle simple application to some Czech university.
            </header>
            <div className="body">
                <header className="header3">Demo 1: MUI Autocomplete</header>
                <QueryClientProvider client={queryClient}>
                    <UniAppProvider>
                        <UniApp1 />
                    </UniAppProvider>
                </QueryClientProvider>
                <header className="header3">Demo 2: Floating UI</header>
                <QueryClientProvider client={queryClient}>
                    <UniAppProvider>
                        <UniApp2 />
                    </UniAppProvider>
                </QueryClientProvider>
            </div>
            <footer className="footer">
                TypeScript, React v{React.version}, TanStack Query, Axios, React Hook Form, Floating UI, Material UI
                <br />
                Created by Eugenio Besson, source code is available at GitHub:
                <br />
                <a href="https://github.com/JinB/combo" target="src" className="AppLink">
                    https://github.com/JinB/combo
                </a>
            </footer>
        </div>
    )
}

export default App
