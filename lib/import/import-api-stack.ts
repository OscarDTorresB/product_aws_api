import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { ImportService } from './import-service'

export class ImportApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        new ImportService(this, 'import-service')
    }
}
