import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import TokoApp from '@/components/TokoApp'
import '@/styles/styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TokoApp />
  </StrictMode>,
)
