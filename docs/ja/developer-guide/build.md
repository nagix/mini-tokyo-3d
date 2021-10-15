# Mini Tokyo 3D のビルド

リリース前の最新版の機能を試したい、自分でコードを改造したい、Mini Tokyo 3D の開発にコントリビュートしたい、という場合には、本セクションの手順に従ってソースコードからプロジェクトをビルドすることができます。

## ビルド準備

次のソフトウェアが必要です。

- [Node.js](https://nodejs.org/ja/) 最新版
- [Git](https://git-scm.com) 最新版（リポジトリをクローンする場合）

Mini Tokyo 3D は次のデータソースを使用しており、ビルド時および実行時にそれぞれのデータソースに対するアクセストークンが必要です。下記の手順に従って、アクセストークンを入手してください。

データソース | サインアップ用 URL | アクセストークンの形式
:-- | :-- | :--
[東京公共交通オープンデータチャレンジ](https://tokyochallenge.odpt.org) | [リンク](https://developer-tokyochallenge.odpt.org/users/sign_up) | 数字と英小文字からなる文字列
[公共交通オープンデータセンター](https://www.odpt.org) | [リンク](https://developer.odpt.org/users/sign_up) | 数字と英小文字からなる文字列
[Mapbox](https://www.mapbox.com) | [リンク](https://account.mapbox.com/auth/signup/) | `pk.` で始まるピリオドを含む英数字文字列

### 東京公共交通オープンデータチャレンジアクセストークンの入手

Mini Tokyo 3D は[東京公共交通オープンデータチャレンジ](https://tokyochallenge.odpt.org)で配信されている列車データや旅客機データを利用しています。データの入手には開発者としての登録が必要ですが、無料で利用可能です。

1. [開発者サイトへの登録](https://developer-tokyochallenge.odpt.org/users/sign_up)ページでユーザー情報を入力して、開発者登録をします。登録完了のメールが届くまでに数日かかる場合があります。
2. 開発者アカウントでログイン後、画面上部のメニューから「Account」をクリックして「アクセストークンの確認・追加」を選びます。
3. アクセストークン一覧が表示されます。アカウント作成直後はデフォルトの「DefaultApplication」のみが表示されます。「アクセストークンの追加発行」をクリックします。
4. 「名前」に任意のアプリケーション名を入力して、「Submit」ボタンをクリックします。
5. アクセストークン一覧に新たに作成されたトークンが表示されます。

### 公共交通オープンデータセンターアクセストークンの入手

Mini Tokyo 3D は[公共交通オープンデータセンター](https://www.odpt.org)のデータも併せて利用しています。こちらも、データの入手には開発者としての登録が必要ですが、無料で利用可能です。

1. [開発者サイトへの登録](https://developer.odpt.org/users/sign_up)ページでユーザー情報を入力して、開発者登録をします。登録完了のメールが届くまでに数日かかる場合があります。
2. 開発者アカウントでログイン後、画面上部のメニューから「Account」をクリックして「アクセストークンの確認・追加」を選びます。
3. アクセストークン一覧が表示されます。アカウント作成直後はデフォルトの「DefaultApplication」のみが表示されます。「アクセストークンの追加発行」をクリックします。
4. 「名前」に任意のアプリケーション名を入力して、「Submit」ボタンをクリックします。
5. アクセストークン一覧に新たに作成されたトークンが表示されます。

### Mapbox アクセストークンの入手

[Mapbox アクセストークンの入手](./integration.md#mapbox-%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3%E3%81%AE%E5%85%A5%E6%89%8B) を参照してください。

## ビルド手順

### 1. ファイルのダウンロード

Mini Tokyo 3D の [GitHub レポジトリ](https://github.com/nagix/mini-tokyo-3d)から `master` ブランチ最新版をダウンロードして、zipファイルを展開します。`mini-tokyo-3d-master` というディレクトリができますが、`mini-tokyo-3d` という名前に変更しておきます。

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

もし Git をお使いでしたら、上記のコマンドの代わりに GitHub からリポジトリを直接クローンしても構いません。

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

### 2. ビルド

Mini Tokyo 3D のトップディレクトリに移動します。

```bash
cd mini-tokyo-3d
```

ビルド準備のステップで取得した東京公共交通オープンデータチャレンジ、および公共交通オープンデータセンターのアクセストークンを記載した JSON ファイルを作成し、`secrets` というファイル名でこのディレクトリに保存します。

```json
{
    "tokyochallenge": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "odpt": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

依存 npm モジュールをインストールします。

```bash
npm install
```

次のコマンドでプロジェクトをビルドします。

```bash
npm run build-all
```

ビルドが正常に完了すると、`dist` ディレクトリが作成されます。この中には配布用のスタイルシートおよび JavaScript ファイルが含まれています。また、同時に `build` ディレクトリも作成されます。この中には Web サイトへの設置に必要なすべてのファイルが含まれています。

### 3. Web サイトへの設置

`build` ディレクトリに含まれる `index.html` は [https://minitokyo3d.com](http://minitokyo3d.com) 用の Web ページです。`Map` コンストラクタに渡される `accessToken` プロパティを、ビルド準備のステップで取得した Mapbox アクセストークンで置き換えます。そして設置する Web サイトに合わせて編集した上で、`build` ディレクトリのファイル全てを Web サーバの公開ディレクトリに配置してください。
