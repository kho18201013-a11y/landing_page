---
name: board-builder
description: GitHub API와 Vercel Serverless Function을 기반으로 동작하는 반응형 정적 게시판 홈페이지 구축 스킬
---

# Board Builder Skill

이 스킬은 백엔드 데이터베이스 없이 GitHub API와 Vercel 정적 호스팅을 활용하여 안정적이고 안전한 정적 게시판 홈페이지를 구축하고 동기화하는 자동화 솔루션입니다.

## 아키텍처 개요
1. **프론트엔드**: HTML5, Tailwind CSS, Material Symbols, 순수 JavaScript (외부 무거운 프레임워크 종속성 없음)
2. **데이터 저장소**: GitHub 저장소의 `data/posts.json`
3. **설정 및 보안**:
   - `config/git_config.json`: 저장소 기본 메타데이터 보관
   - `api/config.js`: Vercel 서버리스 함수를 통해 환경변수(`GITHUB_TOKEN`, `ADMIN_PASSWORD`)를 안전하게 프론트엔드로 브릿지
   - `db.js`: 하이브리드 로컬스토리지 & GitHub API 커밋/푸시 제어
4. **Clean URLs**: `vercel.json`을 통한 확장자 없는 모던 URL 라우팅 (`/admin`, `/news`, `/news-detail`, `/news-write`)

## 주요 파일 구조
- `index.html`: 메인 랜딩 페이지 (최신 게시글 3개 프리뷰 포함)
- `news.html`: 게시글 전체 목록, 검색 및 카테고리 필터링
- `news-detail.html`: 게시글 마크다운 렌더링 상세 조회 및 관리자 제어
- `news-write.html`: 마크다운 지원 게시글 작성 및 수정 에디터 (관리자 전용)
- `admin.html`: 관리자 전용 대시보드 및 게시글 테이블 관리
- `db.js`: GitHub Contents API & LocalStorage 하이브리드 스토리지 엔진
- `vercel.json`: Zero-config Clean URL 라우팅 설정
- `api/config.js`: 토큰 및 비밀번호 보안 서빙 API
- `data/posts.json`: 게시글 JSON 데이터베이스
- `templates/post-template.md`: 게시글 작성 가이드 템플릿
