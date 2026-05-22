import {
    App,
    aws_iam,
    aws_lambda,
    Duration,
    RemovalPolicy,
    Stack,
    StackProps,
} from 'aws-cdk-lib'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'

interface AuthorizerServiceStackProps extends StackProps {
    prefix: string
}

export class AuthorizerServiceStack extends Stack {
    public readonly authorizerLambdaArn: string

    constructor(scope: App, id: string, props: AuthorizerServiceStackProps) {
        super(scope, id, props)

        const { prefix } = props

        const makeLambda = (id: string, handler: string) => {
            const logGroup = new LogGroup(this, `${id}-LogGroup`, {
                logGroupName: `/aws/lambda/${id}`,
                retention: RetentionDays.ONE_WEEK,
                removalPolicy: RemovalPolicy.DESTROY,
            })
            return new aws_lambda.Function(this, id, {
                functionName: id,
                runtime: Runtime.NODEJS_24_X,
                timeout: Duration.seconds(10),
                code: aws_lambda.Code.fromAsset('dist'),
                handler,
                logGroup,
            })
        }

        /* Lambda functions */
        const basicAuthorizerLambda = makeLambda(
            `${prefix}-Lambda-BasicAuthorizer`,
            'handlers/basicAuthorizer.main',
        )
        // Allows lambda to read secrets from Secrets Manager
        basicAuthorizerLambda.addToRolePolicy(
            new aws_iam.PolicyStatement({
                actions: ['secretsmanager:GetSecretValue'],
                resources: [
                    'arn:aws:secretsmanager:*:*:secret:basic-auth-credentials*',
                ],
            }),
        )

        // Broad grant so TokenAuthorizer in other stacks doesn't need to add its own
        // cross-stack Lambda::Permission (which would create a dependency cycle).
        basicAuthorizerLambda.addPermission('ApiGatewayInvoke', {
            principal: new aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
            sourceAccount: this.account,
        })

        this.authorizerLambdaArn = basicAuthorizerLambda.functionArn
    }
}
