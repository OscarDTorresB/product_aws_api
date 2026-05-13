import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'
import { buildCorsHeaders } from '../cors'
import type { APIGatewayProxyEvent, Handler } from 'aws-lambda'

/* Uses Secrets Manager to fetch the basic auth credentials */
const getCredentials = async () => {
    try {
        const client = new SecretsManagerClient()
        const getBasicAuthSecretCommand = new GetSecretValueCommand({
            SecretId: 'basic-auth-credentials',
        })
        const secret = await client.send(getBasicAuthSecretCommand)
        const { username, password } = JSON.parse(secret.SecretString!)
        return { username, password }
    } catch (error) {
        console.error('Error fetching credentials: ', error)
        throw error
    }
}

const verifyCredentials = async (authHeader: string) => {
    try {
        const base64Credentials = authHeader.split(' ')[1]
        const decodedCredentials = Buffer.from(
            base64Credentials,
            'base64',
        ).toString('utf-8')
        const [username, password] = decodedCredentials.split(':')

        const credentials = await getCredentials()
        return (
            username === credentials.username &&
            password === credentials.password
        )
    } catch (error) {
        console.error('Error verifying credentials: ', error)
        throw error
    }
}

export const main: Handler<APIGatewayProxyEvent> = async (event) => {
    const requestOrigin = event?.headers?.origin ?? event?.headers?.Origin
    const basicAuthHeader =
        event.headers?.Authorization ?? event.headers?.authorization
    console.log(
        '[Basic Authorizer]: Received request with Authorization header: ',
        basicAuthHeader?.substring(0, 20) + '...',
    )

    if (!basicAuthHeader || !basicAuthHeader.startsWith('Basic ')) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
            headers: buildCorsHeaders({ reqOrigin: requestOrigin }),
        }
    }

    const authorized = await verifyCredentials(basicAuthHeader)
    console.log('[Basic Authorizer]: Authorization result: ', authorized)
    if (!authorized) {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Invalid credentials' }),
            headers: buildCorsHeaders({ reqOrigin: requestOrigin }),
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Hello from the authorized service!' }),
        headers: buildCorsHeaders({ reqOrigin: requestOrigin }),
    }
}
