/* 52:48 — 매일 리마인더 발송 스크립트 (GitHub Actions에서 실행)
 * 환경변수 FIREBASE_SERVICE_ACCOUNT 에 Firebase 서비스계정 JSON(문자열)이 들어 있어야 함.
 * Firestore의 모든 커플 토큰을 읽어, 각 커플의 미완료 할 일 개수로 알림을 보낸다.
 */
const admin = require('firebase-admin');

const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

async function main() {
  // collectionGroup으로 모든 커플의 토큰을 한 번에 수집
  const tokSnap = await db.collectionGroup('tokens').get();
  if (tokSnap.empty) { console.log('등록된 토큰 없음'); return; }

  // 커플별로 토큰 묶기
  const byCouple = {};
  tokSnap.forEach((doc) => {
    const coupleId = doc.ref.parent.parent.id;
    const token = doc.get('token') || doc.id;
    (byCouple[coupleId] = byCouple[coupleId] || []).push({ token, ref: doc.ref });
  });

  for (const [coupleId, entries] of Object.entries(byCouple)) {
    // 미완료 할 일 개수
    const todoSnap = await db.collection('couples').doc(coupleId).collection('todos').get();
    const pending = todoSnap.docs.filter((t) => !t.get('done')).length;
    const title = '52:48 💗';
    const body = pending > 0 ? `오늘 할 일 ${pending}개가 기다리고 있어!` : '오늘도 함께 힘내자 💪';

    const tokens = entries.map((e) => e.token);
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      data: { title, body, url: 'https://arkss.github.io/todo/' },
    });
    console.log(`[${coupleId}] 발송 ${res.successCount}/${tokens.length}`);

    // 만료/무효 토큰 정리
    const dels = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
          dels.push(entries[i].ref.delete());
        }
      }
    });
    if (dels.length) { await Promise.all(dels); console.log(`  무효 토큰 ${dels.length}개 삭제`); }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
