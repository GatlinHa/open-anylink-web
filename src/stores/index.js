import { createPinia } from 'pinia'
import persist from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(persist)

export default pinia
export * from './user'
export * from './group'
export * from './setting'
export * from './message'
export * from './search'
export * from './userCard'
export * from './groupCard'
export * from './image'
export * from './audio'
export * from './video'
