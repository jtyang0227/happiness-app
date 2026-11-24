import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, setGatheringStatus, setInstagramId } from './db.js';
import { LOCAL_DATE_TIME, User, call, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const Y = new Date().getUTCFullYear() + 1;
async function gatheringWith(host: User, members: User[]) {
  const g = (await call('POST', '/api/gatherings', { token: host.token, body: {
    title: '피드 모임', location: '서울숲', maxParticipants: 10,
    startDateTime: `${Y}-07-01T10:00:00`, endDateTime: `${Y}-07-01T12:00:00`, recruitmentEndDateTime: `${Y}-06-30T10:00:00`,
  } })).body;
  for (const m of members) await call('POST', `/api/gatherings/${g.id}/participation`, { token: m.token, body: { status: 'PARTICIPATING' } });
  return g.id as number;
}

const POST_KEYS = ['commentCount', 'comments', 'content', 'createdAt', 'gatheringId', 'hashtags', 'id', 'likeCount', 'likedByMe', 'memberAvatarUrl', 'memberId', 'memberName', 'photos', 'wantsFeedback'];

describe('모임 피드·앨범·Instagram', () => {
  it('진행 중에만 작성·참여자만, 피드(최신순·사진 정렬·댓글·좋아요·likedByMe)·알림·삭제, 종료 후 앨범', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const outsider = await signupAndLogin();
    const id = await gatheringWith(host, [a, b]);

    expect((await call('GET', `/api/gatherings/${id}/posts`)).body).toMatchObject({ code: '400', message: '진행 중이거나 종료된 모임의 피드만 조회할 수 있습니다.' });
    expect((await call('POST', `/api/gatherings/${id}/posts`, { token: a.token, body: { content: 'x' } })).body).toMatchObject({ code: '400', message: '진행 중인 모임에만 게시물을 올릴 수 있습니다.' });
    await setGatheringStatus(id, 'ONGOING');

    expect((await call('POST', `/api/gatherings/${id}/posts`, { token: outsider.token, body: { content: 'x' } })).body).toMatchObject({ code: '403', message: '모임 참여자만 게시물을 올릴 수 있습니다.' });
    expect((await call('POST', `/api/gatherings/${id}/posts`, { token: a.token, body: { content: '  ', photos: [] } })).body).toMatchObject({ code: '400', message: '내용 또는 사진 중 하나 이상을 입력해야 합니다.' });
    const p1 = await call('POST', `/api/gatherings/${id}/posts`, { token: a.token, body: {
      content: ' <b>첫</b> 컷 ', hashtags: '#숲', wantsFeedback: true,
      photos: [{ imageUrl: 'https://x/2.jpg', caption: '둘', sortOrder: 2 }, { imageUrl: ' ' }, { imageUrl: 'https://x/1.jpg', sortOrder: 1 }],
    } });
    expect(p1.status).toBe(201);
    expect(Object.keys(p1.body).sort()).toEqual(POST_KEYS);
    expect(p1.body).toMatchObject({ gatheringId: id, memberId: a.id, memberName: '테스터', content: '첫 컷', hashtags: '#숲', wantsFeedback: true,
      likeCount: 0, commentCount: 0, comments: [], likedByMe: false });
    expect(p1.body.photos.map((x: any) => [x.imageUrl, x.sortOrder])).toEqual([['https://x/2.jpg', 2], ['https://x/1.jpg', 1]]);
    const p2 = await call('POST', `/api/gatherings/${id}/posts`, { token: b.token, body: { content: '두 번째' } });

    // 좋아요·댓글
    expect((await call('POST', `/api/gatherings/posts/${p1.body.id}/like`, { token: b.token })).status).toBe(200);
    expect((await call('POST', `/api/gatherings/posts/${p1.body.id}/like`, { token: b.token })).body).toMatchObject({ code: '409', message: '이미 좋아요를 눌렀습니다.' });
    expect((await call('POST', `/api/gatherings/posts/${p1.body.id}/like`, { token: outsider.token })).body).toMatchObject({ code: '403', message: '모임 참여자만 이 기능을 사용할 수 있습니다.' });
    expect((await call('POST', '/api/gatherings/posts/999999999/like', { token: b.token })).body).toMatchObject({ code: '404', message: '게시물을 찾을 수 없습니다.' });
    expect((await call('POST', `/api/gatherings/posts/${p1.body.id}/comments`, { token: b.token, body: { content: ' ' } })).body).toMatchObject({ code: '400', message: '댓글 내용을 입력해주세요.' });
    const c1 = await call('POST', `/api/gatherings/posts/${p1.body.id}/comments`, { token: b.token, body: { content: '<i>멋져요</i>' } });
    expect(c1.status).toBe(201);
    expect(c1.body).toEqual({ id: expect.any(Number), gatheringPostId: p1.body.id, memberId: b.id, memberName: '테스터', memberAvatarUrl: null, content: '멋져요', createdAt: expect.stringMatching(LOCAL_DATE_TIME) });
    await call('POST', `/api/gatherings/posts/${p1.body.id}/comments`, { token: a.token, body: { content: '감사' } });

    const feedB = await call('GET', `/api/gatherings/${id}/posts`, { token: b.token });
    expect(feedB.body).toMatchObject({ totalElements: 2, size: 20, number: 0 });
    expect(feedB.body.content.map((x: any) => x.id)).toEqual([p2.body.id, p1.body.id]);
    const f1 = feedB.body.content[1];
    expect(f1).toMatchObject({ likeCount: 1, commentCount: 2, likedByMe: true });
    expect(f1.photos.map((x: any) => x.sortOrder)).toEqual([1, 2]);
    expect(f1.comments.map((x: any) => x.content)).toEqual(['멋져요', '감사']);
    expect((await call('GET', `/api/gatherings/${id}/posts`)).body.content[1].likedByMe).toBe(false);

    // 알림: 새 글(작성자 제외 참여자), 좋아요·댓글(글쓴이, 본인 행동 제외)
    const an = (await call('GET', '/api/gatherings/notifications', { token: a.token })).body.content.map((n: any) => n.type).sort();
    expect(an).toEqual(['NEW_COMMENT', 'NEW_LIKE', 'NEW_POST']);
    const bn = (await call('GET', '/api/gatherings/notifications', { token: b.token })).body.content;
    expect(bn).toEqual([expect.objectContaining({ type: 'NEW_POST', relatedPostId: p1.body.id, message: "'피드 모임'에 새 사진이 올라왔습니다." })]);

    expect((await call('DELETE', `/api/gatherings/posts/${p1.body.id}/like`, { token: b.token })).status).toBe(200);
    expect((await call('DELETE', `/api/gatherings/posts/${p1.body.id}/like`, { token: b.token })).body).toMatchObject({ code: '404', message: '좋아요 기록이 없습니다.' });
    expect((await call('DELETE', `/api/gatherings/posts/${p2.body.id}`, { token: a.token })).body).toMatchObject({ code: '403', message: '게시물을 찾을 수 없거나 삭제 권한이 없습니다.' });
    expect((await call('DELETE', `/api/gatherings/posts/${p2.body.id}`, { token: b.token })).status).toBe(204);

    expect((await call('GET', `/api/gatherings/${id}/album`)).body).toMatchObject({ code: '400', message: '종료된 모임의 앨범만 조회할 수 있습니다.' });
    await setGatheringStatus(id, 'ENDED');
    expect((await call('POST', `/api/gatherings/${id}/posts`, { token: a.token, body: { content: 'x' } })).body).toMatchObject({ code: '400' });
    const album = await call('GET', `/api/gatherings/${id}/album`);
    expect(album.body).toEqual({ gatheringId: id, title: '피드 모임', photoCount: 2, postCount: 1, participantCount: 2,
      photos: [
        { imageUrl: 'https://x/2.jpg', caption: '둘', postId: p1.body.id, createdAt: expect.stringMatching(LOCAL_DATE_TIME) },
        { imageUrl: 'https://x/1.jpg', caption: null, postId: p1.body.id, createdAt: expect.stringMatching(LOCAL_DATE_TIME) },
      ] });
    // 종료 후에도 댓글 가능
    expect((await call('POST', `/api/gatherings/posts/${p1.body.id}/comments`, { token: b.token, body: { content: '끝' } })).status).toBe(201);
  });

  it('Instagram — 후보(본인 제외·아이디 있는 참여자), 공유 기록·템플릿 검사, 비참여 403', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const c = await signupAndLogin();
    const id = await gatheringWith(host, [a, b, c]);
    await setInstagramId(b.id, 'bee_photo');
    await setInstagramId(c.id, '   ');
    await setInstagramId(a.id, 'aaa');
    const cand = await call('GET', `/api/gatherings/${id}/instagram-candidates`, { token: a.token });
    expect(cand.status).toBe(200);
    expect(cand.body).toEqual([{ memberId: b.id, name: '테스터', avatarUrl: null, instagramId: 'bee_photo' }]);
    expect((await call('GET', `/api/gatherings/${id}/instagram-candidates`, { token: host.token })).body).toMatchObject({ code: '403', message: '모임 참여자만 이 기능을 사용할 수 있습니다.' });
    expect((await call('POST', `/api/gatherings/${id}/instagram-share`, { token: a.token, body: { template: 'VIDEO' } })).body).toMatchObject({ code: '400', message: '유효하지 않은 템플릿입니다. PHOTO_ONLY, PHOTO_PARTICIPANTS, PHOTO_TEXT 중 하나를 사용하세요.' });
    const s = await call('POST', `/api/gatherings/${id}/instagram-share`, { token: a.token, body: { template: 'PHOTO_PARTICIPANTS', captionText: '<b>hi</b>', taggedMemberIds: [b.id] } });
    expect(s.status).toBe(200);
    expect(s.body).toEqual({ id: expect.any(Number), sharedAt: expect.stringMatching(LOCAL_DATE_TIME) });
    expect((await call('GET', '/api/gatherings/999999999/instagram-candidates', { token: a.token })).body).toMatchObject({ code: '404', message: '모임을 찾을 수 없습니다.' });
  });
});
