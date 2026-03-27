import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import FilieresProvider from './contextApi/filieresContext.tsx'
import { BrowserRouter } from 'react-router-dom'
import { ExportProvider } from './contextApi/ExportContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ExportProvider>
      <FilieresProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </FilieresProvider>
    </ExportProvider>
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', () => {
  // Removed console.log statements for production
})
