declare namespace awslambda {
  function streamifyResponse(
    handler: (
      event: import('aws-lambda').APIGatewayProxyEventV2,
      responseStream: NodeJS.WritableStream,
      context: import('aws-lambda').Context,
    ) => Promise<void>,
  ): (
    event: import('aws-lambda').APIGatewayProxyEventV2,
    responseStream: NodeJS.WritableStream,
    context: import('aws-lambda').Context,
  ) => Promise<void>;

  namespace HttpResponseStream {
    function from(
      responseStream: NodeJS.WritableStream,
      metadata: { statusCode: number; headers?: Record<string, string> },
    ): import('stream').Writable;
  }
}
