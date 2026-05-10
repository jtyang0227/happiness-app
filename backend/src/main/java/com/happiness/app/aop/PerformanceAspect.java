package com.happiness.app.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
public class PerformanceAspect {

    @Pointcut("within(com.happiness.app..*Service)")
    public void serviceLayer() {}

    @Around("serviceLayer()")
    public Object measureTime(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        String method = pjp.getSignature().toShortString();
        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;
            if (elapsed > 1000) {
                log.warn("[PERF] 느린 서비스 메서드 - method={}, elapsed={}ms", method, elapsed);
            } else {
                log.debug("[PERF] method={}, elapsed={}ms", method, elapsed);
            }
            return result;
        } catch (Throwable t) {
            long elapsed = System.currentTimeMillis() - start;
            log.error("[PERF] 서비스 오류 - method={}, elapsed={}ms, error={}", method, elapsed, t.getMessage());
            throw t;
        }
    }
}
