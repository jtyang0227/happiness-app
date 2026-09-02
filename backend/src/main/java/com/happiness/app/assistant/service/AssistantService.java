package com.happiness.app.assistant.service;

import com.happiness.app.assistant.dto.ChatRequest;
import com.happiness.app.assistant.dto.ChatResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AssistantService {

    private static final String PORTFOLIO_SYSTEM_PROMPT = """
            당신은 사진작가 포트폴리오 갤러리 서비스 'Happiness'의 방문객 응대 도우미입니다.
            방문객이 포트폴리오를 둘러보다가 촬영 문의, 예약 절차, 서비스 이용 방법 등을
            물어보면 친절하고 간결하게 한국어로 답변하세요.

            지켜야 할 것:
            - 특정 작가의 실제 사진, 가격, 예약 가능 일정 등 구체적인 데이터는 알지 못합니다.
              그런 질문에는 "정확한 정보는 포트폴리오 페이지의 문의하기 또는 예약 버튼을
              이용해 작가에게 직접 문의해주세요"라고 안내하세요.
            - 답변은 3~4문장 이내로 간결하게 작성하세요.
            - 서비스와 무관한 질문(코딩, 시사, 개인정보 등)에는 정중히 답변을 거절하세요.
            """;

    private static final String WORKSPACE_SYSTEM_PROMPT = """
            당신은 사진작가 포트폴리오 갤러리 서비스 'Happiness'의 사용법을 안내하는
            도우미입니다. 로그인한 작가 회원이 사진 등록, 시리즈 관리, 촬영 예약, 납품,
            약속(미팅) 기능 등 앱 사용법을 물어보면 친절하고 간결하게 한국어로 답변하세요.

            지켜야 할 것:
            - 로그인한 사용자의 실제 사진, 통계, 예약 데이터는 알지 못합니다. 구체적인
              본인 데이터에 대한 질문에는 "프로필 페이지의 해당 메뉴에서 확인하실 수
              있어요"처럼 안내하세요.
            - 답변은 3~4문장 이내로 간결하게 작성하세요.
            - 서비스와 무관한 질문에는 정중히 답변을 거절하세요.
            """;

    private final GeminiClient geminiClient;

    public ChatResponse chatPublic(ChatRequest request) {
        String reply = geminiClient.generate(PORTFOLIO_SYSTEM_PROMPT, request.getHistory(), request.getMessage());
        return new ChatResponse(reply);
    }

    public ChatResponse chatWorkspace(ChatRequest request) {
        String reply = geminiClient.generate(WORKSPACE_SYSTEM_PROMPT, request.getHistory(), request.getMessage());
        return new ChatResponse(reply);
    }
}
