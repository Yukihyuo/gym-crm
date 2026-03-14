import Client from "../models/Client.js"

let services = {}

services.validateClientExists = async (clientId) => {
	if (!clientId) return false

	const client = await Client.findById(clientId)
	return !!client
}

export default services