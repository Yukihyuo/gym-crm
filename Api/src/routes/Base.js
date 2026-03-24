import express from "express"

const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Base API is working' })
})

export const routeConfig = { path: "/v1/base", router }