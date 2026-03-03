import React from 'react'
import {useUserStore} from "@/store/userStore"
import LoginPage from './views/login'
import Home from './views/home'
export default function App() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)

  return (
    isAuthenticated ? <Home/> : <LoginPage/>
  )
}