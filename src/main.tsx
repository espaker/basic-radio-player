import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ConfigProvider, theme } from 'antd'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={{algorithm: theme.darkAlgorithm}}>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
