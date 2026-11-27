package com.happiness.app.common.util;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

class UploadImageShrinkerTest {

    private static byte[] noisyImage(int w, int h, String format) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Random r = new Random(1);
        Graphics2D g = img.createGraphics();
        for (int i = 0; i < 400; i++) {
            g.setColor(new Color(r.nextInt(256), r.nextInt(256), r.nextInt(256)));
            g.fillRect(r.nextInt(w), r.nextInt(h), 40 + r.nextInt(200), 40 + r.nextInt(200));
        }
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    @Test
    void largeJpegIsResizedToLongEdge2048() throws Exception {
        byte[] original = noisyImage(4000, 3000, "jpg");
        UploadImageShrinker.Result r = UploadImageShrinker.shrink(original, "image/jpeg", "jpeg");

        BufferedImage out = ImageIO.read(new ByteArrayInputStream(r.bytes()));
        assertThat(Math.max(out.getWidth(), out.getHeight())).isEqualTo(2048);
        assertThat(out.getWidth()).isEqualTo(2048);
        assertThat(out.getHeight()).isEqualTo(1536);
        assertThat(r.bytes().length).isLessThan(original.length);
        assertThat(r.contentType()).isEqualTo("image/jpeg");
        assertThat(r.ext()).isEqualTo("jpg");
    }

    @Test
    void largePngStaysPngAndIsResized() throws Exception {
        byte[] original = noisyImage(3000, 1000, "png");
        UploadImageShrinker.Result r = UploadImageShrinker.shrink(original, "image/png", "png");

        BufferedImage out = ImageIO.read(new ByteArrayInputStream(r.bytes()));
        assertThat(out.getWidth()).isEqualTo(2048);
        assertThat(r.contentType()).isEqualTo("image/png");
    }

    @Test
    void smallPngAndGifAndUnreadableAreUntouched() throws Exception {
        byte[] png = noisyImage(800, 600, "png");
        assertThat(UploadImageShrinker.shrink(png, "image/png", "png").bytes()).isSameAs(png);

        byte[] gif = noisyImage(3000, 3000, "gif");
        assertThat(UploadImageShrinker.shrink(gif, "image/gif", "gif").bytes()).isSameAs(gif);

        byte[] junk = "not an image".getBytes();
        assertThat(UploadImageShrinker.shrink(junk, "image/jpeg", "jpg").bytes()).isSameAs(junk);
    }
}
