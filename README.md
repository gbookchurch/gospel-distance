# 福音距離

基督教版的人生模擬遊戲。依真實的出生數和人口比例，隨機出生在 53 個國家其中一國的某個族群，一年一年走完一生，看你幾歲第一次聽見耶穌的名字，以及信主之後會經歷什麼。

靈感來自 [80億分之1](https://1in8b.life/zh/)。

## 功能

- 依各國年出生數抽出生地，再依人口比例抽族群
- 每一年依族群信徒比例、母語聖經、迫害程度計算聽見福音的機率
- 聽見福音時可以選擇回應、想再看看或不接受
- 信主後依 Open Doors 迫害六大面向觸發人生事件
- 5、15、30、50、70 歲停下來反思，可以留一行字
- 同一秒出生的另外四個人在結局揭曉
- 追思館：記錄玩過的每一生（只存在玩家自己的瀏覽器）
- 分享卡：結局自動產生 1080×1350 圖卡

## 檔案結構

```
index.html          可以直接上線的完整網頁（由 build.py 產生）
build.py            把 src/ 和 data/ 組合成 index.html
data/countries.json 53 國資料表
src/template.html   網頁版面與遊戲流程
src/gospel.js       聽見福音的機率模型
src/events.js       抉擇點與信主後的人生事件
```

`index.html` 是單一檔案，資料和程式都已經內嵌，不需要任何伺服器或套件。

## 放上 GitHub Pages

1. 在 GitHub 建立新的 repository，把這個資料夾裡的檔案全部上傳
2. 進入 repository 的 **Settings → Pages**
3. Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 Save
4. 等一兩分鐘，網址會是 `https://你的帳號.github.io/repository名稱/`

## 修改後重新產生網頁

改了 `src/` 或 `data/` 裡的檔案之後，在這個資料夾執行：

```
python3 build.py
```

會重新產生 `index.html`，再上傳即可。

## 資料來源

| 資料 | 來源 |
|---|---|
| 族群、基督徒與福音派比例、母語聖經狀態 | [Joshua Project](https://joshuaproject.net/resources/datasets)（2026 年 10 月下載） |
| 宗教組成 | Pew Research Center，Global Religious Composition 2010–2020（2020 年估計） |
| 年出生數 | 聯合國 World Population Prospects 2024（2026 年推估）；台灣用內政部 2025 年實際數字，南韓用韓國統計處 2025 年實際數字 |
| 平均壽命 | 聯合國經社部 2023 年估計 |
| 迫害分數 | [Open Doors World Watch List 2026](https://opendoorsanalytical.org/)，含 50 名以後的觀察名單 |

## 使用前請注意

- **「每年聽見福音的機率」是設計假設，不是統計資料。** 資料能告訴我們身邊有多少信徒，但信徒比例怎麼換算成一年內遇到的機率，沒有資料能直接回答。相關參數集中在 `src/gospel.js` 開頭的 `TUNING`。
- **南亞福音派比例不可靠。** Joshua Project 在印度、巴基斯坦、孟加拉的多數族群不公開福音派比例，模擬時改用基督徒比例推估。
- **Pew 和 Joshua Project 對基督徒比例的估計可能差很多**，尤其是有地下教會的國家（例如中國、伊朗）。抽父母宗教用 Pew，計算身邊信徒用 Joshua Project。
- **族群名稱**由英文翻譯，非洲與印尼的小族群多為音譯。
- **壽命**為依平均壽命加上隨機變化的簡化估計，不是逐年生命表。
- **授權**：Joshua Project 註明商業性重新發布需取得同意，Pew 資料有自己的使用條款。非商業的教會與教育用途一般沒有問題，但正式推廣前建議寫信告知 Joshua Project。
