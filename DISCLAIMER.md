# 版權聲明 / Copyright Disclaimer

## English

### About this project

This is a **non-official, fan-made** tool to help Pokémon MEZASTAR collectors check whether a
proposed tag trade is fair. It is non-commercial and educational.

### Not affiliated with

This project is **NOT** affiliated with, endorsed by, sponsored by, or officially connected to:
The Pokémon Company, Nintendo Co., Ltd., Creatures Inc., GAME FREAK inc.,
TAKARA TOMY A.R.T.S CO., LTD. (T-ARTS), Marvelous Inc. (MARV), or SEGA Corporation.

### Intellectual property

The following are the property of their respective owners; this project's use is intended as
non-commercial, factual reference:

- **Pokémon™** and all Pokémon names, designs, and likenesses
- **MEZASTAR™** trademark and arcade machine name
- Tag numbering systems and game-mechanic terms (Grade levels, etc.)

Official copyright statement:

> ©Pokémon. ©Nintendo / Creatures Inc. / GAME FREAK inc.
> Developed by T-ARTS and MARV. Operated in Taiwan by SEGA.
> TM, ®, and character names are trademarks of Nintendo.

### Image handling

This tool displays official tag images **only in a private, invite-gated context** (login
required; access by invitation/approval, not open public signup). Images are served from a
storage bucket and are **not** committed to the source repository, so they can be removed
immediately if needed. This posture assumes the tool remains private and non-commercial; if it
ever becomes publicly accessible or monetized, the image approach will be re-evaluated. See
`docs/adr/0003-image-sourcing-and-gating.md`.

### Trade-fairness scoring

The point values are a **subjective, non-market collectability model** intended only to help
make trades roughly fair for collectors and kids. They are **not** appraisals, investment
advice, or purchasing advice.

### Your data & privacy

To use the collection features you sign in with your email via a one-time magic link
(no password). Your collection data — which tags you mark as owned, wanted, or most-wanted, and
the quantities — is stored in this project's **Supabase** database, tied to your
email-authenticated account. Row-Level Security ensures **each row is visible only to the
account that created it**; other signed-in users cannot read, change, or delete your
collection. We do not store any tag images on the server tied to your account, and the market
price figures shown are **reference-only** estimates, not data we collect from you. If you sign
out, the local session is cleared from your browser. You can ask the maintainer (via a GitHub
Issue) to delete your account data.

### Takedown requests

If any content here constitutes copyright or trademark infringement, the rights holder may
contact the maintainer via a GitHub Issue. The maintainer commits to **promptly removing**
the relevant content upon a reasonable request.

### Code license

The **code** (HTML, CSS, JavaScript, TypeScript) is licensed under the **MIT License** (see
[`LICENSE`](./LICENSE)). This does not cover any Pokémon names, designs, trademarks, or imagery.

---

## 中文

### 關於本專案

本專案是一個**非官方、由玩家社群製作的**工具，目的是協助 Pokémon MEZASTAR 收藏者判斷一筆「卡匣」（tag）交換是否公平。本工具為非商業、教育性質。

### 本專案與下列公司**沒有任何關聯**

The Pokémon Company／任天堂／Creatures Inc.／GAME FREAK inc.／株式会社タカラトミーアーツ（T-ARTS）／株式会社マーベラス（MARV）／世雅育樂（SEGA Taiwan）。本專案**未經**上述公司認可、贊助或授權。

### 智慧財產權

以下內容屬於各自版權與商標所有人，本專案僅作非商業性質的事實引用：

- **Pokémon™** 及所有寶可夢名稱、設計、形象
- **MEZASTAR™** 商標與機台名稱
- 卡匣編號系統與遊戲機制名稱（星等／Grade 等）

> ©Pokémon. ©Nintendo / Creatures Inc. / GAME FREAK inc.
> Developed by T-ARTS and MARV. Operated in Taiwan by SEGA.
> TM, ®, and character names are trademarks of Nintendo.

### 圖像處理方式

本工具僅在**私人、需邀請登入**的環境下顯示官方卡匣圖像（需登入；採邀請／核准制，非公開註冊）。圖像由儲存空間（bucket）提供，**不**存入程式碼倉庫，必要時可立即移除。此做法以本工具維持私人、非商業性質為前提；若日後公開或商業化，將重新評估圖像處理方式。

### 交換公平性評分

點數為**主觀、非市場導向的收藏性模型**，僅用於協助收藏者與孩童進行大致公平的交換，**不**構成估價、投資或購買建議。

### 你的資料與隱私

使用收藏功能時，你會以電子郵件透過一次性魔法連結（magic link）登入（不需密碼）。你的收藏資料——你標記為已擁有、想要或最想要的標籤，以及數量——會儲存在本專案的 **Supabase** 資料庫中，並與你以電子郵件驗證的帳號綁定。資料列層級安全性（Row-Level Security）確保**每一筆資料只有建立它的帳號才能看見**；其他已登入的使用者無法讀取、修改或刪除你的收藏。我們不會在伺服器上儲存與你帳號綁定的任何標籤圖像，畫面上顯示的市場價格僅為**參考用**估計值，並非向你蒐集的資料。登出後，本機的登入工作階段會從你的瀏覽器清除。你可透過 GitHub Issue 聯繫維護者，要求刪除你的帳號資料。

### 移除請求

若本專案任何內容構成版權或商標侵權，版權所有人可透過 GitHub Issue 聯繫維護者，維護者承諾收到合理請求後**儘速移除**相關內容。

### 程式碼授權

本工具的**程式碼**採用 **MIT 授權**（見 [`LICENSE`](./LICENSE)），不涵蓋任何寶可夢名稱、設計、商標或圖像。
