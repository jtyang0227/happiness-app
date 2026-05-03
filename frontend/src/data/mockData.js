/**
 * 게시물 Mock 데이터
 */

export const mockPosts = [
  {
    id: '1',
    title: '아침 산책의 아름다움',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    description: '새벽 5시 산에서 본 일출은 정말 멋있었어요.',
    author: {
      id: 'user1',
      name: '김산책',
      profileImage: 'https://i.pravatar.cc/150?img=1',
    },
    likes: 1245,
    comments: 89,
    views: 5320,
    tags: ['산책', '일출', '자연'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    liked: false,
  },
  {
    id: '2',
    title: '도시야경의 매력',
    image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop',
    description: '야경의 도시 불빛이 정말 아름다워요.',
    author: {
      id: 'user2',
      name: '박도시',
      profileImage: 'https://i.pravatar.cc/150?img=2',
    },
    likes: 2103,
    comments: 156,
    views: 8900,
    tags: ['야경', '도시', '밤'],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4시간 전
    liked: false,
  },
  {
    id: '3',
    title: '여름 바다의 신비로움',
    image: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop',
    description: '파도의 리듬이 심장을 두드린다.',
    author: {
      id: 'user3',
      name: '이바다',
      profileImage: 'https://i.pravatar.cc/150?img=3',
    },
    likes: 3567,
    comments: 234,
    views: 12500,
    tags: ['바다', '여름', '휴가'],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8시간 전
    liked: false,
  },
  {
    id: '4',
    title: '숲 속의 고요함',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=800&h=600&fit=crop',
    description: '숲 속에서 찾은 조용한 평온함.',
    author: {
      id: 'user4',
      name: '최자연',
      profileImage: 'https://i.pravatar.cc/150?img=4',
    },
    likes: 892,
    comments: 45,
    views: 3200,
    tags: ['숲', '자연', '평온'],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12시간 전
    liked: false,
  },
  {
    id: '5',
    title: '도시의 거리예술',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=600&fit=crop',
    description: '거리의 예술작품들이 도시를 더 아름답게 만든다.',
    author: {
      id: 'user5',
      name: '정예술',
      profileImage: 'https://i.pravatar.cc/150?img=5',
    },
    likes: 1567,
    comments: 123,
    views: 6700,
    tags: ['예술', '도시', '거리'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1일 전
    liked: false,
  },
  {
    id: '6',
    title: '계절의 색채',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    description: '각 계절마다 다른 아름다움을 가지고 있다.',
    author: {
      id: 'user6',
      name: '손계절',
      profileImage: 'https://i.pravatar.cc/150?img=6',
    },
    likes: 2345,
    comments: 178,
    views: 9800,
    tags: ['계절', '색상', '자연'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2일 전
    liked: false,
  },
];

export const mockComments = [
  {
    id: '1',
    author: {
      id: 'user7',
      name: '한상어',
      profileImage: 'https://i.pravatar.cc/150?img=7',
    },
    content: '정말 아름다운 사진이네요!',
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30분 전
    likes: 12,
  },
  {
    id: '2',
    author: {
      id: 'user8',
      name: '오댓글',
      profileImage: 'https://i.pravatar.cc/150?img=8',
    },
    content: '이 장소는 어디인가요? 정말 가보고 싶어요.',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1시간 전
    likes: 8,
  },
];
