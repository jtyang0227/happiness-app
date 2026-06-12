import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const SECTIONS = {
  privacy: [
    {
      title: '1. 수집하는 개인정보 항목',
      body: `Happiness 앱은 서비스 제공을 위해 아래의 개인정보를 수집합니다.\n\n` +
            `• 필수 항목: 이메일 주소, 비밀번호(암호화 저장), 이름\n` +
            `• 선택 항목: 전화번호, 프로필 사진, 소개글, 위치, 웹사이트 URL, 전문 분야, 인스타그램 아이디\n` +
            `• 자동 수집: 서비스 이용 기록, 접속 IP, 기기 정보`,
    },
    {
      title: '2. 개인정보 수집 및 이용 목적',
      body: `수집한 개인정보는 다음 목적에 사용됩니다.\n\n` +
            `• 회원 가입 및 본인 확인\n` +
            `• 포트폴리오 및 갤러리 서비스 제공\n` +
            `• 작가 간 팔로우 및 피드 기능\n` +
            `• 촬영 문의 연결\n` +
            `• 서비스 개선 및 통계 분석`,
    },
    {
      title: '3. 개인정보 보유 및 이용 기간',
      body: `회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.\n` +
            `단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.\n\n` +
            `• 전자상거래 기록: 5년 (전자상거래법)\n` +
            `• 소비자 불만 처리 기록: 3년 (전자상거래법)\n` +
            `• 로그인 기록: 3개월 (통신비밀보호법)`,
    },
    {
      title: '4. 개인정보 제3자 제공',
      body: `Happiness는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.\n` +
            `다만, 법령에 의하거나 이용자의 동의가 있는 경우에는 예외로 합니다.`,
    },
    {
      title: '5. 개인정보 보호 조치',
      body: `• 비밀번호 암호화 (BCrypt)\n` +
            `• HTTPS 통신 암호화\n` +
            `• JWT 토큰 기반 인증 (Secure Storage 저장)\n` +
            `• 불필요한 정보 최소 수집`,
    },
    {
      title: '6. 이용자의 권리',
      body: `이용자는 언제든지 다음 권리를 행사할 수 있습니다.\n\n` +
            `• 개인정보 열람 및 수정\n` +
            `• 회원 탈퇴 및 개인정보 삭제\n` +
            `• 개인정보 처리 정지 요청\n\n` +
            `문의: support@happiness.app`,
    },
    {
      title: '7. 개인정보 보호책임자',
      body: `성명: 개인정보 보호팀\n이메일: privacy@happiness.app\n시행일: 2024년 1월 1일`,
    },
  ],
  terms: [
    {
      title: '제1조 (목적)',
      body: `이 약관은 Happiness(이하 "서비스")가 제공하는 사진 포트폴리오 플랫폼 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.`,
    },
    {
      title: '제2조 (회원 가입)',
      body: `① 이용자는 본 약관에 동의하고 이메일 인증을 완료함으로써 회원으로 가입합니다.\n` +
            `② 만 14세 미만의 자는 회원 가입이 불가합니다.\n` +
            `③ 타인의 정보를 도용하여 가입하는 행위는 금지됩니다.`,
    },
    {
      title: '제3조 (서비스 이용)',
      body: `① 회원은 포트폴리오 사진 등록, 시리즈 관리, 팔로우, 댓글 등의 서비스를 이용할 수 있습니다.\n` +
            `② 저작권자의 허락 없이 타인의 사진을 무단 게재하는 행위는 금지됩니다.\n` +
            `③ 음란물, 혐오 콘텐츠, 명예훼손 콘텐츠 등록은 금지됩니다.`,
    },
    {
      title: '제4조 (콘텐츠 저작권)',
      body: `① 회원이 등록한 사진의 저작권은 해당 회원에게 있습니다.\n` +
            `② 서비스는 서비스 운영·홍보 목적으로 회원의 콘텐츠를 사용할 수 있으며, 이 경우 출처를 명시합니다.\n` +
            `③ 타인의 저작권을 침해하는 경우 게시물이 삭제될 수 있습니다.`,
    },
    {
      title: '제5조 (서비스 중단 및 변경)',
      body: `① 서비스는 기술적 문제, 서버 점검, 천재지변 등으로 서비스가 일시 중단될 수 있습니다.\n` +
            `② 서비스 내용·이용 방법 등이 변경되는 경우 사전에 공지합니다.`,
    },
    {
      title: '제6조 (이용 제한)',
      body: `회원이 다음 행위를 하는 경우 이용이 제한될 수 있습니다.\n\n` +
            `• 타인의 계정 도용\n• 서비스 운영 방해\n• 불법 콘텐츠 게재\n• 스팸 행위`,
    },
    {
      title: '제7조 (면책 조항)',
      body: `① 서비스는 회원이 게재한 정보·자료의 신뢰성에 대해 보증하지 않습니다.\n` +
            `② 서비스는 회원 간 분쟁에 관여하지 않으며 이로 인한 손해에 책임을 지지 않습니다.`,
    },
    {
      title: '부칙',
      body: `이 약관은 2024년 1월 1일부터 시행됩니다.\n문의: support@happiness.app`,
    },
  ],
};

export default function LegalScreen({ navigation, route }) {
  const initial = route?.params?.tab || 'privacy';
  const [tab, setTab] = useState(initial);

  const sections = SECTIONS[tab];

  return (
    <View style={styles.container}>
      {/* 탭 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'privacy' && styles.tabActive]}
          onPress={() => setTab('privacy')}
        >
          <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>
            개인정보처리방침
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'terms' && styles.tabActive]}
          onPress={() => setTab('terms')}
        >
          <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>
            이용약관
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.docTitle}>
          {tab === 'privacy' ? 'Happiness 개인정보처리방침' : 'Happiness 이용약관'}
        </Text>
        <Text style={styles.docDate}>최종 수정일: 2024년 1월 1일</Text>

        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>확인했습니다</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  content: { padding: SPACING.lg, paddingBottom: 40 },
  docTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  docDate: { fontSize: FONT.xs, color: COLORS.textHint, marginBottom: SPACING.lg },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  sectionBody: { fontSize: FONT.sm, color: COLORS.textSecondary, lineHeight: 22 },

  backBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14,
    alignItems: 'center', marginTop: SPACING.lg },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.base },
});
