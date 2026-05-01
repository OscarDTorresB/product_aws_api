import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'
import { Pool } from 'pg'

let pool: Pool | null = null

const getPool = async (): Promise<Pool> => {
    if (pool) return pool

    try {
        const client = new SecretsManagerClient()
        const getSecretCommand = new GetSecretValueCommand({
            SecretId: process.env.DB_SECRET_ARN,
        })
        const secret = await client.send(getSecretCommand)
        const { username, password } = JSON.parse(secret.SecretString!)

        pool = new Pool({
            host: process.env.DB_PROXY_ENDPOINT,
            port: 5432,
            database: process.env.DB_NAME,
            user: username,
            password,
            max: 2,
            ssl: { rejectUnauthorized: false },
        })

        return pool
    } catch (error) {
        console.error('Error connecting to DB: ', error)
        throw error
    }
}

const query = async (query: string, values?: any[]) => {
    const pool = await getPool()
    return pool.query(query, values)
}

const getClient = async () => {
    const pool = await getPool()
    const client = await pool.connect()
    const release = client.release
    // set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!')
    }, 5000)

    client.release = () => {
        // clear our timeout
        clearTimeout(timeout)
        // set the methods back to their old un-monkey-patched version
        client.release = release
        return release.apply(client)
    }

    return client
}

const db = {
    getClient,
    query,
}

export default db
