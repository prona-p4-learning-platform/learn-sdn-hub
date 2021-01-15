import config from './Config'

export default function createApiRequest(pathAndQuery:`/${string}`, init?: RequestInit) : Request{
    const request = new Request(config.backendURL+pathAndQuery, init)
    return request
}