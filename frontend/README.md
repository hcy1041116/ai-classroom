# 🏫 SELf-corner 虛擬教室前端專案

歡迎來到我們的虛擬教室 (Virtual Classroom) 專案！本專案的前端主要是透過 [Lovable AI](https://lovable.dev/) 輔助開發，並結合 n8n 等自動化技術來打造的全新平台。

為了維持專案架構的穩定與 AI 協作的順暢，**目前由特定負責人統一操作 Lovable 進行主體架構的生成與版本同步**。其他團隊成員請透過標準的 Git 流程，直接在地端進行開發、測試與 Code Review。

## 💻 專案使用的技術棧

本專案的前端主要建構於以下技術：
- **Vite** (極速的前端建置工具)
- **TypeScript** (提供強型別的 JavaScript，減少 Bug)
- **React** (前端 UI 框架)
- **shadcn-ui** (高品質的客製化 UI 元件庫)
- **Tailwind CSS** (Utility-first CSS 樣式框架)

---

## 🛠️ 如何參與開發與測試？

請將專案下載到你的電腦上進行本機端的作業。
**(前置作業：請確保你的電腦已安裝 Node.js 與 npm)**

**開發環境建置步驟：**
```bash
# 步驟 1：Clone 這個專案到你的電腦 (僅第一次需要)
git clone -b frontend_jia https://github.com/AIPE02-team04/ai-classroom.git

# 步驟 2：進入專案資料夾
cd SELf-corner

# 步驟 3：安裝所有依賴套件 (很重要！)
npm install

# 步驟 4：啟動本地端開發伺服器
npm run dev