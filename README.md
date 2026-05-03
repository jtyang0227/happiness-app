# 🎉 해피니스 모바일 앱

React + Spring Boot로 만든 모바일 애플리케이션

## 프로젝트 구조

```
happiness-app/
├── frontend/        (React 프론트엔드 - 포트 3000)
└── backend/         (Spring Boot 백엔드 - 포트 8080)
```

## 기술 스택

- **프론트엔드**: React 18.2.0
- **백엔드**: 
  - Java 22 (OpenJDK)
  - Spring Boot 3.3.0
  - Gradle 8.8
  - Tomcat

## 설치 및 실행

### 백엔드 실행

```bash
cd backend

# 빌드
./gradlew clean build -x test --no-daemon

# 실행
java -jar build/libs/happiness-app-backend-1.0.0.jar
```

### 웹 프론트엔드 실행

```bash
cd frontend

# Python을 사용한 간단한 웹 서버
python3 -m http.server 3000 --directory .

# 또는 npm 설치 후
npm install
npm start
```

### React Native 모바일 앱 실행

```bash
cd mobile
npm install
npm start
```

모바일 앱은 Expo 기반으로 iOS 및 Android에서 동시 개발이 가능합니다.

## API 엔드포인트

- **GET** `/api/hello` - Hello World 메시지

## 테스트

```bash
# 백엔드 테스트
curl http://localhost:8080/api/hello

# 프론트엔드
http://localhost:3000/index.html
```

## 포트 정보

- **백엔드**: 8080
- **프론트엔드**: 3000

---

생성일: 2026년 4월 18일
