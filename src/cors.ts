export const DEFAULT_HEADERS = [
    'Content-Type',
    'X-Amz-Date',
    'Authorization',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Amz-User-Agent',
]
export const ALLOWED_ORIGIN = 'https://dsnj73sfotids.cloudfront.net'
export const ALL_METHODS = ['*']

interface BuildHeaderParams {
    headers: string[]
    origin: string
    methods: string[]
    reqOrigin: string
}

export const buildCorsHeaders = (params?: Partial<BuildHeaderParams>) => {
    const resolvedOrigin =
        params?.reqOrigin && params.reqOrigin.includes('://localhost')
            ? params.reqOrigin
            : ALLOWED_ORIGIN

    return {
        'Access-Control-Allow-Headers': (
            params?.headers ?? DEFAULT_HEADERS
        ).join(),
        'Access-Control-Allow-Origin': resolvedOrigin,
        'Access-Control-Allow-Methods': (params?.methods ?? ALL_METHODS).join(),
    }
}
