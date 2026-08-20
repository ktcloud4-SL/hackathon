"""Application errors exposed through the common API error envelope."""


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class AuthenticationRequiredError(AppError):
    def __init__(self, message: str = "인증이 필요합니다.") -> None:
        super().__init__(401, "AUTHENTICATION_REQUIRED", message)


class InvalidCredentialsError(AppError):
    def __init__(self) -> None:
        super().__init__(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.")


class ForbiddenError(AppError):
    def __init__(self, message: str = "요청한 리소스에 접근할 권한이 없습니다.") -> None:
        super().__init__(403, "FORBIDDEN", message)


class ResourceConflictError(AppError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(409, code, message)


class ServiceNotReadyError(AppError):
    def __init__(self, service: str) -> None:
        super().__init__(503, "SERVICE_NOT_READY", f"{service} 연동이 준비되지 않았습니다.")
