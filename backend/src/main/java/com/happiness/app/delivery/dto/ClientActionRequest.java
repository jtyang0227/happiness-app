package com.happiness.app.delivery.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClientActionRequest {
    private List<Long> likedPhotoIds;
    private String feedback;
    /** Optional password for password-protected delivery sets */
    private String password;
}
