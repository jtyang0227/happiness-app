package com.happiness.app.common.util;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ImageSignatureTest {

    @Test
    void 매직_바이트로_형식을_판별한다() {
        assertThat(ImageSignature.detect(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00})).isEqualTo("image/jpeg");
        assertThat(ImageSignature.detect(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})).isEqualTo("image/png");
        assertThat(ImageSignature.detect("GIF89a...".getBytes(StandardCharsets.US_ASCII))).isEqualTo("image/gif");
        assertThat(ImageSignature.detect("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.US_ASCII))).isEqualTo("image/webp");
    }

    @Test
    void 이미지가_아니면_null() {
        assertThat(ImageSignature.detect("<html><script>alert(1)</script>".getBytes(StandardCharsets.UTF_8))).isNull();
        assertThat(ImageSignature.detect("<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes(StandardCharsets.UTF_8))).isNull();
        assertThat(ImageSignature.detect(new byte[0])).isNull();
        assertThat(ImageSignature.detect(null)).isNull();
    }

    @Test
    void 확장자는_형식에서_정한다() {
        assertThat(ImageSignature.extension("image/png")).isEqualTo("png");
        assertThat(ImageSignature.extension("image/jpeg")).isEqualTo("jpg");
        assertThat(ImageSignature.extension("image/webp")).isEqualTo("webp");
        assertThat(ImageSignature.extension("image/gif")).isEqualTo("gif");
    }
}
