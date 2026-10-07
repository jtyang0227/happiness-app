package com.happiness.app.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleSecurity(SecurityException e) {
        log.warn("[SECURITY] {} - {}", e.getErrorCode().getCode(), e.getMessage());
        return ResponseEntity
                .status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.fail(e.getErrorCode(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        String detail = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        log.debug("[VALIDATION] {}", detail);
        return ResponseEntity
                .status(ErrorCode.INVALID_INPUT.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT, detail));
    }

    // Spring Boot 3.2+ — NoHandlerFoundException (매핑된 핸들러 없음)
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoHandler(NoHandlerFoundException e) {
        log.debug("[404] No handler: {} {}", e.getHttpMethod(), e.getRequestURL());
        return ResponseEntity
                .status(ErrorCode.NOT_FOUND.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.NOT_FOUND, e.getRequestURL() + " 경로를 찾을 수 없습니다."));
    }

    // Spring Boot 3.2+ — NoResourceFoundException (정적 리소스 없음)
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException e) {
        log.debug("[404] No resource: {}", e.getResourcePath());
        return ResponseEntity
                .status(ErrorCode.NOT_FOUND.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.NOT_FOUND, e.getResourcePath() + " 리소스를 찾을 수 없습니다."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUpload(MaxUploadSizeExceededException e) {
        return ResponseEntity
                .status(ErrorCode.FILE_SIZE_EXCEEDED.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.FILE_SIZE_EXCEEDED));
    }

    // 서비스 계층이 던지는 403/404/409 등이 아래 Exception 핸들러에 잡혀 500으로 바뀌지 않도록 상태를 보존한다.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatus(ResponseStatusException e) {
        int status = e.getStatusCode().value();
        if (status >= 500) {
            log.error("[ERROR] {} {}", status, e.getReason(), e);
        } else {
            log.debug("[{}] {}", status, e.getReason());
        }
        return ResponseEntity
                .status(e.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .success(false)
                        .code(String.valueOf(status))
                        .message(e.getReason() != null ? e.getReason() : e.getStatusCode().toString())
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception e) {
        log.error("[ERROR] Unhandled exception", e);
        return ResponseEntity
                .status(ErrorCode.INTERNAL_SERVER_ERROR.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.INTERNAL_SERVER_ERROR));
    }
}
