const StatusCode = Object.freeze({
    SuccessOK: 200,
    ClientErrorBadRequest: 400,
    ClientErrorUnauthorized: 401, // Use this for invalid signatures
    ClientErrorForbidden: 403,
    ClientErrorPayloadTooLarge: 413,
    ClientErrorNotFound: 404,
    ServerErrorInternal: 500
});

module.exports = StatusCode;