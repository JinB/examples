import './App.css'
import WikiSearch from './components/WikiSearch/WikiSearch'
import { WikiSearchProvider } from './components/WikiSearch/WikiSearchProvider'

export default function App() {
    return (
        <div className="App">
            <header className="App-header">
                <WikiSearchProvider>
                    <WikiSearch />
                </WikiSearchProvider>
            </header>
        </div>
    )
}
