package com.happiness.app.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 공통
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C001", "서버 내부 오류가 발생했습니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C002", "잘못된 입력값입니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "C003", "허용되지 않은 HTTP 메서드입니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "C004", "요청한 리소스를 찾을 수 없습니다."),

    // 인증
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "인증이 필요합니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A002", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "만료된 토큰입니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "A004", "유효하지 않은 리프레시 토큰입니다."),
    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "A005", "이메일 또는 비밀번호가 올바르지 않습니다."),
    ACCOUNT_LOCKED(HttpStatus.LOCKED, "A006", "계정이 잠겼습니다. 잠시 후 다시 시도해주세요."),

    // 인가
    FORBIDDEN(HttpStatus.FORBIDDEN, "B001", "접근 권한이 없습니다."),
    ADMIN_REQUIRED(HttpStatus.FORBIDDEN, "B002", "관리자 권한이 필요합니다."),

    // Rate Limit
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "R001", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."),

    // 리소스
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "M001", "사용자를 찾을 수 없습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "M002", "이미 사용 중인 이메일입니다."),
    DUPLICATE_PROFILE_NAME(HttpStatus.CONFLICT, "M003", "이미 사용 중인 프로필명입니다."),
    PHOTO_NOT_FOUND(HttpStatus.NOT_FOUND, "P001", "사진을 찾을 수 없습니다."),

    // 파일
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "F001", "허용되지 않은 파일 형식입니다."),
    FILE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "F002", "파일 크기가 초과되었습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
