# Line Bot Receipt Reader

このプロジェクトは、LINE上で受け取ったレシートの画像を解析し、抽出したデータをGoogleスプレッドシートに記録するLINE Botアプリケーションです。

## 機能

- LINE経由で受け取ったレシート画像のテキストを読み取ります。
- OCRを用いてレシートからテキストデータを抽出し、特定のフォーマットに変換します。
- 抽出したデータをGoogleスプレッドシートに記録します。
- ユーザーに対して処理結果をLINE経由で返信します。

## 技術スタック

- Node.js
- Express.js
- LINE Messaging API
- Google Sheets API
- Azure Computer Vision API
- OpenAI GPT-3

## ローカルでのセットアップ

1. リポジトリをクローンします。

```
git clone git@github.com:yU-kiki/ocr-with-vision.git
```

2. 依存関係をインストールします。

```
npm install
```

3. `.env`ファイルをプロジェクトのルートに作成し、必要な環境変数を設定します。

```
COMPUTER_VISION_KEY=your_computer_vision_key
COMPUTER_VISION_ENDPOINT=your_computer_vision_endpoint

OPENAI_API_KEY=your_openai_api_key

LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials.json
SPREADSHEET_ID=your_spreadsheet_id
```

4. アプリケーションを起動します。

```
npm start
```

## Herokuへのデプロイ

Herokuへのアップデートは以下のステップで行います。

1. Heroku CLIがインストールされていることを確認します。インストールしていない場合は、[公式ドキュメント](https://devcenter.heroku.com/articles/heroku-cli)を参照してインストールしてください。

2. Herokuにログインします。

```
heroku login
```

3. 新しいHerokuアプリケーションを作成します。

```
heroku create your-app-name
```

4. Herokuに環境変数を設定します。

```
heroku config:set COMPUTER_VISION_KEY=your_computer_vision_key
heroku config:set COMPUTER_VISION_ENDPOINT=your_computer_vision_endpoint
...
```

5. Herokuにアプリケーションをデプロイします。

```
git push heroku main
```

6. アプリケーションが起動していることを確認します。

```
heroku open
```

または、Heroku Dashboardを使用してアプリケーションを設定および管理できます。

## 注意事項

- LINE Bot、Google Sheets、Azure Computer Vision、OpenAIの各APIキーは安全に管理してください。
- 本番環境へのデプロイ前に、セキュリティのベストプラクティスに従ってコードを確認してください。
