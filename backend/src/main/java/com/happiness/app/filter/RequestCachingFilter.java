package com.happiness.app.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.*;

@Component
@Order(2)
public class RequestCachingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        if (shouldCache(req)) {
            CachedBodyHttpServletRequest cached = new CachedBodyHttpServletRequest(req);
            chain.doFilter(cached, response);
        } else {
            chain.doFilter(request, response);
        }
    }

    private boolean shouldCache(HttpServletRequest req) {
        String contentType = req.getContentType();
        return contentType != null &&
               (contentType.contains(MediaType.APPLICATION_JSON_VALUE) ||
                contentType.contains(MediaType.TEXT_PLAIN_VALUE));
    }

    public static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
        private final byte[] cachedBody;

        public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
            super(request);
            this.cachedBody = StreamUtils.copyToByteArray(request.getInputStream());
        }

        @Override
        public ServletInputStream getInputStream() {
            return new CachedBodyServletInputStream(this.cachedBody);
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream()));
        }

        private static class CachedBodyServletInputStream extends ServletInputStream {
            private final InputStream is;

            CachedBodyServletInputStream(byte[] body) {
                this.is = new ByteArrayInputStream(body);
            }

            @Override public boolean isFinished() {
                try { return is.available() == 0; } catch (IOException e) { return true; }
            }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener l) { throw new UnsupportedOperationException(); }
            @Override public int read() throws IOException { return is.read(); }
        }
    }
}
