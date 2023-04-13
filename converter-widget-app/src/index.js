import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Converter from './components/Converter'

const root = ReactDOM.createRoot(
  document.getElementById('root-converter-widget-app')
)
root.render(
  <React.StrictMode>
    <Converter />
  </React.StrictMode>
)
