# คู่มือการสร้างเว็บ Olipop (Parallax + Video Hero)

คู่มือนี้อธิบายโครงสร้าง โครงสร้างไฟล์ วิธีรัน และวิธีปรับแต่งเว็บ single-page แบรนด์เครื่องดื่มที่มี Hero แบบผูกกับ scroll (เลื่อนลง = วิดีโอเล่นไป เลื่อนขึ้น = ถอย)

---

## 1. สรุปโปรเจกต์

- **ประเภท:** หน้าเดียว (single-page) แบบ parallax
- **Hero:** วิดีโอ MP4 ตามจำนวนสินค้าใน config แสดงในกล่องอัตราส่วน 9:16 ตรงกลาง พื้นหลังดำ
- **การเลื่อน:** ระยะ scroll ต่อสินค้า = 4000px (ต่อเนื่องไม่มีปุ่ม PREV/NEXT)
- **ฟีเจอร์:** Loading จนวิดีโอพร้อม, เมนูมือถือ (แฮมเบอร์เกอร์), Responsive, Nav sticky, FAQ accordion
- **ขึ้นงานง่าย:** ลูกค้ามีหลายสินค้า — **เพิ่ม/ลดสินค้าได้โดยแก้แค่ `config.js` และใส่ไฟล์วิดีโอในโฟลเดอร์ `video/`** ไม่ต้องแก้ HTML หรือ app.js

---

## 2. โครงสร้างโฟลเดอร์และไฟล์

```
uxui/
├── index.html          # หน้าเดียว: loading, nav, hero, sections, footer
├── css/
│   └── styles.css      # ตัวแปร, reset, nav, hero, sections, responsive
├── js/
│   ├── config.js       # ข้อมูลแบรนด์ + รายการ variants (ชื่อ, วิดีโอ, คำอธิบาย)
│   └── app.js          # Logic: โหลดวิดีโอ, ผูก scroll กับเวลาวิดีโอ, เมนู, nav
├── video/              # ไฟล์วิดีโอ MP4 (ต้องมี)
│   ├── Cheery.mp4      # รส Cherry (หรือ Cherry.mp4 แล้วแต่ชื่อไฟล์)
│   └── Mango.mp4       # รส Mango
├── assets/             # รูปประกอบ (เช่น CTA)
│   └── cta-product.webp
├── package.json        # สคริปต์ start/serve
└── BUILD-GUIDE.md      # คู่มือนี้
```

---

## 3. เทคโนโลยีที่ใช้

- **HTML5:** โครงหน้า, `<video>` (muted, playsinline, preload, loop)
- **CSS3:** Variables, Grid, Flexbox, clamp(), media queries, transition, transform (GPU)
- **JavaScript (Vanilla):** ไม่ใช้ framework; ใช้ CONFIG จาก config.js, requestAnimationFrame สำหรับอัปเดตตำแหน่งวิดีโอจาก scroll

---

## 4. วิธีรันโปรเจกต์

ต้องรันผ่าน **HTTP server** เพื่อให้โหลดวิดีโอและ assets ได้ (เปิดไฟล์ตรงๆ อาจโดน CORS / นโยบาย autoplay)

```bash
cd d:\uxui
npm start
# หรือ
npx serve . -p 3000
```

จากนั้นเปิดเบราว์เซอร์ที่ `http://localhost:3000`

---

## 5. การตั้งค่า (config.js)

ไฟล์ `js/config.js` เก็บข้อมูลหลักของไซต์และรายการรส (variants):

| ค่า | ความหมาย |
|-----|-----------|
| `companyName`, `companyDescription` | ใช้สำหรับข้อความหรือ meta (ถ้ามี) |
| `themeColor` | สีหลัก (nav active, ปุ่ม ฯลฯ) |
| `variants` | อาร์เรย์ของแต่ละรส |

**แต่ละ variant มี:**

- `index` — เลขรส (1, 2, …) แสดงเป็น 01, 02
- `name` — ชื่อรส (แสดงเป็นตัวใหญ่ใน Hero)
- `subtitle` — คำบรรยายสั้น (เช่น "Soda")
- `description` — คำอธิบายยาวใน Hero
- `themeColor` — (ถ้าต้องการต่างกันต่อรส)
- `videoSrc` — path ไปยังไฟล์ MP4 ในโฟลเดอร์ `video/` (เช่น `'video/Cheery.mp4'`)

**ตัวอย่างการเพิ่มสินค้าใหม่ (ขึ้นงานง่าย):**

1. ใส่ไฟล์วิดีโอในโฟลเดอร์ `video/` (เช่น `Lemon.mp4`)
2. ใน `config.js` เพิ่ม object ใน `variants`:

```js
{
  index: 3,
  name: 'Lemon',
  subtitle: 'Soda',
  description: 'คำอธิบายรสเลมอน...',
  themeColor: '#ffffff',
  videoSrc: 'video/Lemon.mp4',
}
```

เท่านี้ครบ — **ไม่ต้องแก้ index.html หรือ app.js** วิดีโอจะถูกสร้างและโหลดจาก config อัตโนมัติ

---

## 6. โครงสร้าง HTML หลัก

- **Loading overlay:** แสดงจนวิดีโอ variant แรกโหลดพอเล่นได้ (canplay) แล้วค่อยซ่อน
- **Nav:** ปุ่มแฮมเบอร์เกอร์ (แสดงบนมือถือ) + ลิงก์ไปส่วนต่างๆ + ปุ่ม theme
- **Hero:**
  - `.hero-viewport` — พื้นที่ sticky 100vh
  - `.hero-bg-wrap` — กล่อง 9:16 ตรงกลาง ภายในมี `<video>` หนึ่งตัวต่อหนึ่ง variant
  - `.hero-overlay` — ชั้นทับเพื่อให้ข้อความอ่านง่าย
  - `.hero-inner` — Grid: ซ้าย (ชื่อรส, ปุ่ม), กลาง (ว่าง), ขวา (เลข variant 01/02)
  - `.hero-social` — ลิงก์โซเชียล
- **hero-scroll-spacer:** div ที่มีความสูง `--hero-scroll-range` (เช่น 8000px) ทำให้เลื่อนได้ยาวและ Hero ดู “sticky” ขณะเลื่อน
- **Sections:** Product, Ingredients, Nutrition, Reviews, FAQ, CTA, Footer — แต่ละส่วนมี `id` ตรงกับลิงก์ใน nav

---

## 7. โครงสร้าง CSS หลัก

- **Variables (`:root`):** `--theme-color`, `--bg`, `--text`, `--hero-scroll-range` ฯลฯ
- **Hero:**
  - `.hero-bg-wrap`: กว้าง `56.25vh` (อัตราส่วน 9:16), max-width 100vw, ใช้ `translate3d` เพื่อให้อยู่บน GPU layer
  - `.hero-video`: เต็มกล่อง, `object-fit: cover`, transition opacity สำหรับ crossfade ตอนสลับรส
- **Responsive:** breakpoints ที่ 900px, 768px, 600px, 480px — เมนู overlay, Hero เป็นคอลัมน์เดียว, ปุ่มและลิงก์ touch-friendly (min-height 44px)

---

## 8. Logic หลักใน JavaScript (app.js)

- **Refresh อยู่บนสุด:** `history.scrollRestoration = 'manual'` และ `window.scrollTo(0, 0)` ตอนโหลดและในเหตุการณ์ `load`
- **โหลดวิดีโอ:** ตั้ง `src` ให้แต่ละ `<video>` จาก `CONFIG.variants[i].videoSrc` แล้วรอ `canplay` ของทั้งสอง (หรือตามจำนวน variant) จากนั้นซ่อน loading
- **ผูก scroll กับวิดีโอ:**
  - `getVariantAndProgress(scrollY)` คำนวณจาก `scrollY` ว่าอยู่ variant ไหน (0, 1, …) และค่า `t` (0–1) ภายใน segment นั้น
  - ระยะ scroll ต่อ 1 รส = `SEGMENT_HEIGHT` (4000px)
  - แต่ละเฟรมใน `tick()`: อัปเดตข้อความ Hero ตาม variant, เลือกวิดีโอที่แสดง (class active/hidden), คำนวณเวลาเป้า `targetTime = t * duration`
  - ใช้ค่า **smooth (lerp)** และ **SEEK_THRESHOLD** เพื่อไม่ให้ seek บ่อยจนวิดีโอกระตุก: จะ set `video.currentTime` เฉพาะเมื่อค่า smooth ห่างจากตำแหน่งปัจจุบันเกินเกณฑ์ หรือเมื่อเพิ่งสลับรส
- **Nav:** อัปเดต link ที่ active ตาม section ที่อยู่ใน viewport
- **เมนูมือถือ:** เปิด/ปิด class `nav-open` บน nav, ปิดเมื่อกดลิงก์หรือกด Escape

---

## 9. ค่าที่ปรับได้ใน app.js (ลดกระตุก / ปรับความรู้สึก)

| ค่า | ค่าเริ่มต้น | ผลเมื่อปรับ |
|-----|-------------|-------------|
| `SEEK_THRESHOLD` | 0.18 (วินาที) | ยิ่งมาก = seek น้อยลง ลดกระตุก แต่ภาพอาจกระโดดเป็นช่วง |
| `LERP_SPEED` | 0.12 | ยิ่งน้อย = นุ่มขึ้น แต่ภาพติด scroll ช้าลง |
| `SEGMENT_HEIGHT` | 4000 (px) | ระยะ scroll ต่อ 1 รส; ยิ่งมาก = เลื่อนนานกว่าจะเปลี่ยนรส |

---

## 10. หมายเหตุสำคัญ

- **วิดีโอต้อง muted** เพื่อให้ autoplay ผ่านนโยบายของเบราว์เซอร์ได้
- **ต้องใช้ HTTP server** (เช่น `npx serve .`) เพื่อโหลดวิดีโอจากโฟลเดอร์ `video/`
- **ชื่อไฟล์วิดีโอ** ใน `config.js` ต้องตรงกับไฟล์ในโฟลเดอร์ `video/` (เช่น `Cheery.mp4` หรือ `Cherry.mp4`)
- ถ้าต้องการให้ seek ลื่นขึ้น อาจ encode วิดีโอใหม่โดยใส่ keyframe บ่อยขึ้น (เช่น ทุก 1 วินาที)

---

## 11. สรุปการแก้ไขเนื้อหา / รส

| สิ่งที่ต้องการเปลี่ยน | ไฟล์ที่แก้ |
|------------------------|------------|
| ชื่อแบรนด์, คำอธิบาย, รส, path วิดีโอ | `js/config.js` |
| โครงหน้า, ข้อความใน section, รูป CTA | `index.html` |
| สี, ระยะ, ตัวอักษร, responsive | `css/styles.css` |
| พฤติกรรม scroll/วิดีโอ, เมนู, loading | `js/app.js` |

ถ้าเพิ่มหรือลดจำนวนรส (variants) แก้แค่ `config.js` (เพิ่ม/ลบ object ใน `variants`) และใส่/ลบไฟล์วิดีโอในโฟลเดอร์ `video/` — วิดีโอและ scroll range จะอัปเดตอัตโนมัติ

---

*คู่มือนี้เขียนสำหรับโปรเจกต์ Olipop parallax (Hero วิดีโอผูก scroll). แก้ไขล่าสุดตามโครงสร้างปัจจุบันของโปรเจกต์.*
