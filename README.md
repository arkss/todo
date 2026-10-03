# 52:48 — 커플 TODO 웹앱

민성 · 미나가 함께 쓰는 할 일 공유 웹앱. 빌드 도구 없이 **단일 `index.html`** 하나로 동작하며, GitHub Pages 정적 배포 + Firebase Firestore 실시간 동기화 구성입니다.

## 구성

- `index.html` — 앱 전체 (React + Firebase를 CDN에서 로드, 빌드 불필요)
- `firestore.rules` — Firestore 보안 규칙
- `manifest.webmanifest`, `icon-180/192/512.png` — 홈 화면 추가(PWA)용
- `firebase-messaging-sw.js` — 웹 푸시 서비스워커 (알림 기능용, 레포 루트)
- `scripts/send-reminder.js` + `.github/workflows/daily-reminder.yml` — 매일 알림 발송 (알림 기능용)
- `README.md` — 이 문서

React·Babel·Firebase를 모두 CDN으로 불러오므로 `npm install`이나 번들링이 없습니다. 파일을 브라우저로 바로 열어도 동작합니다.

## 지금 바로 확인 (로컬 모드)

`index.html`을 더블클릭해서 브라우저로 열면 됩니다. Firebase 설정 전에는 **로컬 모드**로 돌아가며, 데이터가 이 기기의 브라우저(localStorage)에만 저장됩니다. 커플 코드 아무거나 입력하면 샘플 할 일이 뜹니다. 동기화는 안 되지만 UI/동작은 전부 확인할 수 있어요.

## 실시간 동기화 켜기 (Firebase 5단계)

두 사람의 기기에서 같은 할 일을 실시간으로 보려면 Firebase를 연결합니다.

1. **프로젝트 생성** — [Firebase 콘솔](https://console.firebase.google.com/)에서 프로젝트 추가.
2. **Firestore 켜기** — 좌측 *Firestore Database* → *데이터베이스 만들기* → 위치 선택. (프로덕션 모드로 시작하고, 규칙은 4번에서 넣습니다.)
3. **웹 앱 등록** — 프로젝트 설정(⚙️) → *내 앱* → 웹(`</>`) 추가 → 표시되는 `firebaseConfig` 객체를 복사.
   - `index.html` 상단의 `FIREBASE_CONFIG = { ... }` 부분을 복사한 값으로 교체.
4. **보안 규칙 적용** — Firestore → *규칙* 탭에 `firestore.rules` 내용을 붙여넣고 *게시*.
5. **익명 로그인 켜기** — *Authentication* → *로그인 방법* → **익명(Anonymous)** 사용 설정.

이제 두 사람이 같은 **커플 코드**를 입력하면 체크·응원·도움요청이 서로의 기기에 바로 반영됩니다.

> 커플 코드가 곧 방 열쇠입니다. 추측하기 어려운 값을 쓰세요. 예: `minseong-mina-2026-a7x9`

## GitHub Pages 배포

1. GitHub에 저장소를 만들고 `index.html`(과 원하면 `README.md`)을 push.
   ```bash
   git init
   git add index.html README.md firestore.rules
   git commit -m "52:48 커플 TODO"
   git branch -M main
   git remote add origin https://github.com/<사용자명>/<저장소>.git
   git push -u origin main
   ```
2. 저장소 → **Settings → Pages** → *Build and deployment*의 Source를 **Deploy from a branch**, 브랜치를 **main / (root)** 로 설정하고 저장.
3. 잠시 뒤 `https://<사용자명>.github.io/<저장소>/` 에서 열립니다.
4. **Firebase 승인 도메인 추가** — Authentication → Settings → *승인된 도메인*에 위 `github.io` 도메인을 추가해야 로그인이 동작합니다.

휴대폰에서 그 주소를 연 뒤 "홈 화면에 추가"하면 앱처럼 쓸 수 있습니다.

## 데이터 구조 (Firestore)

```
couples/{커플코드}/todos/{자동ID}
  title       string   할 일 제목
  owner       string   'mina' | 'minseong' | 'both'
  done        bool     완료 여부
  streak      number   연속 완료일 (현재 수동/시드값)
  needHelp    bool     도움 요청 여부
  reactions   string[] 응원 이모지 (하트)
  estMin      number   예상 소요 시간(분) | null   ← 추가 시 입력
  actualSec   number   실제 누적 수행 시간(초)     ← ▶ 시작/⏹ 끝으로 기록
  timerStart  number   타이머 시작 시각(ms) | null (실행 중일 때만)
  order       number   정렬용
  createdAt   number   생성 시각(ms)
  completedAt number    완료 시각(ms) | null
```

## 화면 구성

- **오늘 탭(📋)**: 미나 / 민성 / 우리별로 오늘 할 일을 관리. 각 그룹 안의 `＋ 할 일 추가`로 그 자리에서 바로 추가(제목 + 예상 시간 입력). 각 할 일에서 `▶ 시작` / `⏹ 끝`으로 실제 수행 시간을 잰다. 카드의 `✏️`를 누르면 제목·예상 시간을 수정하거나 🗑 삭제할 수 있다. 체크 시 축하 애니메이션, 💖 응원, 🙋 도움요청.
- **통계 탭(📊)**: 사람별 진행률(링) + **예상 vs 실제 시간 비교**(막대 그래프와 "N분 빨리 / N분 더 걸림" 문구). ADHD의 시간 감각(time blindness)을 눈으로 확인·보정하는 데 초점.

## 매일 알림(웹 푸시) 설정

앱을 꺼놔도 **매일 정해진 시간에 리마인더 알림**이 오게 하는 기능입니다. 설정이 좀 있지만 전부 무료로 돼요. (iOS는 홈 화면에 PWA로 설치돼 있어야 알림이 옵니다 — iOS 16.4 이상)

관련 파일: `firebase-messaging-sw.js`(레포 루트), `scripts/send-reminder.js`, `.github/workflows/daily-reminder.yml`

**1) VAPID 키 넣기**
Firebase 콘솔 → 프로젝트 설정 → **Cloud Messaging** 탭 → "웹 푸시 인증서" → 키 쌍 생성 → 그 키를 `index.html`의 `VAPID_KEY = "..."` 에 붙여넣기.

**2) Firestore 규칙 업데이트**
`firestore.rules`에 `tokens` 규칙이 추가돼 있어요. Firestore → 규칙에 다시 붙여넣고 게시.

**3) 서비스계정 키 → GitHub 시크릿**
Firebase 콘솔 → 프로젝트 설정 → **서비스 계정** → "새 비공개 키 생성" → JSON 다운로드.
GitHub 레포 → Settings → Secrets and variables → Actions → **New repository secret** → 이름 `FIREBASE_SERVICE_ACCOUNT`, 값에 그 JSON 전체 붙여넣기.

**4) 파일 올리기 (레포 안 경로 주의)**
- `firebase-messaging-sw.js` → 레포 루트 (index.html과 같은 위치)
- `send-reminder.js` → `scripts/send-reminder.js`
- `daily-reminder.yml` → `.github/workflows/daily-reminder.yml`

**5) 알림 시간 조정 (선택)**
`daily-reminder.yml`의 `cron: '0 0 * * *'`은 매일 **09:00 KST**예요. 바꾸려면 (원하는 KST 시 − 9)가 UTC 시: 예) 저녁 21시 알림 → `'0 12 * * *'`.

**사용법:** 배포 후 폰에서 앱을 열면 상단에 **🔔 매일 알림 받기** 버튼이 떠요. 눌러서 권한을 허용하면 그 기기가 등록됩니다(민성·미나 각자 눌러야 각자 폰으로 옴). GitHub Actions 탭에서 워크플로우를 수동 실행(Run workflow)하면 바로 테스트할 수 있어요.

> 참고: "상대가 할 일을 추가하면 즉시 알림" 같은 실시간 알림은 이 무료 구조로는 안 되고, Firebase Cloud Functions(Blaze 요금제)가 필요해요. 지금은 "매일 정해진 시간" 알림만 지원합니다.

## 날짜 처리 (미완료 자동 이월)

- **미완료 할 일**은 날짜와 상관없이 다 끝낼 때까지 목록에 계속 남습니다(자동 이월).
- **완료한 할 일**은 완료한 그날에만 보이고, 다음 날부터 목록에서 빠집니다(`completedAt` 기록은 DB에 남아 통계·기록용으로 유지).
- 별도 날짜 필드 없이 `completedAt` 하나로 처리하므로 자정이 지나면 자동으로 정리됩니다.

## 참고 / 다음 단계 (선택)

- **스트릭 자동 계산**: 지금은 `streak`이 시드/수동값입니다. 매일 완료 여부를 기록해 연속일을 자동 계산하려면 날짜별 완료 로그 컬렉션을 추가하면 됩니다.
- **넛지 알림**: 홈 상단 배너는 정적 예시입니다. 실제 푸시 리마인더는 PWA 서비스워커 + FCM으로 확장할 수 있습니다.
- **PWA**: `manifest.json` + 서비스워커를 추가하면 설치형 앱 경험이 됩니다.
- **비용**: 커플 둘이 쓰는 규모라면 Firebase 무료(Spark) 요금제로 충분합니다.
