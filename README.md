# DIY木材カットプランナー

- [https://nagatani.github.io/smart-wood-planner/](https://nagatani.github.io/smart-wood-planner/)

## 概要
DIYや木工作業で、定尺の木材から指定した寸法のパーツを切り出す際に、必要な材料の本数と最適なカットプランを計算するアプリケーションです。

材料の無駄をできるだけ少なくするための計算を行い、材料費と加工費の概算も行います。

## ✨ 主な機能

* 材料定尺、単価、カット単価、鋸刃幅のカスタム設定
* 部材リスト入力（カンマ/改行区切り）
* 最適化アルゴリズムによる必要材料本数とカットプランの計算
* カットプランのグラフィカル表示（バーグラフ）と端材長の確認
* 材料費、加工費、合計金額の自動計算
* クエリパラメータによる入力値の事前設定 (`?ml=...&p=...`)
* 計算結果を共有するためのURL生成とコピー機能

## 🧠 アルゴリズム

このアプリケーションでは、木材の使用本数を最小化するためのカットプラン計算（一次元ビンパッキング問題の近似解法）にFirst Fit Decreasing (FFD)アルゴリズムを採用しています。

## 📂 コード構成

このアプリケーションのJavaScriptコードは、役割ごとに以下のファイルに分割されています
(`scripts/` ディレクトリ内):

* **`main.js`**:
    * アプリケーションのエントリーポイント。
    * DOM読み込み後の初期化、イベントハンドリング（フォーム送信、コピーボタンクリック）を担当。
    * 入力値を取得し、`logic.js` の計算関数を呼び出し、結果を `ui.js` に渡してUI更新を指示するコントローラー的な役割。
    * URLクエリパラメータの解析と適用、共有URLの生成。
* **`logic.js`**:
    * 計算ロジックの中核。DOM操作は行いません。
        * `calculateOptimalCut()`: 入力検証、コスト計算、`binPackingFFD`の呼び出し等、計算全体を統括。
        * `binPackingFFD()`: First Fit Decreasing アルゴリズムの実装。
* **`ui.js`**:
    * UI操作と描画を担当。DOM要素の取得、表示/非表示の切り替え、計算結果（テキスト概要、カット内訳リスト、グラフィカルバー）のHTMLへの反映を行います。
* **`utils.js`**:
    * 特定の機能に依存しない汎用的な補助関数を提供。
        * `isColorLight()`: 色の明度判定。
        * `parsePartsList()`: 部材リスト文字列の解析。
        * `formatCurrency()`: 通貨フォーマット。
* **`config.js`**:
    * アプリケーション全体で使用する設定値や定数（バーの色定義など）を管理。
