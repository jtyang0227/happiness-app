package com.happiness.app.exception;

import lombok.Getter;

@Getter
public class SecurityException extends RuntimeException {
    private final ErrorCode errorCode;

    public SecurityException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public SecurityException(ErrorCode errorCode, String detail) {
        super(detail);
        this.errorCode = errorCode;
    }
}
