package com.happiness.mobileapp.member.entity;

public enum Authority {
    WM("웹관리자"),
    SA("운영자"),
    US("유저");

    private final String label;

    Authority(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
