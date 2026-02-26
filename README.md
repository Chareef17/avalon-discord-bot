# Avalon Discord Bot (JavaScript)

บอท Discord สำหรับเล่นเกมบอร์ด The Resistance: Avalon ในห้อง Discord ของคุณ (เขียนด้วย JavaScript / Node.js)

## การเตรียมตัว

1. ติดตั้ง Node.js เวอร์ชัน LTS จากเว็บไซต์ทางการ
2. ในโฟลเดอร์โปรเจกต์นี้ รันคำสั่ง:

```bash
npm install
```

3. ไปที่หน้า Developer Portal ของ Discord เพื่อสร้างแอป / บอท:
   - สร้าง Application ใหม่
   - สร้าง Bot และคัดลอก **Token**
   - เปิด Privileged Gateway Intents: PRESENCE INTENT, SERVER MEMBERS INTENT, MESSAGE CONTENT INTENT

4. สร้างไฟล์ `.env` ในโฟลเดอร์นี้ แล้วใส่:

```bash
DISCORD_TOKEN=ใส่โทเคนของบอทที่นี่
```

## การรันบอท

```bash
npm start
```

## คำสั่งเบื้องต้น

- `/avalon setup` – สร้างห้อง/เซสชันเกม Avalon ในช่องนี้
- `/avalon join` – เข้าร่วมเกม
- `/avalon start` – เริ่มเกม (สุ่มบทบาท, แจ้งบทบาทผ่าน DM)
- `/avalon status` – ดูสถานะเกม, หัวหน้าทีม, แถบภารกิจ
- `/avalon propose_team` – หัวหน้าทีมเลือกสมาชิกทีมสำหรับภารกิจปัจจุบัน
- `/avalon vote_team` – ผู้เล่นทุกคนโหวตเห็นด้วย/ไม่เห็นด้วยกับทีม
- `/avalon mission_vote` – สมาชิกทีมโหวตลับว่า ภารกิจสำเร็จ/ล้มเหลว
- `/avalon assassin_guess` – หลังฝ่ายดีชนะ 3 ภารกิจ ให้ Assassin เดาว่าใครคือ Merlin
- `/avalon cancel` – ยกเลิกเกม (เจ้าห้องเท่านั้น)

> โปรเจกต์นี้เป็นโครงพื้นฐาน สามารถต่อยอดกติกา/ฟีเจอร์เพิ่มเติมได้ เช่น โหวต, ภารกิจ, การแสดงผลสรุปผล, ฯลฯ
> เวอร์ชันปัจจุบันรองรับการเล่น Avalon ครบเกมตามกติกาหลักแล้ว (รวม Merlin, Assassin, Percival, Morgana, Mordred, Oberon ตามจำนวนผู้เล่น)

