import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'
import type {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerHandler,
    StatementEffect,
} from 'aws-lambda'

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

const generatePolicy = (
    principalId: string,
    effect: StatementEffect,
    resource: string,
): APIGatewayAuthorizerResult => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource,
                },
            ],
        },
    }
}

export const main: APIGatewayTokenAuthorizerHandler = async (event) => {
    const authHeader = event.authorizationToken
    console.log(
        '[Basic Authorizer]: Received request with Authorization header: ',
        authHeader?.substring(0, 20) + '...',
    )

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return generatePolicy('user', 'Deny', event.methodArn)
    }

    const authorized = await verifyCredentials(authHeader)
    console.log('[Basic Authorizer]: Authorization result: ', authorized)

    return generatePolicy(
        'user',
        authorized ? 'Allow' : 'Deny',
        event.methodArn,
    )
}
