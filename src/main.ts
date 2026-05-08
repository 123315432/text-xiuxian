import './style.css'
import { initCrazyGamesPlatform } from './platform/crazygames'

await initCrazyGamesPlatform()
await import('./ui/app')
