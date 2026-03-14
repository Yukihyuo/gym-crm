import React from 'react'
import {useUserStore} from "@/store/userStore"
import LoginPage from './views/login'
import Routes from './routes'
export default function App() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)

  return (
    isAuthenticated ? <Routes/> : <LoginPage/>
  )
}