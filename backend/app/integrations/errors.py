"""Expected failures raised by external service adapters."""


class ExternalIntegrationError(RuntimeError):
    def __init__(self, service: str, operation: str, message: str) -> None:
        super().__init__(message)
        self.service = service
        self.operation = operation


class ObjectStorageError(ExternalIntegrationError):
    def __init__(self, operation: str, message: str) -> None:
        super().__init__("object-storage", operation, message)


class PublicDataUnavailableError(ExternalIntegrationError):
    def __init__(self, message: str) -> None:
        super().__init__("public-data", "get-context", message)
