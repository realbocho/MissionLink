# MissionLink

텔레그램 미니앱 기반 TON 후원 미션 플랫폼

## 스택
- **Frontend**: React + Vite (Vercel)
- **API**: Vercel Serverless Functions
- **DB**: Supabase (PostgreSQL)
- **결제**: TON Connect 2.0
- **Bot**: Telegram Bot API
- **Cron**: cron-job.org

## 배포 순서

### 1. Supabase 설정
1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Settings → API에서 `URL`과 `service_role` 키 복사

### 2. Telegram Bot 설정
1. [@BotFather](https://t.me/BotFather)로 봇 생성 → `TELEGRAM_BOT_TOKEN` 획득
2. `/newapp` 으로 미니앱 등록 → URL은 Vercel 배포 후 설정

### 3. TON 지갑 설정
1. TON Wallet 생성 (Tonkeeper 등)
2. 지갑 주소 메모 → `CREATOR_WALLET_ADDRESS`
3. (선택) [toncenter.com](https://toncenter.com)에서 API 키 발급

### 4. Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인 및 배포
vercel --prod

# 환경변수 설정 (Vercel Dashboard → Settings → Environment Variables)
# .env.example 참고
```

### 5. Webhook 등록
배포 후 아래 URL 브라우저에서 접속:
```
https://your-domain.vercel.app/api/webhook/setup
```

### 6. cron-job.org 설정
1. [cron-job.org](https://cron-job.org) 가입
2. 새 크론잡 생성:
   - URL: `https://your-domain.vercel.app/api/cron/verify-donations`
   - 주기: `*/2 * * * *` (2분마다)
   - Headers: `x-cron-secret: your_cron_secret`

### 7. TON Connect Manifest
`frontend/public/tonconnect-manifest.json`에서 URL을 실제 도메인으로 변경

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/missions` | 미션 목록 |
| POST | `/api/missions` | 미션 생성 |
| GET | `/api/missions/:id` | 미션 상세 |
| PATCH | `/api/missions/:id` | 미션 수정/취소 |
| POST | `/api/donations` | 후원 등록 |
| GET | `/api/users/me` | 내 정보 |
| POST | `/api/webhook/telegram` | 텔레그램 webhook |
| GET | `/api/cron/verify-donations` | 후원 검증 (cron) |

## 미션 플로우

```
크리에이터 미션 생성
  → 링크 공유 (t.me/Bot?startapp=mission_ID)
    → 팬이 TON 송금
      → 후원 등록 (/api/donations POST)
        → cron이 2분마다 tx 검증
          → confirmed → mission.current_ton 업데이트
            → 목표 달성 시 추첨 → 당첨자 DM
```
